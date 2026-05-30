"use client"

import { useMemo, useState } from "react"
import {
  Flame,
  Pause,
  Play,
  Square,
  Target,
  Timer,
  TrendingUp,
  Zap,
  Calendar as CalendarIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { PageHeader } from "@/components/page-header"
import { useSandbox } from "@/components/sandbox/sandbox-context"
import { mergeSandboxCalendarEvents } from "@/lib/sandbox-data"
import { cn } from "@/lib/utils"

const focusPresets = [
  { name: "Quick Focus", duration: 25, icon: Zap },
  { name: "Deep Work", duration: 90, icon: Flame },
  { name: "Power Hour", duration: 60, icon: Target },
  { name: "Extended", duration: 120, icon: TrendingUp },
]

const RING_RADIUS = 54
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export function SandboxFocusView() {
  const sandbox = useSandbox()
  const [customDuration, setCustomDuration] = useState([90])

  if (!sandbox) return null

  const { focusTimer, focusStats, dashboardData } = sandbox
  const progress = focusTimer.durationMinutes
    ? Math.min(
        100,
        Math.max(
          0,
          ((focusTimer.durationMinutes * 60 - focusTimer.secondsRemaining) /
            (focusTimer.durationMinutes * 60)) *
            100,
        ),
      )
    : 0
  const ringOffset = RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE

  const todaysSessions = useMemo(() => {
    const today = new Date()
    return mergeSandboxCalendarEvents(today, sandbox.dynamicCalendarEvents).filter((event) => {
      if (!event.start.dateTime) return false
      const start = new Date(event.start.dateTime)
      return (
        start.toDateString() === today.toDateString() &&
        (event.summary.toLowerCase().includes("focus") ||
          event.location?.toLowerCase() === "focus")
      )
    })
  }, [sandbox.dynamicCalendarEvents])

  const handlePlayPause = () => {
    if (!focusTimer.isActive) {
      sandbox.startFocusSession(customDuration[0], "Focus Session")
      return
    }
    if (focusTimer.isRunning) {
      sandbox.pauseFocusSession()
    } else {
      sandbox.resumeFocusSession()
    }
  }

  const startPreset = (name: string, duration: number) => {
    if (focusTimer.isActive) sandbox.stopFocusSession()
    sandbox.startFocusSession(duration, `${name} Session`)
  }

  return (
    <div className="cf-page-shell">
      <div className="cf-page-inner space-y-5">
        <PageHeader
          eyebrow="Focus"
          title="Focus mode"
          subtitle="Block time on your calendar and stay in deep work — demo uses sample data"
          actions={
            <Badge
              variant="outline"
              className={cn(
                focusTimer.isRunning &&
                  "border-[rgba(var(--cf-accent-rgb),0.4)] bg-[var(--cf-accent-soft)]",
              )}
            >
              {focusTimer.isRunning
                ? "Session active"
                : focusTimer.isActive
                  ? "Paused"
                  : "Ready"}
            </Badge>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="cf-stat-card">
            <p className="cf-stat-card-label">Sessions today</p>
            <p className="cf-stat-card-value">{focusStats.sessionsToday}</p>
          </div>
          <div className="cf-stat-card">
            <p className="cf-stat-card-label">Completed</p>
            <p className="cf-stat-card-value">{focusStats.completedToday}</p>
          </div>
          <div className="cf-stat-card">
            <p className="cf-stat-card-label">Focus time</p>
            <p className="cf-stat-card-value">
              {Math.floor(dashboardData.focus.todayMinutes / 60)}h{" "}
              {dashboardData.focus.todayMinutes % 60}m
            </p>
          </div>
        </div>

        <div className="cf-workspace-grid">
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
                  <span className="cf-timer-display">
                    {formatTime(focusTimer.secondsRemaining)}
                  </span>
                  <span className="mt-2 text-xs text-[var(--cf-text-muted)]">
                    {focusTimer.isActive
                      ? `${focusTimer.durationMinutes} min session`
                      : `${customDuration[0]} min ready`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="lg"
                  onClick={handlePlayPause}
                  className={cn("min-w-[120px] gap-2", !focusTimer.isRunning && "cf-btn-primary")}
                  variant={focusTimer.isRunning ? "outline" : "default"}
                >
                  {focusTimer.isRunning ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {focusTimer.isRunning
                    ? "Pause"
                    : focusTimer.isActive
                      ? "Resume"
                      : "Start"}
                </Button>
                {focusTimer.isActive && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => sandbox.stopFocusSession()}
                    className="gap-2"
                  >
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
                      onClick={() => startPreset(preset.name, preset.duration)}
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
                  onClick={() => startPreset("Custom", customDuration[0])}
                  variant="outline"
                  className="w-full"
                >
                  Start custom session
                </Button>
              </div>
            </div>
          </div>

          <div className="cf-panel flex flex-col lg:sticky lg:top-[calc(65px+1.25rem)] lg:max-h-[calc(100dvh-8rem)]">
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
                  const start = new Date(session.start.dateTime!)
                  const end = new Date(session.end.dateTime!)
                  const now = new Date()
                  const isCompleted = end < now
                  const isActive =
                    sandbox.focusTimer.eventId === session.id && sandbox.focusTimer.isRunning
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
