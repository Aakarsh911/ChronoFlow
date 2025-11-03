"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, Target, Users, BarChart3, Plus, Sparkles, Zap, TrendingUp, CheckCircle, ArrowRight, Timer, Activity, Mail, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { format, isToday, parseISO } from "date-fns"

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
      const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED')
      const overdueTasks = tasks.filter((t: any) => {
        if (!t.dueDate || t.status === 'COMPLETED') return false
        return new Date(t.dueDate) < new Date()
      })

      let focusMinutes = 0
      if (focusData.active && focusData.start) {
        const startTime = new Date(focusData.start.dateTime)
        const now = new Date()
        focusMinutes = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 60000))
      }

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
          todayMinutes: focusMinutes,
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

  const StatCard = ({ icon: Icon, title, value, subtitle, gradient, badge, isLoading: loading }: any) => (
    <div className="glass-morphism-card p-6 rounded-2xl hover:scale-105 transition-all duration-300 group cursor-pointer">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 bg-white/20" />
          <Skeleton className="h-8 w-20 bg-white/20" />
          <Skeleton className="h-3 w-32 bg-white/20" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-14 h-14 rounded-2xl ${gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            {badge}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{title}</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              {value}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{subtitle}</p>
          </div>
        </>
      )}
    </div>
  )

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
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2">
          <div className="glass-morphism-card p-6 rounded-3xl flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-3">
              {getGreeting()}, {user?.name?.split(" ")[0] || "there"} 👋
            </h1>
            {isLoading ? (
              <Skeleton className="h-5 w-96 bg-white/20" />
            ) : (
              <p className="text-slate-600 dark:text-slate-300 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                {data?.tasks.completed || 0} tasks completed • {data?.calendar.todayEvents.length || 0} events today • {data?.emails.unread || 0} unread emails
              </p>
            )}
          </div>
          <Button 
            className="glass-morphism-card border-0 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 h-auto py-4 px-6 rounded-2xl hover:scale-105"
            onClick={fetchDashboardData}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 mr-2" />Refresh</>}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Timer}
            title="Focus Time"
            value={data?.focus.todayMinutes ? formatTime(data.focus.todayMinutes) : '0m'}
            subtitle={data?.focus.isActive ? '🎯 Deep work in progress' : '💤 No active session'}
            gradient={data?.focus.isActive ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/50' : 'bg-slate-200/50 dark:bg-slate-700/50'}
            badge={data?.focus.isActive && (
              <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Active</span>
                </div>
              </div>
            )}
            isLoading={isLoading}
          />
          <StatCard
            icon={CheckCircle}
            title="Tasks"
            value={`${data?.tasks.completed || 0}/${data?.tasks.total || 0}`}
            subtitle={`${data?.tasks.pending || 0} remaining${data?.tasks.overdue ? ` • ${data.tasks.overdue} overdue` : ''}`}
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/50"
            isLoading={isLoading}
          />
          <StatCard
            icon={Calendar}
            title="Next Meeting"
            value={data?.calendar.nextMeeting ? format(parseISO(data.calendar.nextMeeting.start.dateTime), 'h:mm a') : '—'}
            subtitle={data?.calendar.nextMeeting ? data.calendar.nextMeeting.summary : 'No meetings today'}
            gradient="bg-gradient-to-br from-violet-500 to-purple-500 shadow-violet-500/50"
            badge={data?.calendar.todayEvents.length > 0 && (
              <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50">
                {data.calendar.todayEvents.length} events
              </Badge>
            )}
            isLoading={isLoading}
          />
          <StatCard
            icon={BarChart3}
            title="Analytics"
            value="Coming Soon"
            subtitle="Productivity insights"
            gradient="bg-gradient-to-br from-orange-500 to-pink-500 shadow-orange-500/50"
            badge={<Badge className="bg-gradient-to-r from-orange-400 to-pink-400 text-white border-0"><Sparkles className="w-3 h-3 mr-1" />AI</Badge>}
            isLoading={isLoading}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule */}
          <div className="lg:col-span-2 glass-morphism-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Today's Schedule</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {isLoading ? 'Loading...' : data?.calendar.todayEvents.length ? `${data.calendar.todayEvents.length} events today` : 'No events'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                [1,2,3].map(i => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/30 dark:bg-white/5">
                    <Skeleton className="w-1 h-16 rounded-full bg-white/30" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32 bg-white/30" />
                      <Skeleton className="h-4 w-full bg-white/30" />
                    </div>
                  </div>
                ))
              ) : data?.calendar.todayEvents.length ? (
                data.calendar.todayEvents.map((event: any, i: number) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-colors group">
                    <div className={`w-1 h-16 rounded-full ${['bg-purple-500', 'bg-blue-500', 'bg-pink-500'][i % 3]}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-slate-800 dark:text-white">{event.summary}</h3>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {format(parseISO(event.start.dateTime), 'h:mm a')}
                        </span>
                      </div>
                      {event.description && <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{event.description}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No events today</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress */}
            <div className="glass-morphism-card p-6 rounded-2xl">
              <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">Today's Progress</h3>
              <div className="space-y-4">
                {[
                  { label: 'Focus Time', value: data?.focus.todayMinutes ? formatTime(data.focus.todayMinutes) : '0m', progress: Math.min((data?.focus.todayMinutes || 0) / 480 * 100, 100), color: 'from-purple-500 to-pink-500' },
                  { label: 'Tasks', value: `${data?.tasks.completed || 0}/${data?.tasks.total || 0}`, progress: data?.tasks.total ? (data.tasks.completed / data.tasks.total) * 100 : 0, color: 'from-blue-500 to-cyan-500' },
                  { label: 'Events', value: `${data?.calendar.todayEvents.length || 0}`, progress: Math.min((data?.calendar.todayEvents.length || 0) * 25, 100), color: 'from-violet-500 to-purple-500' },
                  { label: 'Emails', value: `${data?.emails.unread || 0} unread`, progress: Math.min((data?.emails.unread || 0) / 50 * 100, 100), color: 'from-orange-500 to-pink-500' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{item.value}</span>
                    </div>
                    <div className="h-2 bg-white/30 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.progress}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="glass-morphism-card p-6 rounded-2xl">
              <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {[
                  { href: '/tasks', icon: Target, label: 'View Tasks', subtitle: `${data?.tasks.pending || 0} pending`, gradient: 'from-blue-500 to-cyan-500' },
                  { href: '/focus', icon: Timer, label: 'Start Focus', subtitle: 'Begin deep work', gradient: 'from-purple-500 to-pink-500' },
                  { href: '/mail', icon: Mail, label: 'Check Mail', subtitle: `${data?.emails.unread || 0} unread`, gradient: 'from-orange-500 to-pink-500' },
                ].map((link, i) => (
                  <a key={i} href={link.href}>
                    <button className="w-full p-3 rounded-xl bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-all hover:scale-105 flex items-center gap-3 group">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <link.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-800 dark:text-white text-sm">{link.label}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{link.subtitle}</p>
                      </div>
                    </button>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

