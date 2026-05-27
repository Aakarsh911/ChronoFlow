'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, RefreshCw, Paperclip, Inbox, Star, AlertCircle, ExternalLink, ArrowLeft, Archive, Trash2, Reply, Square } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { format, isToday, isThisYear } from 'date-fns'
import { MailProviderBadge } from '@/components/mail-provider-badge'
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

const EMAIL_HTML_CONTAIN_STYLE = `<style>
  html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
  table { max-width: 100% !important; width: auto !important; margin-left: auto !important; margin-right: auto !important; table-layout: fixed !important; }
  td, th { word-break: break-word !important; overflow-wrap: anywhere !important; }
  img, video, embed, object { max-width: 100% !important; height: auto !important; }
  center { display: block !important; max-width: 100% !important; margin-left: auto !important; margin-right: auto !important; }
  div, section, article { max-width: 100% !important; box-sizing: border-box !important; }
</style>`

function prepareEmailHtml(html: string) {
  return `${EMAIL_HTML_CONTAIN_STYLE}${html}`
}

export default function UnifiedMailDashboard() {
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [emails, setEmails] = useState<Email[]>([])
  const [activeEmail, setActiveEmail] = useState<Email | null>(null)
  const [fullEmail, setFullEmail] = useState<FullEmail | null>(null)
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
    setActiveEmail(email)
    setFullEmail(null)
    setLoadingEmail(true)
    try {
      const response = await fetch(`/api/mail/email?id=${email.id}&provider=${email.provider}`)
      if (!response.ok) throw new Error('Failed to fetch email')

      const loaded: FullEmail = await response.json()
      setFullEmail(loaded)

      if (!email.isRead) {
        fetch('/api/mail/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailId: email.id,
            provider: email.provider,
          }),
        }).catch(err => {
          console.error('Failed to mark email as read on server:', err)
        })
      }
    } catch {
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

  const formatListTime = (dateString: string) => {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return ''
    if (isToday(date)) return format(date, 'HH:mm')
    if (isThisYear(date)) return format(date, 'MMM d')
    return format(date, 'dd/MM/yy')
  }

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

  const closeReading = () => {
    if (activeEmail && !activeEmail.isRead) {
      setEmails(prevEmails =>
        prevEmails.map(e =>
          e.id === activeEmail.id && e.provider === activeEmail.provider
            ? { ...e, isRead: true }
            : e
        )
      )
    }
    setActiveEmail(null)
    setFullEmail(null)
  }

  const displayEmail = fullEmail ?? activeEmail

  if (loading) {
    return (
      <div className="cf-mail-shell">
        <div className="cf-mail-toolbar px-4 py-3">
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="cf-gmail-list cf-mail-list-scroll">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="cf-gmail-row h-10 rounded-none" />
          ))}
        </div>
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
    <div className="cf-mail-shell">
      {/* Toolbar */}
      <div className="cf-mail-toolbar px-3 py-2 sm:px-4">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
          <Tabs value={providerFilter} onValueChange={(v) => setProviderFilter(v as ProviderFilter)}>
            <TabsList className="h-8 bg-[var(--cf-bg-soft)]">
              <TabsTrigger value="all" className="h-7 px-3 text-xs">All</TabsTrigger>
              <TabsTrigger value="gmail" className="h-7 px-3 text-xs">Gmail</TabsTrigger>
              <TabsTrigger value="outlook" className="h-7 px-3 text-xs">Outlook</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="h-8 max-w-full overflow-x-auto bg-[var(--cf-bg-soft)]">
              <TabsTrigger value="all" className="h-7 px-2.5 text-xs">
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                All
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1.25rem] justify-center px-1.5 text-[10px]">{stats.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="unread" className="h-7 px-2.5 text-xs">
                <Inbox className="mr-1.5 h-3.5 w-3.5" />
                Unread
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1.25rem] justify-center px-1.5 text-[10px]">{stats.unread}</Badge>
              </TabsTrigger>
              <TabsTrigger value="starred" className="h-7 px-2.5 text-xs">
                <Star className="mr-1.5 h-3.5 w-3.5" />
                Starred
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1.25rem] justify-center px-1.5 text-[10px]">{stats.starred}</Badge>
              </TabsTrigger>
              <TabsTrigger value="important" className="h-7 px-2.5 text-xs">
                <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                Important
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1.25rem] justify-center px-1.5 text-[10px]">{stats.important}</Badge>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="h-7 px-2.5 text-xs">
                <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                Files
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1.25rem] justify-center px-1.5 text-[10px]">{stats.withAttachments}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {syncing && (
              <Badge variant="outline" className="text-xs">Syncing…</Badge>
            )}
            <Button
              onClick={() => fetchAllEmails(true, true)}
              disabled={syncing}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      {displayEmail ? (
        /* Full-width reading view — no split pane */
        <div className="cf-mail-reading-full">
          <div className="cf-mail-reading-toolbar">
            <Button variant="ghost" size="sm" className="h-8" onClick={closeReading}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Inbox
            </Button>
            <div className="flex flex-1 items-center gap-2">
              <MailProviderBadge provider={displayEmail.provider} />
              {displayEmail.webLink && (
                <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                  <a href={displayEmail.webLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Open in {displayEmail.provider === 'gmail' ? 'Gmail' : 'Outlook'}
                  </a>
                </Button>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Reply"><Reply className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Archive"><Archive className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Delete"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="cf-mail-reading-header cf-mail-reading-header-full">
            <div className="cf-mail-reading-column">
              <h2 className="mb-2 line-clamp-2 text-xl font-medium text-[var(--cf-text)]">
                {displayEmail.subject || '(No subject)'}
              </h2>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="text-sm font-medium text-[var(--cf-text)]">
                    {displayEmail.from.name || displayEmail.from.address}
                  </p>
                  <p className="text-xs text-[var(--cf-text-muted)]">{displayEmail.from.address}</p>
                </div>
                <p className="text-xs text-[var(--cf-text-muted)]">
                  {formatFullDate(displayEmail.receivedDateTime)}
                </p>
              </div>
              {fullEmail?.to && (
                <p className="mt-2 text-xs text-[var(--cf-text-muted)]">
                  <span className="text-[var(--cf-text-dim)]">To:</span> {fullEmail.to}
                </p>
              )}
            </div>
          </div>

          <div className="cf-mail-reading-body">
            <div className="cf-mail-reading-column">
              {loadingEmail ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-4 h-32 w-full" />
                </div>
              ) : fullEmail?.bodyHtml ? (
                <div className="cf-mail-html-frame">
                  <div
                    className="cf-mail-html-content"
                    dangerouslySetInnerHTML={{ __html: prepareEmailHtml(fullEmail.bodyHtml) }}
                  />
                </div>
              ) : fullEmail?.bodyText ? (
                <div className="cf-mail-html-frame">
                  <div className="cf-mail-html-content whitespace-pre-wrap text-sm leading-relaxed text-[var(--cf-text)]">
                    {fullEmail.bodyText}
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-[var(--cf-text-muted)]">
                  {displayEmail.bodyPreview}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Gmail-style full-width inbox list */
        <div className="cf-gmail-list cf-mail-list-scroll">
          {filteredEmails.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <Mail className="mx-auto mb-3 h-10 w-10 text-[var(--cf-text-dim)] opacity-40" />
                <p className="text-sm text-[var(--cf-text-muted)]">No emails match your filters</p>
              </div>
            </div>
          ) : (
            filteredEmails.map((email) => (
              <button
                key={`${email.provider}-${email.id}`}
                type="button"
                onClick={() => fetchFullEmail(email)}
                className={cn(
                  'cf-gmail-row',
                  email.isRead ? 'is-read' : 'is-unread',
                )}
              >
                <span className="cf-gmail-check" aria-hidden>
                  <Square className="h-4 w-4 text-[var(--cf-text-dim)]" />
                </span>
                <span className="cf-gmail-star" aria-hidden>
                  <Star className={cn(
                    'h-4 w-4',
                    email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-[var(--cf-text-dim)]',
                  )} />
                </span>
                <span className="cf-gmail-sender">{email.from.name || email.from.address}</span>
                <span className="cf-gmail-subject-line">
                  <span className="cf-gmail-subject">{email.subject || '(No subject)'}</span>
                  <span className="cf-gmail-sep"> — </span>
                  <span className="cf-gmail-snippet">{email.bodyPreview}</span>
                  {email.hasAttachments && (
                    <Paperclip className="ml-1.5 inline h-3 w-3 shrink-0 text-[var(--cf-text-dim)]" />
                  )}
                </span>
                <span className="cf-gmail-time">{formatListTime(email.receivedDateTime)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
