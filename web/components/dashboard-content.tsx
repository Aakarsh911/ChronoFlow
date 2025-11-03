"use client"

import { useState, useEffect } from "react"
import { Calendar, CheckCircle, Timer, Mail, Loader2, Sparkles, BarChart3, Target, Activity, ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "next-auth/react"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { format, isToday, parseISO } from "date-fns"
import { useAppSelector } from "@/store/store"

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
          todayEvents: todayEvents.slice(0, 3),
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
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient Mesh Background */}
      <div className="gradient-mesh-bg">
        <div className="mesh-gradient mesh-1"></div>
        <div className="mesh-gradient mesh-2"></div>
        <div className="mesh-gradient mesh-3"></div>
        <div className="mesh-gradient mesh-4"></div>
      </div>

      <div className="relative z-10 p-6 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              {getGreeting()}, {user?.name?.split(" ")[0] || "there"}
            </h1>
            {isLoading ? (
              <Skeleton className="h-5 w-96 mt-2" />
            ) : (
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                {data?.tasks.completed || 0} tasks completed • {data?.calendar.todayEvents.length || 0} events today • {data?.emails.unread || 0} unread emails
              </p>
            )}
          </div>
          <Button 
            className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-200 w-fit hover:scale-105"
            onClick={fetchDashboardData}
          >
            <ArrowRight className="w-4 h-4 mr-2 animate-pulse" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Focus Time Card */}
          <Card className="elevated-card border-0 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Focus</p>
                      <p className="text-2xl font-bold text-foreground mt-2">
                        {focusTimer.isActive && currentFocusMinutes > 0 ? formatTime(currentFocusMinutes) : '0m'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {focusTimer.isActive ? (focusTimer.title || 'Deep work in progress') : 'No active session'}
                      </p>
                    </div>
                    <div className={`w-12 h-12 ${focusTimer.isActive ? 'gradient-primary animate-pulse' : 'bg-slate-100 dark:bg-slate-800'} rounded-xl flex items-center justify-center`}>
                      <Timer className={`w-6 h-6 ${focusTimer.isActive ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    {focusTimer.isActive ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 animate-pulse">
                        <Activity className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-200 text-slate-600">
                        Idle
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tasks Card */}
          <Card className="elevated-card border-0 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-2 w-full mt-4" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tasks Today</p>
                      <p className="text-2xl font-bold text-foreground mt-2">
                        {data?.tasks.completed || 0}/{data?.tasks.total || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data?.tasks.pending || 0} remaining
                        {data?.tasks.overdue ? ` • ${data.tasks.overdue} overdue` : ''}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress 
                      value={data?.tasks.total ? (data.tasks.completed / data.tasks.total) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Next Meeting Card */}
          <Card className="elevated-card border-0 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Next Meeting</p>
                      {data?.calendar.nextMeeting ? (
                        <>
                          <p className="text-2xl font-bold text-foreground mt-2">
                            {format(parseISO(data.calendar.nextMeeting.start.dateTime), 'h:mm a')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">
                            {data.calendar.nextMeeting.summary}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-foreground mt-2">—</p>
                          <p className="text-xs text-muted-foreground mt-1">No meetings today</p>
                        </>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    {data?.calendar.nextMeeting ? (
                      <Badge variant="outline" className="border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400">
                        {data.calendar.todayEvents.length} events today
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-200 text-slate-600">
                        Free day
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Analytics Card */}
          <Card className="elevated-card border-0 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Analytics</p>
                  <p className="text-lg font-bold text-foreground mt-2">Coming Soon</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Productivity insights
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="mt-4">
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Powered
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="elevated-card border-0 hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Calendar className="w-5 h-5 text-primary" />
                      Today's Schedule
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {isLoading ? 'Loading events...' : data?.calendar.todayEvents.length ? `${data.calendar.todayEvents.length} events today` : 'No events scheduled'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    const colors = ['purple', 'blue', 'orange', 'green', 'pink']
                    const color = colors[index % colors.length]
                    
                    return (
                      <div key={event.id || index} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className={`w-2 h-16 bg-${color}-500 rounded-full`}></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-foreground">{event.summary || 'Untitled Event'}</h4>
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(event.start.dateTime), 'h:mm a')} - {format(parseISO(event.end.dateTime), 'h:mm a')}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{event.description}</p>
                          )}
                          <Badge variant="outline" className={`mt-2 text-xs border-${color}-200 text-${color}-700 dark:border-${color}-800 dark:text-${color}-400`}>
                            {event.location || 'Meeting'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No events scheduled for today</p>
                    <p className="text-sm text-muted-foreground mt-1">Enjoy your free time!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Cards */}
          <div className="space-y-6">
            {/* Today's Progress */}
            <Card className="elevated-card border-0 hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground">Today's Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

            {/* Quick Links */}
            <Card className="elevated-card border-0 hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Zap className="w-5 h-5 text-accent" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a href="/tasks" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto p-3 text-left hover:bg-primary/5 hover:border-primary/20 transition-all hover:scale-105"
                  >
                    <div className="w-8 h-8 gradient-accent rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">View Tasks</div>
                      <div className="text-xs text-muted-foreground">{data?.tasks.pending || 0} pending tasks</div>
                    </div>
                  </Button>
                </a>

                <a href="/focus" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto p-3 text-left hover:bg-primary/5 hover:border-primary/20 transition-all hover:scale-105"
                  >
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                      <Timer className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">Start Focus</div>
                      <div className="text-xs text-muted-foreground">Begin deep work session</div>
                    </div>
                  </Button>
                </a>

                <a href="/mail" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto p-3 text-left hover:bg-primary/5 hover:border-primary/20 transition-all hover:scale-105"
                  >
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">Check Mail</div>
                      <div className="text-xs text-muted-foreground">{data?.emails.unread || 0} unread messages</div>
                    </div>
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

