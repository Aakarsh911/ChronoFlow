"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Mail, Inbox, Clock, AlertCircle, Paperclip, Star, Flag, RefreshCw, ExternalLink, Wifi, WifiOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Email {
  id: string
  subject: string
  bodyPreview: string
  from: {
    emailAddress: {
      name: string
      address: string
    }
  }
  receivedDateTime: string
  isRead: boolean
  hasAttachments: boolean
  importance: "low" | "normal" | "high"
  conversationId?: string
  "@removed"?: { reason: string } // For delta query deletions
}

interface EmailStats {
  total: number
  unread: number
  important: number
  withAttachments: number
}

export default function OutlookDashboard() {
  const [emails, setEmails] = useState<Email[]>([])
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    unread: 0,
    important: 0,
    withAttachments: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [deltaLink, setDeltaLink] = useState<string | null>(null)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const { toast } = useToast()

  // Calculate stats from emails
  const calculateStats = useCallback((emailList: Email[]) => {
    return {
      total: emailList.length,
      unread: emailList.filter(e => !e.isRead).length,
      important: emailList.filter(e => e.importance === "high").length,
      withAttachments: emailList.filter(e => e.hasAttachments).length,
    }
  }, [])

  // Fetch emails using delta query
  const fetchEmails = useCallback(async (useDeltaLink = false) => {
    try {
      const url = useDeltaLink && deltaLink 
        ? `/api/outlook/emails/delta?deltaLink=${encodeURIComponent(deltaLink)}`
        : '/api/outlook/emails/delta'
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const data = await response.json()
      
      if (useDeltaLink && deltaLink) {
        // This is a delta update - merge with existing emails
        setEmails(prevEmails => {
          const emailMap = new Map(prevEmails.map(e => [e.id, e]))
          
          // Process delta changes
          data.emails.forEach((email: Email) => {
            if (email["@removed"]) {
              // Email was deleted
              emailMap.delete(email.id)
            } else {
              // Email was created or updated
              emailMap.set(email.id, email)
            }
          })
          
          // Convert back to array and sort by date
          const updatedEmails = Array.from(emailMap.values())
            .sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime())
          
          return updatedEmails
        })
      } else {
        // Initial load - replace all emails
        const sortedEmails = (data.emails || [])
          .sort((a: Email, b: Email) => 
            new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime()
          )
        setEmails(sortedEmails)
      }
      
      // Update deltaLink for next sync
      if (data.deltaLink) {
        setDeltaLink(data.deltaLink)
      }
      
      setError(null)
    } catch (err) {
      console.error('Error fetching emails:', err)
      setError(err instanceof Error ? err.message : 'Failed to load emails')
    } finally {
      setLoading(false)
    }
  }, [deltaLink])

  // Create Microsoft Graph subscription for webhooks
  const createSubscription = useCallback(async () => {
    // Skip webhooks in development (localhost) as they require HTTPS
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('Skipping webhook subscription in development (requires HTTPS)')
      
      // Use polling fallback in development - check for updates every 30 seconds
      const pollInterval = setInterval(() => {
        console.log('Polling for email updates...')
        fetchEmails(true)
      }, 30000)
      
      return () => clearInterval(pollInterval)
    }
    
    try {
      const response = await fetch('/api/outlook/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create subscription')
      }
      
      const data = await response.json()
      setSubscriptionId(data.subscription.id)
      
      console.log('Created webhook subscription:', data.subscription.id)
      
      toast({
        title: "📬 Live Updates Enabled",
        description: "You'll be notified instantly when new emails arrive",
      })
    } catch (err) {
      console.error('Error creating subscription:', err)
      toast({
        title: "Using Polling Mode",
        description: "Checking for new emails every 30 seconds",
      })
      
      // Fallback to polling
      const pollInterval = setInterval(() => {
        fetchEmails(true)
      }, 30000)
      
      return () => clearInterval(pollInterval)
    }
  }, [toast, fetchEmails])

  // Connect to SSE for real-time updates
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/outlook/events')
    
    eventSource.onopen = () => {
      console.log('SSE connection established')
      setIsConnected(true)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          console.log('SSE connected with client ID:', data.clientId)
        } else if (data.type === 'email-change') {
          console.log('Email change notification received:', data.changeType)
          
          // Fetch delta changes when we get a notification
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
  }, []) // Only run once on mount

  // Setup webhooks and SSE after initial load
  useEffect(() => {
    if (!loading && !error) {
      createSubscription()
      connectSSE()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [loading, error]) // Only run when loading completes

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
          <h1 className="text-3xl font-bold">Outlook Inbox</h1>
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

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Your emails are synced in real-time using Microsoft Graph delta queries and webhooks
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
                      "flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent transition-colors",
                      !email.isRead && "border-l-4 border-l-blue-500"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(email.from.emailAddress.name)}&background=random`} />
                      <AvatarFallback>
                        {email.from.emailAddress.name
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
                            <span className="font-semibold">{email.from.emailAddress.name}</span>
                            {email.importance === "high" && (
                              <Badge variant="destructive" className="text-xs">High Priority</Badge>
                            )}
                            {email.hasAttachments && (
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{email.from.emailAddress.address}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(email.receivedDateTime)}
                        </span>
                      </div>

                      <h4 className="font-medium">{email.subject || "(No subject)"}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{email.bodyPreview}</p>

                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open in Outlook
                        </Button>
                        {!email.isRead && (
                          <Button variant="ghost" size="sm">
                            Mark as read
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
