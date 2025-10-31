'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, RefreshCw, Clock, User, Paperclip, Inbox, Star, AlertCircle, Filter, ExternalLink, ArrowLeft, Archive, Trash2, Reply, ReplyAll, Forward } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

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

interface FullEmail extends Email {
  bodyText?: string
  bodyHtml?: string
  to?: string
  cc?: string
  bcc?: string
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
  const [selectedEmail, setSelectedEmail] = useState<FullEmail | null>(null)
  const [loadingEmail, setLoadingEmail] = useState(false)
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
  const fetchGmail = async (useHistory = false, forceRefresh = false) => {
    try {
      let url = useHistory && gmailHistoryId
        ? `/api/gmail/emails/sync?historyId=${gmailHistoryId}`
        : '/api/gmail/emails'
      
      // Add forceRefresh param to bypass cache
      if (forceRefresh && !useHistory) {
        url += '?forceRefresh=true'
      }
      
      const response = await fetch(url, { cache: "no-store" })
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Gmail not connected')
          return { emails: [], historyId: null }
        }
        throw new Error('Failed to fetch Gmail')
      }

      const data = await response.json()
      
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
  const fetchAllEmails = async (useCache = false, forceRefresh = false) => {
    try {
      setSyncing(true)
      setError(null)

      const [gmailData, outlookData] = await Promise.all([
        fetchGmail(useCache, forceRefresh),
        fetchOutlook(useCache),
      ])

      if (gmailData.historyId) setGmailHistoryId(gmailData.historyId)
      if (outlookData.deltaLink) setOutlookDeltaLink(outlookData.deltaLink)

      if (useCache && (gmailHistoryId || outlookDeltaLink)) {
        setEmails(prevEmails => {
          const emailMap = new Map(prevEmails.map(e => [e.id, e]))
          
          gmailData.emails.forEach((email: any) => {
            emailMap.set(email.id, { ...email, provider: 'gmail' as const })
          })
          
          if (gmailData.deleted) {
            gmailData.deleted.forEach((id: string) => {
              emailMap.delete(id)
            })
          }
          
          outlookData.emails.forEach((email: any) => {
            emailMap.set(email.id, email)
          })
          
          const updatedEmails = Array.from(emailMap.values())
            .sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime())
          
          return updatedEmails
        })
      } else {
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

  // Fetch full email content
  const fetchFullEmail = async (email: Email) => {
    setLoadingEmail(true)
    try {
      const response = await fetch(`/api/mail/email?id=${email.id}&provider=${email.provider}`)
      if (!response.ok) throw new Error('Failed to fetch email')
      
      const fullEmail: FullEmail = await response.json()
      setSelectedEmail(fullEmail)
      
      // Mark as read if unread
      if (!email.isRead) {
        // Update local state immediately
        setEmails(prevEmails =>
          prevEmails.map(e => e.id === email.id ? { ...e, isRead: true } : e)
        )
        
        // Mark as read on the server (Gmail/Outlook)
        fetch('/api/mail/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailId: email.id,
            provider: email.provider,
          }),
        }).catch(err => {
          console.error('Failed to mark email as read on server:', err)
          // Don't show error to user, just log it
        })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load email content',
        variant: 'destructive',
      })
    } finally {
      setLoadingEmail(false)
    }
  }

  // Recalculate stats when emails change
  useEffect(() => {
    setStats(calculateStats(emails))
  }, [emails, calculateStats])

  // Initial fetch
  useEffect(() => {
    if (session) {
      fetchAllEmails(false, true) // Force refresh on initial load to bypass stale cache
    }
  }, [session])

  // Set up polling for updates (every 30 seconds)
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      fetchAllEmails(true, false) // Use incremental sync, don't force refresh on polling
    }, 30000)

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
        fetchAllEmails(true, true) // Force refresh on new email notifications
        
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

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Filter emails
  const filteredEmails = emails.filter(email => {
    if (providerFilter !== 'all' && email.provider !== providerFilter) {
      return false
    }

    if (statusFilter === 'unread' && email.isRead) return false
    if (statusFilter === 'starred' && !email.isStarred) return false
    if (statusFilter === 'important' && email.importance !== 'high') return false
    if (statusFilter === 'attachments' && !email.hasAttachments) return false

    return true
  })

  if (loading) {
    return (
      <div className="h-full w-full p-6 flex items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full w-full p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => fetchAllEmails(false, true)} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Aurora Background */}
      <div className="aurora-container fixed inset-0 -z-10">
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="aurora aurora-3" />
        <div className="aurora aurora-4" />
      </div>

      {/* Main Content */}
      <div className="relative h-full flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-none px-6 py-3 border-b border-white/20 dark:border-white/10 glass-strong">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              {lastSync && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastSync.toLocaleTimeString()}
                </p>
              )}
            </div>
            
            {/* Compact Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Inbox className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold">{stats.total}</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold">{stats.unread}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-semibold">{stats.starred}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold">{stats.important}</span>
              </div>
              {syncing && (
                <Badge variant="outline" className="animate-pulse text-xs">Syncing...</Badge>
              )}
              <Button
                onClick={() => fetchAllEmails(true, true)}
                disabled={syncing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Tabs value={providerFilter} onValueChange={(v) => setProviderFilter(v as ProviderFilter)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="gmail" className="text-xs">Gmail</TabsTrigger>
                <TabsTrigger value="outlook" className="text-xs">Outlook</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-1">
              {(['all', 'unread', 'starred', 'important', 'attachments'] as StatusFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                  className="h-8 text-xs capitalize"
                >
                  {filter === 'unread' && <Mail className="h-3 w-3 mr-1" />}
                  {filter === 'starred' && <Star className="h-3 w-3 mr-1" />}
                  {filter === 'important' && <AlertCircle className="h-3 w-3 mr-1" />}
                  {filter === 'attachments' && <Paperclip className="h-3 w-3 mr-1" />}
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Split View - Scrollable */}
        <div className="flex-1 flex min-h-0">
          {/* Email List */}
          <div className="w-1/2 border-r border-white/20 dark:border-white/10 flex flex-col glass-light">
            <div className="flex-none px-4 py-2 border-b border-white/20 dark:border-white/10">
              <h3 className="text-sm font-semibold">Messages ({filteredEmails.length})</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredEmails.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No emails match your filters</p>
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredEmails.map((email) => (
                    <div
                      key={`${email.provider}-${email.id}`}
                      onClick={() => fetchFullEmail(email)}
                      className={cn(
                        'p-3 rounded-lg cursor-pointer transition-all',
                        'glass-medium border-white/30 dark:border-white/10',
                        'hover:glass-strong hover:shadow-lg',
                        !email.isRead && 'glass-strong border-l-4 border-l-blue-500 shadow-lg bg-gradient-to-r from-blue-500/20 to-transparent',
                        selectedEmail?.id === email.id && 'glass-strong ring-2 ring-blue-500/50 shadow-xl'
                      )}
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(email.from.name || email.from.address)}&background=random`} />
                          <AvatarFallback className="text-xs">
                            {(email.from.name || email.from.address || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className={cn(
                              "font-semibold text-sm truncate",
                              !email.isRead && "text-blue-600 dark:text-blue-400 font-bold"
                            )}>{email.from.name || email.from.address}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {!email.isRead && (
                                <div className="relative flex items-center">
                                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                                  <div className="absolute h-2.5 w-2.5 rounded-full bg-blue-400 animate-ping" />
                                </div>
                              )}
                              {email.isStarred && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
                              {email.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                              <span className="text-[10px] text-muted-foreground">{formatTime(email.receivedDateTime)}</span>
                            </div>
                          </div>
                          <p className={cn(
                            "text-sm font-medium mb-0.5 truncate",
                            !email.isRead && "font-bold text-foreground"
                          )}>{email.subject || '(No subject)'}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{email.bodyPreview}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email Viewer */}
          <div className="w-1/2 flex flex-col glass-light">
            {selectedEmail ? (
              <>
                <div className="flex-none px-6 py-4 border-b border-white/20 dark:border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0"><Reply className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0"><Archive className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold mb-2">{selectedEmail.subject || '(No subject)'}</h2>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmail.from.name || selectedEmail.from.address)}&background=random`} />
                      <AvatarFallback>
                        {(selectedEmail.from.name || selectedEmail.from.address || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{selectedEmail.from.name || selectedEmail.from.address}</p>
                          <p className="text-xs text-muted-foreground">{selectedEmail.from.address}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatFullDate(selectedEmail.date)}</p>
                      </div>
                      {selectedEmail.to && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">To: </span>
                          <span>{selectedEmail.to}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-6">
                    {loadingEmail ? (
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : selectedEmail.bodyHtml ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                      />
                    ) : selectedEmail.bodyText ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {selectedEmail.bodyText}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">{selectedEmail.bodyPreview}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-16 w-16 mx-auto mb-4 opacity-20 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">Select an email to view</p>
                  <p className="text-sm text-muted-foreground">Click on any email from the list to read it here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
