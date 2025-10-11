'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, RefreshCw, Clock, User, Paperclip, Inbox, Star, AlertCircle, Filter, ExternalLink } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Email {
  id: string
  subject: string
  from: {
    name: string
    address: string
  }
  receivedDateTime: string
  bodyPreview: string
  isRead: boolean
  hasAttachments: boolean
  importance?: 'low' | 'normal' | 'high'
  isStarred?: boolean
  provider: 'gmail' | 'outlook'
  webLink?: string
}

interface EmailStats {
  total: number
  unread: number
  important: number
  starred: number
  withAttachments: number
}

type ProviderFilter = 'all' | 'gmail' | 'outlook'
type StatusFilter = 'all' | 'unread' | 'starred' | 'important' | 'attachments'

export default function UnifiedMailDashboard() {
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  
  const [gmailHistoryId, setGmailHistoryId] = useState<string | null>(null)
  const [outlookDeltaLink, setOutlookDeltaLink] = useState<string | null>(null)
  
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    unread: 0,
    important: 0,
    starred: 0,
    withAttachments: 0,
  })

  // Calculate stats from emails
  const calculateStats = useCallback((emailList: Email[]) => {
    return {
      total: emailList.length,
      unread: emailList.filter(e => !e.isRead).length,
      important: emailList.filter(e => e.importance === 'high').length,
      starred: emailList.filter(e => e.isStarred).length,
      withAttachments: emailList.filter(e => e.hasAttachments).length,
    }
  }, [])

  // Fetch Gmail emails
  const fetchGmail = async (useHistory = false) => {
    try {
      const url = useHistory && gmailHistoryId
        ? `/api/gmail/emails/sync?historyId=${gmailHistoryId}`
        : '/api/gmail/emails'
      
      const response = await fetch(url, { cache: "no-store" })
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Gmail not connected')
          return { emails: [], historyId: null }
        }
        throw new Error('Failed to fetch Gmail')
      }

      const data = await response.json()
      
      // When using history sync, merge with existing emails
      if (useHistory && gmailHistoryId) {
        return {
          emails: data.emails || [],
          deleted: data.deleted || [],
          historyId: data.historyId,
        }
      }
      
      return {
        emails: (data.emails || []).map((email: any) => ({
          ...email,
          provider: 'gmail' as const,
        })),
        historyId: data.historyId,
      }
    } catch (err) {
      console.error('Gmail fetch error:', err)
      return { emails: [], historyId: null }
    }
  }

  // Fetch Outlook emails
  const fetchOutlook = async (useDelta = false) => {
    try {
      const url = useDelta && outlookDeltaLink
        ? `/api/outlook/emails/delta?deltaLink=${encodeURIComponent(outlookDeltaLink)}`
        : '/api/outlook/emails/delta'
      
      const response = await fetch(url, { cache: "no-store" })
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Outlook not connected')
          return { emails: [], deltaLink: null }
        }
        throw new Error('Failed to fetch Outlook')
      }

      const data = await response.json()
      return {
        emails: (data.emails || []).map((email: any) => ({
          id: email.id,
          subject: email.subject,
          from: {
            name: email.from.emailAddress.name,
            address: email.from.emailAddress.address,
          },
          receivedDateTime: email.receivedDateTime,
          bodyPreview: email.bodyPreview,
          isRead: email.isRead,
          hasAttachments: email.hasAttachments,
          importance: email.importance,
          provider: 'outlook' as const,
          webLink: email.webLink,
        })),
        deltaLink: data.deltaLink,
      }
    } catch (err) {
      console.error('Outlook fetch error:', err)
      return { emails: [], deltaLink: null }
    }
  }

  // Fetch all emails
  const fetchAllEmails = async (useCache = false) => {
    try {
      setSyncing(true)
      setError(null)

      const [gmailData, outlookData] = await Promise.all([
        fetchGmail(useCache),
        fetchOutlook(useCache),
      ])

      // Update history/delta IDs
      if (gmailData.historyId) setGmailHistoryId(gmailData.historyId)
      if (outlookData.deltaLink) setOutlookDeltaLink(outlookData.deltaLink)

      if (useCache && (gmailHistoryId || outlookDeltaLink)) {
        // This is a delta/history update - merge with existing emails
        setEmails(prevEmails => {
          const emailMap = new Map(prevEmails.map(e => [e.id, e]))
          
          // Add/update Gmail emails
          gmailData.emails.forEach((email: any) => {
            emailMap.set(email.id, { ...email, provider: 'gmail' as const })
          })
          
          // Remove deleted Gmail emails
          if (gmailData.deleted) {
            gmailData.deleted.forEach((id: string) => {
              emailMap.delete(id)
            })
          }
          
          // Add/update Outlook emails
          outlookData.emails.forEach((email: any) => {
            emailMap.set(email.id, email)
          })
          
          // Convert back to array and sort
          const updatedEmails = Array.from(emailMap.values())
            .sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime())
          
          return updatedEmails
        })
      } else {
        // Initial load - replace all emails
        const allEmails = [...gmailData.emails, ...outlookData.emails]
          .sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime())
        setEmails(allEmails)
      }
      
      setLastSync(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  // Recalculate stats when emails change
  useEffect(() => {
    setStats(calculateStats(emails))
  }, [emails, calculateStats])

  // Initial fetch
  useEffect(() => {
    if (session) {
      fetchAllEmails()
    }
  }, [session])

  // Set up polling for updates (every 30 seconds)
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      fetchAllEmails(true)
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [session, gmailHistoryId, outlookDeltaLink])

  // Subscribe to Gmail push notifications
  useEffect(() => {
    if (!session) return

    const setupGmailWatch = async () => {
      try {
        const response = await fetch('/api/gmail/watch', { method: 'POST' })
        if (response.ok) {
          console.log('Gmail watch setup successfully')
        }
      } catch (err) {
        console.error('Gmail watch setup failed:', err)
      }
    }

    setupGmailWatch()
  }, [session])

  // Subscribe to Outlook webhooks
  useEffect(() => {
    if (!session) return

    const setupOutlookWebhook = async () => {
      try {
        const response = await fetch('/api/outlook/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create' }),
        })
        if (response.ok) {
          console.log('Outlook webhook setup successfully')
        }
      } catch (err) {
        console.error('Outlook webhook setup failed:', err)
      }
    }

    setupOutlookWebhook()
  }, [session])

  // Listen for push notifications via SSE
  useEffect(() => {
    if (!session) return

    const eventSource = new EventSource('/api/mail/events')

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'new-email') {
        console.log('New email notification:', data.provider)
        fetchAllEmails(true)
        
        toast({
          title: '📬 New Email',
          description: `You have new mail in ${data.provider === 'gmail' ? 'Gmail' : 'Outlook'}`,
        })
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [session, toast])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  // Filter emails
  const filteredEmails = emails.filter(email => {
    // Provider filter
    if (providerFilter !== 'all' && email.provider !== providerFilter) {
      return false
    }

    // Status filter
    if (statusFilter === 'unread' && email.isRead) return false
    if (statusFilter === 'starred' && !email.isStarred) return false
    if (statusFilter === 'important' && email.importance !== 'high') return false
    if (statusFilter === 'attachments' && !email.hasAttachments) return false

    return true
  })

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => fetchAllEmails()} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Unified Inbox
          </h1>
          {lastSync && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last synced: {lastSync.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {syncing && (
            <Badge variant="outline" className="animate-pulse">
              Syncing...
            </Badge>
          )}
          <Button
            onClick={() => fetchAllEmails(true)}
            disabled={syncing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Starred</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.starred}</div>
            <p className="text-xs text-muted-foreground">Favorites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Important</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.important}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attachments</CardTitle>
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withAttachments}</div>
            <p className="text-xs text-muted-foreground">With files</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={providerFilter} onValueChange={(v) => setProviderFilter(v as ProviderFilter)}>
            <TabsList>
              <TabsTrigger value="all">All ({emails.length})</TabsTrigger>
              <TabsTrigger value="gmail">
                Gmail ({emails.filter(e => e.provider === 'gmail').length})
              </TabsTrigger>
              <TabsTrigger value="outlook">
                Outlook ({emails.filter(e => e.provider === 'outlook').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2 mt-4">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('unread')}
            >
              <Mail className="h-4 w-4 mr-1" />
              Unread
            </Button>
            <Button
              variant={statusFilter === 'starred' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('starred')}
            >
              <Star className="h-4 w-4 mr-1" />
              Starred
            </Button>
            <Button
              variant={statusFilter === 'important' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('important')}
            >
              <AlertCircle className="h-4 w-4 mr-1" />
              Important
            </Button>
            <Button
              variant={statusFilter === 'attachments' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('attachments')}
            >
              <Paperclip className="h-4 w-4 mr-1" />
              Attachments
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Showing {filteredEmails.length} of {emails.length} emails from Gmail and Outlook
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No emails match your filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {filteredEmails.map((email) => (
                  <Card
                    key={`${email.provider}-${email.id}`}
                    className={cn(
                      'transition-all hover:shadow-md cursor-pointer',
                      !email.isRead && 'border-l-4 border-l-blue-500 bg-blue-50/50'
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(email.from.name || email.from.address)}&background=random`} />
                            <AvatarFallback>
                              {(email.from.name || email.from.address || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{email.from.name || email.from.address}</span>
                              <Badge variant="outline" className="text-xs">
                                {email.provider === 'gmail' ? '📧 Gmail' : '📨 Outlook'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {email.from.address}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!email.isRead && (
                            <Badge variant="default">New</Badge>
                          )}
                          {email.isStarred && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                          {email.importance === 'high' && (
                            <Badge variant="destructive">!</Badge>
                          )}
                          {email.hasAttachments && (
                            <Badge variant="outline">
                              <Paperclip className="h-3 w-3" />
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(email.receivedDateTime)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-medium mb-2">{email.subject || '(No subject)'}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {email.bodyPreview}
                      </p>
                      <div className="flex gap-2">
                        {email.provider === 'gmail' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${email.id}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View in Gmail
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(email.webLink || `https://outlook.office.com/mail/inbox/id/${email.id}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View in Outlook
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
