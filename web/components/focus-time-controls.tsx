"use client"

import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/store/store"
import {
  startTimer as startTimerAction,
  pauseTimer as pauseTimerAction,
  stopTimer as stopTimerAction,
  setEventId as setEventIdAction,
} from "@/store/focusTimerSlice"
import {
  Play,
  Pause,
  Square,
  Timer,
  Zap,
  TrendingUp,
  Target,
  Flame,
  Calendar as CalendarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { PageHeader } from "@/components/page-header"
import { cn } from "@/lib/utils"

const focusPresets = [
  { name: "Quick Focus", duration: 25, icon: Zap },
  { name: "Deep Work", duration: 90, icon: Flame },
  { name: "Power Hour", duration: 60, icon: Target },
  { name: "Extended", duration: 120, icon: TrendingUp },
]

const RING_RADIUS = 54
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

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

  useEffect(() => {
    fetchTodaysSessions()
  }, [])

  const fetchTodaysSessions = async () => {
    try {
      const res = await fetch("/api/calendar")
      if (!res.ok) return

      const data = await res.json()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const focusEvents = (data.events || []).filter((event: any) => {
        if (!event.start?.dateTime) return false
        const eventDate = new Date(event.start.dateTime)
        eventDate.setHours(0, 0, 0, 0)
        return (
          eventDate.getTime() === today.getTime() &&
          (event.summary?.toLowerCase().includes("focus") ||
            event.summary?.toLowerCase().includes("deep work"))
        )
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
    } catch (error) {
      console.error("Error fetching today's sessions:", error)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    const tick = () => {
      if (isRunning && endTimestamp) {
        const remaining = Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000))
        setTimeRemaining(remaining)
        if (remaining === 0) handleStop()
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

  useEffect(() => {
    const hydrate = async () => {
      if (storeIsActive) {
        if (isRunning && storeEndAt && Date.now() < storeEndAt) {
          const remaining = Math.max(0, Math.floor((storeEndAt - Date.now()) / 1000))
          const duration = Math.floor((storeEndAt - (storeStartAt || Date.now())) / 60000)
          setTimeRemaining(remaining)
          setSessionDuration(duration)
          setEndTimestamp(storeEndAt)
        } else if (!isRunning && typeof storePausedRemaining === "number") {
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

  const progress = hydrated ? getProgressPercentage() : 0

  function getProgressPercentage() {
    const totalSeconds = sessionDuration * 60
    const elapsed = totalSeconds - timeRemaining
    return Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100))
  }

  const ringOffset = RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE

  const handlePlayPause = async () => {
    if (!isRunning) {
      const remainingSec = endTimestamp
        ? Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000))
        : timeRemaining
      const duration = Math.max(1, Math.ceil(remainingSec / 60))
      try {
        if (focusEventId) {
          try {
            await fetch("/api/focus/stop", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ eventId: focusEventId }),
            })
          } catch {}
          dispatch(setEventIdAction(null))
        }

        const res = await fetch("/api/focus/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationMinutes: duration,
            title: "Focus Block",
            description: storeTitle || "Deep work session",
          }),
        })
        if (res.ok) {
          const data = await res.json()
          dispatch(setEventIdAction(data.eventId))
          dispatch(
            startTimerAction({
              durationMinutes: duration,
              title: data.title ?? "Focus Session",
              eventId: data.eventId,
            }),
          )
          setTimeRemaining(remainingSec)
          fetchTodaysSessions()
        }
      } catch (e) {
        console.error("Error creating focus block", e)
      }
      return
    }

    dispatch(pauseTimerAction())
    if (focusEventId) {
      try {
        await fetch("/api/focus/stop", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: focusEventId }),
        })
      } catch (e) {
        console.error("Error ending focus block on pause", e)
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
        await fetch("/api/focus/stop", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: focusEventId }),
        })
      } catch (e) {
        console.error("Error ending focus block", e)
      } finally {
        dispatch(setEventIdAction(null))
      }
    }

    fetchTodaysSessions()
  }

  const startNewSession = async (preset: string, duration: number) => {
    if (focusEventId) {
      try {
        await fetch("/api/focus/stop", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: focusEventId }),
        })
      } catch (e) {
        console.error("Error ending previous focus block", e)
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
      const res = await fetch("/api/focus/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: duration,
          title: "Focus Block",
          description: `${preset} focus session`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        dispatch(setEventIdAction(data.eventId))
        setEndTimestamp(Date.now() + duration * 60 * 1000)
        fetchTodaysSessions()
      }
    } catch (e) {
      console.error("Error creating focus block event", e)
    }
  }

  return (
    <div className="cf-page-shell">
      <div className="cf-page-inner space-y-5">
        <PageHeader
          eyebrow="Focus"
          title="Focus mode"
          subtitle="Block time on your calendar and stay in deep work"
          actions={
            <Badge
              variant="outline"
              className={cn(isRunning && "border-[rgba(var(--cf-accent-rgb),0.4)] bg-[var(--cf-accent-soft)]")}
            >
              {isRunning ? "Session active" : storeIsActive ? "Paused" : "Ready"}
            </Badge>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="cf-stat-card">
            <p className="cf-stat-card-label">Sessions today</p>
            <p className="cf-stat-card-value">{stats.totalToday}</p>
          </div>
          <div className="cf-stat-card">
            <p className="cf-stat-card-label">Completed</p>
            <p className="cf-stat-card-value">{stats.completedToday}</p>
          </div>
          <div className="cf-stat-card">
            <p className="cf-stat-card-label">Focus time</p>
            <p className="cf-stat-card-value">
              {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
            </p>
          </div>
        </div>

        <div className="cf-workspace-grid">
          {/* Main timer workspace */}
          <div className="cf-panel">
            <div className="cf-panel-body flex flex-col items-center py-8 sm:py-10">
              <div className="cf-timer-ring-wrap mb-8">
                <svg viewBox="0 0 120 120" aria-hidden>
                  <circle className="cf-timer-ring-bg" cx="60" cy="60" r={RING_RADIUS} />
                  <circle
                    className="cf-timer-ring-progress"
                    cx="60"
                    cy="60"
                    r={RING_RADIUS}
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="cf-timer-center">
                  <span className="cf-timer-display">{hydrated ? formatTime(timeRemaining) : "—:—"}</span>
                  <span className="mt-2 text-xs text-[var(--cf-text-muted)]">
                    {hydrated ? `${sessionDuration} min session` : "Loading…"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="lg"
                  onClick={handlePlayPause}
                  className={cn("min-w-[120px] gap-2", !isRunning && "cf-btn-primary")}
                  variant={isRunning ? "outline" : "default"}
                >
                  {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isRunning ? "Pause" : "Start"}
                </Button>
                {storeIsActive && (
                  <Button variant="outline" size="lg" onClick={handleStop} className="gap-2">
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--cf-border)] px-4 py-4 sm:px-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--cf-text-dim)]">
                Quick start
              </p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {focusPresets.map((preset) => {
                  const Icon = preset.icon
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => startNewSession(preset.name, preset.duration)}
                      className="cf-preset-btn"
                    >
                      <Icon className="mb-1 h-4 w-4 text-[rgba(var(--cf-accent-rgb),1)]" />
                      <span className="text-sm font-medium text-[var(--cf-text)]">{preset.name}</span>
                      <span className="text-xs text-[var(--cf-text-muted)]">{preset.duration} min</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--cf-text)]">Custom duration</span>
                  <span className="text-sm font-semibold tabular-nums text-[var(--cf-text)]">
                    {customDuration[0]} min
                  </span>
                </div>
                <Slider
                  value={customDuration}
                  onValueChange={setCustomDuration}
                  max={180}
                  min={15}
                  step={15}
                  className="mb-4"
                />
                <Button
                  onClick={() => startNewSession("Custom", customDuration[0])}
                  variant="outline"
                  className="w-full"
                >
                  Start custom session
                </Button>
              </div>
            </div>
          </div>

          {/* Today's sessions sidebar */}
          <div className="cf-panel flex flex-col lg:sticky lg:top-[calc(57px+1.25rem)] lg:max-h-[calc(100dvh-8rem)]">
            <div className="cf-panel-header">
              <div>
                <p className="cf-panel-title">Today&apos;s sessions</p>
                <p className="cf-panel-subtitle">
                  {todaysSessions.length === 0
                    ? "No blocks scheduled yet"
                    : `${todaysSessions.length} on your calendar`}
                </p>
              </div>
              <CalendarIcon className="h-4 w-4 text-[rgba(var(--cf-accent-rgb),1)]" />
            </div>

            <div className="cf-panel-body-flush min-h-[280px] flex-1 overflow-y-auto">
              {todaysSessions.length === 0 ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
                  <Timer className="mb-3 h-10 w-10 text-[var(--cf-text-dim)] opacity-40" />
                  <p className="text-sm font-medium text-[var(--cf-text)]">No focus blocks yet</p>
                  <p className="mt-1 text-xs text-[var(--cf-text-muted)]">
                    Start a session to block time on your calendar
                  </p>
                </div>
              ) : (
                todaysSessions.map((session, index) => {
                  const start = new Date(session.start?.dateTime)
                  const end = new Date(session.end?.dateTime)
                  const now = new Date()
                  const isCompleted = end < now
                  const isActive = start <= now && end > now
                  const duration = Math.round((end.getTime() - start.getTime()) / 60000)

                  return (
                    <div
                      key={session.id || index}
                      className={cn("cf-session-row", isActive && "bg-[var(--cf-accent-soft)]")}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          isActive && "bg-[rgba(var(--cf-accent-rgb),1)]",
                          isCompleted && "bg-[var(--cf-text-dim)]",
                          !isActive && !isCompleted && "bg-[rgba(var(--cf-primary-rgb),1)]",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium text-[var(--cf-text)]">
                            {session.summary || "Focus session"}
                          </p>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {isActive ? "Live" : isCompleted ? "Done" : "Upcoming"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--cf-text-muted)]">
                          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="mt-1 text-xs text-[var(--cf-text-dim)]">{duration} min</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
