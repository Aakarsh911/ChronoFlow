"use client"

import { useState, useEffect } from "react"
import { Calendar, CheckCircle, Timer, Mail, BarChart3, Target, ArrowRight, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "next-auth/react"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { format, isToday, parseISO } from "date-fns"
import { PageHeader } from "@/components/page-header"
import { useAppSelector } from "@/store/store"

const EVENT_BAR_COLORS = [
  "rgba(var(--cf-accent-rgb), 1)",
  "rgba(var(--cf-primary-rgb), 1)",
  "#ea580c",
  "#16a34a",
  "#9333ea",
] as const

interface DashboardData {
  tasks: {
    total: number
    completed: number
    pending: number
    overdue: number
  }
  focus: {
    isActive: boolean
    currentSession: any
    todayMinutes: number
  }
  calendar: {
    todayEvents: any[]
    nextMeeting: any
  }
  emails: {
    unread: number
  }
}

export function DashboardContent() {
  const { data: session } = useSession()
  const user = session?.user
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Get focus timer state from Redux
  const focusTimer = useAppSelector((state) => state.focusTimer)
  const [currentFocusMinutes, setCurrentFocusMinutes] = useState(0)

  // Update focus timer in real-time
  useEffect(() => {
    if (focusTimer.isActive && focusTimer.startAt) {
      const updateTimer = () => {
        const now = Date.now()
        const elapsed = Math.floor((now - focusTimer.startAt!) / 60000) // minutes
        setCurrentFocusMinutes(Math.max(0, elapsed))
      }
      
      updateTimer() // Initial update
      const interval = setInterval(updateTimer, 1000) // Update every second
      
      return () => clearInterval(interval)
    } else {
      setCurrentFocusMinutes(0)
    }
  }, [focusTimer.isActive, focusTimer.startAt])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const [tasksRes, focusRes, calendarRes, gmailRes, outlookRes] = await Promise.all([
        fetch('/api/tasks').catch(() => null),
        fetch('/api/focus/current').catch(() => null),
        fetch('/api/calendar').catch(() => null),
        fetch('/api/gmail/emails').catch(() => null),
        fetch('/api/outlook/emails/delta').catch(() => null),
      ])

      const tasksData = tasksRes?.ok ? await tasksRes.json() : []
      const focusData = focusRes?.ok ? await focusRes.json() : { active: false }
      const calendarData = calendarRes?.ok ? await calendarRes.json() : { events: [] }
      const gmailData = gmailRes?.ok ? await gmailRes.json() : { emails: [] }
      const outlookData = outlookRes?.ok ? await outlookRes.json() : { emails: [] }

      const tasks = Array.isArray(tasksData) ? tasksData : []
      const completedTasks = tasks.filter((t: any) => t.status === 'Done')
      const overdueTasks = tasks.filter((t: any) => {
        if (!t.dueDate || t.status === 'Done') return false
        return new Date(t.dueDate) < new Date()
      })
      
      console.log('📋 Tasks breakdown:', {
        total: tasks.length,
        completed: completedTasks.length,
        overdue: overdueTasks.length,
        statuses: tasks.map((t: any) => t.status)
      })

      // Focus time is now handled by Redux state in real-time
      const allEvents = calendarData.events || []
      const todayEvents = allEvents.filter((e: any) => {
        if (!e.start?.dateTime) return false
        return isToday(parseISO(e.start.dateTime))
      }).sort((a: any, b: any) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())

      const now = new Date()
      const nextMeeting = todayEvents.find((e: any) => new Date(e.start.dateTime) > now)

      const gmailEmails = gmailData.emails || []
      const outlookEmails = outlookData.emails || []
      const unreadEmails = [...gmailEmails, ...outlookEmails].filter((e: any) => !e.isRead)

      setData({
        tasks: {
          total: tasks.length,
          completed: completedTasks.length,
          pending: tasks.length - completedTasks.length,
          overdue: overdueTasks.length,
        },
        focus: {
          isActive: focusData.active || false,
          currentSession: focusData,
          todayMinutes: 0, // Will be overridden by Redux state
        },
        calendar: {
          todayEvents: todayEvents.slice(0, 5),
          nextMeeting,
        },
        emails: {
          unread: unreadEmails.length,
        },
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  return (
    <div className="cf-page-shell">
      <div className="cf-page-inner space-y-5">
        <PageHeader
          title={`${getGreeting()}, ${user?.name?.split(" ")[0] || "there"}`}
          subtitle={
            isLoading ? (
              <Skeleton className="h-5 w-80" />
            ) : (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
                  {data?.tasks.completed || 0} done
                </span>
                <span className="text-[var(--cf-text-dim)]">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[rgba(var(--cf-primary-rgb),1)]" />
                  {data?.calendar.todayEvents.length || 0} events
                </span>
                <span className="text-[var(--cf-text-dim)]">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-orange-500" />
                  {data?.emails.unread || 0} unread
                </span>
              </span>
            )
          }
          actions={
            <Button variant="outline" size="sm" onClick={fetchDashboardData}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          }
        />

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/tasks", label: "Tasks", detail: `${data?.tasks.pending || 0} pending`, icon: Target, accent: "rgba(var(--cf-accent-rgb), 1)" },
            { href: "/mail", label: "Mail", detail: `${data?.emails.unread || 0} unread`, icon: Inbox, accent: "#ea580c" },
            { href: "/focus", label: "Focus", detail: focusTimer.isActive ? "Session active" : "Start session", icon: Timer, accent: "rgba(var(--cf-primary-rgb), 1)" },
            { href: "/calendar", label: "Calendar", detail: `${data?.calendar.todayEvents.length || 0} today`, icon: Calendar, accent: "#9333ea" },
          ].map((item) => (
            <a key={item.href} href={item.href} className="cf-surface-card block p-3 transition-colors hover:border-[rgba(var(--cf-accent-rgb),0.35)]">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in srgb, ${item.accent} 12%, transparent)`, color: item.accent }}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--cf-text)]">{item.label}</p>
                  <p className="truncate text-xs text-[var(--cf-text-muted)]">{isLoading ? "…" : item.detail}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Schedule + sidebar */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Card className="cf-surface-card h-full border-0">
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base text-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      Today&apos;s Schedule
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {isLoading ? 'Loading events...' : data?.calendar.todayEvents.length ? `${data.calendar.todayEvents.length} events` : 'No events scheduled'}
                    </CardDescription>
                  </div>
                  <a href="/calendar">
                    <Button variant="ghost" size="sm" className="h-8 text-xs">View all</Button>
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-5">
                {isLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                        <Skeleton className="w-2 h-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-full max-w-md" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : data?.calendar.todayEvents.length ? (
                  data.calendar.todayEvents.map((event: any, index: number) => {
                    const barColor = EVENT_BAR_COLORS[index % EVENT_BAR_COLORS.length]

                    return (
                      <div key={event.id || index} className="flex items-start gap-3 rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                        <div
                          className="mt-0.5 h-12 w-1.5 shrink-0 rounded-full"
                          style={{ background: barColor }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-foreground">{event.summary || 'Untitled Event'}</h4>
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(event.start.dateTime), 'h:mm a')} - {format(parseISO(event.end.dateTime), 'h:mm a')}
                            </span>
                          </div>
                          {event.description && (
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{event.description}</p>
                          )}
                          <Badge variant="outline" className="mt-2 text-xs">
                            {event.location || 'Meeting'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-8 text-center">
                    <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No events scheduled for today</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="cf-surface-card border-0">
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-base font-semibold text-foreground">Today&apos;s Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                {isLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Focus Time</span>
                      <span className="text-sm font-semibold text-primary">
                        {focusTimer.isActive && currentFocusMinutes > 0 ? formatTime(currentFocusMinutes) : '0m'}
                      </span>
                    </div>
                    <Progress value={focusTimer.isActive && currentFocusMinutes > 0 ? Math.min((currentFocusMinutes / 480) * 100, 100) : 0} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tasks Done</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {data?.tasks.completed || 0}/{data?.tasks.total || 0}
                      </span>
                    </div>
                    <Progress value={data?.tasks.total ? (data.tasks.completed / data.tasks.total) * 100 : 0} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Events</span>
                      <span className="text-sm font-semibold text-purple-600">
                        {data?.calendar.todayEvents.length || 0} today
                      </span>
                    </div>
                    <Progress value={data?.calendar.todayEvents.length ? Math.min(data.calendar.todayEvents.length * 25, 100) : 0} className="h-2" />

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Unread Emails</span>
                      <span className="text-sm font-semibold text-orange-600">
                        {data?.emails.unread || 0}
                      </span>
                    </div>
                    <Progress value={data?.emails.unread ? Math.min((data.emails.unread / 50) * 100, 100) : 0} className="h-2" />
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="cf-surface-card border-0">
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="flex items-center gap-2 text-base text-foreground">
                  <BarChart3 className="h-4 w-4 text-[rgba(var(--cf-accent-rgb),1)]" />
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-5">
                <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-text-dim)]">Completion rate</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--cf-text)]">
                    {data?.tasks.total ? Math.round(((data.tasks.completed / data.tasks.total) * 100)) : 0}%
                  </p>
                  <Progress value={data?.tasks.total ? (data.tasks.completed / data.tasks.total) * 100 : 0} className="mt-2 h-1.5" />
                </div>
                <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--cf-text-dim)]">Focus today</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--cf-text)]">
                    {focusTimer.isActive && currentFocusMinutes > 0 ? formatTime(currentFocusMinutes) : '0m'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--cf-text-muted)]">
                    {focusTimer.isActive ? focusTimer.title || 'Deep work in progress' : 'No active session'}
                  </p>
                </div>
                <a href="/analytics" className="block">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    View analytics
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

