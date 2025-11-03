"use client"

import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/store"
import { startTimer as startTimerAction, resumeTimer as resumeTimerAction, pauseTimer as pauseTimerAction, stopTimer as stopTimerAction, setEventId as setEventIdAction } from "@/store/focusTimerSlice"
import {
  Play,
  Pause,
  Square,
  Clock,
  Timer,
  Zap,
  TrendingUp,
  Target,
  Flame,
  CheckCircle2,
  Calendar as CalendarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const focusPresets = [
  { name: "Quick Focus", duration: 25, icon: Zap, color: "from-orange-500 to-amber-500" },
  { name: "Deep Work", duration: 90, icon: Flame, color: "from-red-500 to-pink-500" },
  { name: "Power Hour", duration: 60, icon: Target, color: "from-purple-500 to-indigo-500" },
  { name: "Extended", duration: 120, icon: TrendingUp, color: "from-blue-500 to-cyan-500" },
]

export function FocusTimeControls() {
  const dispatch = useAppDispatch()
  const {
    isActive: storeIsActive,
    isRunning,
    eventId: storeEventId,
    title: storeTitle,
    startAt: storeStartAt,
    endAt: storeEndAt,
    pausedRemaining: storePausedRemaining,
  } = useAppSelector((s) => s.focusTimer)
  
  const [timeRemaining, setTimeRemaining] = useState(60 * 60)
  const [customDuration, setCustomDuration] = useState([90])
  const [sessionDuration, setSessionDuration] = useState(90)
  const focusEventId = (storeEventId as string | null) ?? null
  const [hydrated, setHydrated] = useState(false)
  const [endTimestamp, setEndTimestamp] = useState<number | null>(null)
  const [todaysSessions, setTodaysSessions] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalToday: 0,
    completedToday: 0,
    totalMinutes: 0,
  })

  // Fetch today's focus sessions
  useEffect(() => {
    fetchTodaysSessions()
  }, [])

  const fetchTodaysSessions = async () => {
    try {
      // Fetch from calendar API
      const res = await fetch('/api/calendar')
      if (res.ok) {
        const data = await res.json()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Filter focus blocks from today
        const focusEvents = (data.events || []).filter((event: any) => {
          if (!event.start?.dateTime) return false
          const eventDate = new Date(event.start.dateTime)
          eventDate.setHours(0, 0, 0, 0)
          return eventDate.getTime() === today.getTime() && 
                 (event.summary?.toLowerCase().includes('focus') || 
                  event.summary?.toLowerCase().includes('deep work'))
        })

        const now = new Date()
        const completedSessions = focusEvents.filter((e: any) => new Date(e.end?.dateTime) < now)
        const totalMinutes = focusEvents.reduce((acc: number, e: any) => {
          const start = new Date(e.start.dateTime).getTime()
          const end = new Date(e.end.dateTime).getTime()
          return acc + Math.round((end - start) / 60000)
        }, 0)

        setTodaysSessions(focusEvents)
        setStats({
          totalToday: focusEvents.length,
          completedToday: completedSessions.length,
          totalMinutes,
        })
      }
    } catch (error) {
      console.error('Error fetching today\'s sessions:', error)
    }
  }

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    const tick = () => {
      if (isRunning && endTimestamp) {
        const now = Date.now()
        const remaining = Math.max(0, Math.floor((endTimestamp - now) / 1000))
        setTimeRemaining(remaining)
        if (remaining === 0) {
          handleStop()
        }
      }
    }
    if (isRunning && endTimestamp) {
      tick()
      interval = setInterval(tick, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, endTimestamp])

  // Hydrate from store
  useEffect(() => {
    const hydrate = async () => {
      if (storeIsActive) {
        if (isRunning && storeEndAt && Date.now() < storeEndAt) {
          const remaining = Math.max(0, Math.floor((storeEndAt - Date.now()) / 1000))
          const duration = Math.floor((storeEndAt - (storeStartAt || Date.now())) / 60000)
          setTimeRemaining(remaining)
          setSessionDuration(duration)
          setEndTimestamp(storeEndAt)
        } else if (!isRunning && typeof storePausedRemaining === 'number') {
          setTimeRemaining(storePausedRemaining)
          setEndTimestamp(null)
        }
      }
      setHydrated(true)
    }
    hydrate()
  }, [])

  useEffect(() => {
    setEndTimestamp(storeEndAt ?? null)
  }, [storeEndAt])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const getProgressPercentage = () => {
    const totalSeconds = sessionDuration * 60
    const elapsed = totalSeconds - timeRemaining
    return Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100))
  }

  const handlePlayPause = async () => {
    if (!isRunning) {
      const remainingSec = endTimestamp ? Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000)) : timeRemaining
      const duration = Math.max(1, Math.ceil(remainingSec / 60))
      try {
        if (focusEventId) {
          try {
            await fetch('/api/focus/stop', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ eventId: focusEventId })
            })
          } catch {}
          dispatch(setEventIdAction(null))
        }

        const res = await fetch('/api/focus/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationMinutes: duration, title: 'Focus Block', description: storeTitle || 'Deep work session' })
        })
        if (res.ok) {
          const data = await res.json()
          dispatch(setEventIdAction(data.eventId))
          dispatch(startTimerAction({ durationMinutes: duration, title: data.title ?? 'Focus Session', eventId: data.eventId }))
          setTimeRemaining(remainingSec)
          fetchTodaysSessions()
        }
      } catch (e) {
        console.error('Error creating focus block', e)
      }
      return
    }

    dispatch(pauseTimerAction())
    if (focusEventId) {
      try {
        await fetch('/api/focus/stop', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: focusEventId })
        })
      } catch (e) {
        console.error('Error ending focus block on pause', e)
      } finally {
        dispatch(setEventIdAction(null))
      }
    }
  }

  const handleStop = async () => {
    setTimeRemaining(sessionDuration * 60)
    setEndTimestamp(null)
    dispatch(stopTimerAction())

    if (focusEventId) {
      try {
        await fetch('/api/focus/stop', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: focusEventId })
        })
      } catch (e) {
        console.error('Error ending focus block', e)
      } finally {
        dispatch(setEventIdAction(null))
      }
    }
    
    fetchTodaysSessions()
  }

  const startNewSession = async (preset: string, duration: number) => {
    if (focusEventId) {
      try {
        await fetch('/api/focus/stop', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: focusEventId })
        })
      } catch (e) {
        console.error('Error ending previous focus block', e)
      } finally {
        dispatch(stopTimerAction())
        dispatch(setEventIdAction(null))
      }
    }

    setTimeRemaining(duration * 60)
    setSessionDuration(duration)
    setEndTimestamp(Date.now() + duration * 60 * 1000)
    dispatch(startTimerAction({ durationMinutes: duration, title: `${preset} Session` }))

    try {
      const res = await fetch('/api/focus/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: duration, title: 'Focus Block', description: `${preset} focus session` })
      })
      if (res.ok) {
        const data = await res.json()
        dispatch(setEventIdAction(data.eventId))
        setEndTimestamp(Date.now() + duration * 60 * 1000)
        fetchTodaysSessions()
      }
    } catch (e) {
      console.error('Error creating focus block event', e)
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Subtle Warm Background */}
      <div className="focus-blob-bg">
        <div className="focus-blob focus-blob-1"></div>
        <div className="focus-blob focus-blob-2"></div>
        <div className="focus-blob focus-blob-3"></div>
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 dark:from-orange-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
            Focus Mode
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Deep work sessions for maximum productivity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl relative group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-sm">
                  <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
                    {stats.totalToday}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">Sessions Today</div>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl relative group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    {stats.completedToday}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">Completed</div>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl relative group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">Total Time</div>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Active Session Card */}
        <Card className="glass-card border-0 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Timer Display */}
              <div>
                <div className="text-7xl font-mono font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 dark:from-orange-400 dark:via-red-400 dark:to-pink-400 bg-clip-text text-transparent mb-4">
                  {hydrated ? formatTime(timeRemaining) : "—:—"}
                </div>
                <Badge 
                  variant={isRunning ? "default" : "secondary"} 
                  className={cn(
                    "text-sm px-4 py-1",
                    isRunning && "bg-gradient-to-r from-green-500 to-emerald-500 text-white animate-pulse"
                  )}
                >
                  {isRunning ? "In Focus" : "Ready"}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="max-w-2xl mx-auto space-y-2">
                <Progress value={hydrated ? getProgressPercentage() : 0} className="h-3" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {hydrated ? `${sessionDuration} minute session` : "Select a focus duration below"}
                </p>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  onClick={handlePlayPause}
                  className={cn(
                    "gap-2 px-8 py-6 text-lg font-semibold",
                    isRunning 
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" 
                      : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  )}
                >
                  {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {isRunning ? "Pause" : "Start"}
                </Button>
                {storeIsActive && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={handleStop}
                    className="gap-2 px-8 py-6 text-lg font-semibold bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800/80"
                  >
                    <Square className="w-5 h-5" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Presets */}
        <Card className="glass-card border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quick Start</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">Choose a preset or customize your session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {focusPresets.map((preset) => {
                const Icon = preset.icon
                return (
                  <button
                    key={preset.name}
                    onClick={() => startNewSession(preset.name, preset.duration)}
                    className="group relative p-6 rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-white/30 dark:border-slate-700/30 hover:scale-105 transition-all duration-300 hover:shadow-xl"
                  >
                    <div className={cn(
                      "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300",
                      preset.color
                    )} />
                    <div className="relative space-y-3">
                      <div className={cn("w-12 h-12 mx-auto rounded-xl bg-gradient-to-br flex items-center justify-center", preset.color)}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{preset.name}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{preset.duration} minutes</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Custom Duration */}
            <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-white/30 dark:border-slate-700/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Custom Duration</label>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{customDuration[0]} min</span>
                </div>
                <Slider
                  value={customDuration}
                  onValueChange={setCustomDuration}
                  max={180}
                  min={15}
                  step={15}
                  className="w-full"
                />
                <Button
                  onClick={() => startNewSession("Custom", customDuration[0])}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold"
                >
                  Start {customDuration[0]} Minute Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Sessions */}
        <Card className="glass-card border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              <CalendarIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              Today's Focus Sessions
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              {todaysSessions.length === 0 ? "No sessions yet today - start your first one!" : `${todaysSessions.length} session${todaysSessions.length !== 1 ? 's' : ''} today`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 mb-4">
                  <Timer className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">No focus sessions yet</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Start your first focus session using the presets above
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysSessions.map((session, index) => {
                  const start = new Date(session.start?.dateTime)
                  const end = new Date(session.end?.dateTime)
                  const now = new Date()
                  const isCompleted = end < now
                  const isActive = start <= now && end > now
                  const duration = Math.round((end.getTime() - start.getTime()) / 60000)

                  return (
                    <div
                      key={session.id || index}
                      className={cn(
                        "relative p-5 rounded-xl backdrop-blur-sm border transition-all duration-200",
                        isActive && "bg-green-500/10 border-green-300 dark:border-green-700",
                        isCompleted && "bg-slate-500/10 border-slate-300 dark:border-slate-700",
                        !isActive && !isCompleted && "bg-blue-500/10 border-blue-300 dark:border-blue-700"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full mt-1.5",
                            isActive && "bg-green-500 animate-pulse",
                            isCompleted && "bg-slate-400",
                            !isActive && !isCompleted && "bg-blue-500"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 dark:text-slate-100">{session.summary || 'Focus Session'}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <Badge
                              variant={isActive ? "default" : "secondary"}
                              className={cn(
                                "text-xs",
                                isActive && "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
                                isCompleted && "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                              )}
                            >
                              {isActive ? "Active" : isCompleted ? "Completed" : "Upcoming"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">{duration} min</span>
                            </div>
                            {isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
