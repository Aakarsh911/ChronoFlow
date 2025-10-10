'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Mail, Inbox, Clock, AlertCircle, Paperclip, Star, RefreshCw, ExternalLink, Wifi, WifiOff, Archive } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface Email {
  id: string
  threadId: string
  snippet: string
  subject: string
  from: string
  fromEmail: string
  date: string
  isRead: boolean
  hasAttachments: boolean
  labels: string[]
}

interface EmailStats {
  total: number
  unread: number
  starred: number
  withAttachments: number
}

export default function GmailDashboard() {
  const [emails, setEmails] = useState<Email[]>([])
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    unread: 0,
    starred: 0,
    withAttachments: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const { toast } = useToast()

  // Calculate stats from emails
  const calculateStats = useCallback((emailList: Email[]) => {
    return {
      total: emailList.length,
      unread: emailList.filter(e => !e.isRead).length,
      starred: emailList.filter(e => e.labels.includes('STARRED')).length,
      withAttachments: emailList.filter(e => e.hasAttachments).length,
    }
  }, [])

  // Fetch emails using Gmail API
  const fetchEmails = useCallback(async (useHistory = false) => {
    try {
      const url = useHistory && historyId 
        ? `/api/gmail/emails/sync?historyId=${historyId}`
        : '/api/gmail/emails'
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const data = await response.json()
      
      if (useHistory && historyId) {
        // This is a history update - merge with existing emails
        setEmails(prevEmails => {
          const emailMap = new Map(prevEmails.map(e => [e.id, e]))
          
          // Process history changes
          data.emails.forEach((email: Email) => {
            emailMap.set(email.id, email)
          })
          
          // Remove deleted emails
          if (data.deleted) {
            data.deleted.forEach((id: string) => {
              emailMap.delete(id)
            })
          }
          
          // Convert back to array and sort by date
          const updatedEmails = Array.from(emailMap.values())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          
          return updatedEmails
        })
      } else {
        // Initial load - replace all emails
        const sortedEmails = (data.emails || [])
          .sort((a: Email, b: Email) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        setEmails(sortedEmails)
      }
      
      // Update historyId for next sync
      if (data.historyId) {
        setHistoryId(data.historyId)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching emails:', err)
      setError(err instanceof Error ? err.message : 'Failed to load emails')
    } finally {
      setLoading(false)
    }
  }, [historyId])

  // Setup Gmail Push Notifications (Pub/Sub)
  const setupPushNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/gmail/watch', {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to setup push notifications')
      }
      
      const data = await response.json()
      console.log('Gmail watch setup:', data)
    } catch (err) {
      console.error('Error setting up push notifications:', err)
      toast({
        title: "Push Notifications Setup Failed",
        description: "Real-time updates may not work. Using fallback mode.",
        variant: "destructive",
      })
    }
  }, [toast])

  // Connect to SSE for real-time updates
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/gmail/events')
    
    eventSource.onopen = () => {
      console.log('SSE connection established')
      setIsConnected(true)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          console.log('SSE connected with client ID:', data.clientId)
        } else if (data.type === 'new-email' || data.type === 'email-change') {
          console.log('Email change notification received:', data)
          
          // Update historyId if provided
          if (data.historyId) {
            setHistoryId(data.historyId)
          }
          
          // Fetch history changes when we get a notification
          fetchEmails(true)
          
          toast({
            title: "📬 New Email Activity",
            description: "Your inbox has been updated",
          })
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      setIsConnected(false)
      eventSource.close()
      
      // Retry connection after 5 seconds
      setTimeout(() => {
        console.log('Retrying SSE connection...')
        connectSSE()
      }, 5000)
    }
    
    eventSourceRef.current = eventSource
  }, [fetchEmails, toast])

  // Initial load
  useEffect(() => {
    fetchEmails(false)
  }, [])

  // Setup push notifications and SSE after initial load
  useEffect(() => {
    if (!loading && !error) {
      setupPushNotifications()
      connectSSE()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [loading, error])

  // Update stats when emails change
  useEffect(() => {
    setStats(calculateStats(emails))
  }, [emails, calculateStats])

  // Manual refresh
  const handleRefresh = useCallback(() => {
    setLoading(true)
    fetchEmails(true)
  }, [fetchEmails])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && emails.length === 0) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
        <Button onClick={handleRefresh} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gmail Inbox</h1>
          <p className="text-muted-foreground">Today&apos;s emails</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="icon"
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Today&apos;s messages</p>
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
            <p className="text-xs text-muted-foreground">Important</p>
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

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Your emails are synced in real-time using Gmail API history and push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No emails today</h3>
              <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className={cn(
                      "flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer",
                      !email.isRead && "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(email.from)}&background=random`} />
                      <AvatarFallback>
                        {email.from
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{email.from}</span>
                            {email.labels.includes('STARRED') && (
                              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            )}
                            {email.hasAttachments && (
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                            )}
                            {!email.isRead && (
                              <Badge variant="default" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{email.fromEmail}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(email.date)}
                        </span>
                      </div>

                      <h4 className="font-medium">{email.subject || "(No subject)"}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{email.snippet}</p>

                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${email.id}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open in Gmail
                        </Button>
                        {email.labels.includes('INBOX') && (
                          <Button variant="ghost" size="sm">
                            <Archive className="h-3 w-3 mr-1" />
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
