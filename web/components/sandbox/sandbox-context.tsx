"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  buildSandboxDashboardData,
  mergeSandboxCalendarEvents,
  SANDBOX_EMAILS,
  SANDBOX_EXTRACTED_TASKS,
  SANDBOX_INITIAL_TASKS,
  SANDBOX_USER,
  type SandboxCalendarEvent,
  type SandboxEmail,
} from "@/lib/sandbox-data"
import type {
  SandboxFocusStats,
  SandboxFocusTimer,
  SandboxView,
  UITask,
} from "./sandbox-types"

const INITIAL_FOCUS_TIMER: SandboxFocusTimer = {
  isActive: false,
  isRunning: false,
  durationMinutes: 90,
  secondsRemaining: 90 * 60,
  title: "Focus Session",
  endAt: null,
  eventId: null,
}

const INITIAL_FOCUS_STATS: SandboxFocusStats = {
  todayMinutes: 45,
  sessionsToday: 1,
  completedToday: 1,
}

type SandboxContextValue = {
  isSandbox: true
  user: typeof SANDBOX_USER
  emails: SandboxEmail[]
  tasks: UITask[]
  mailExtracted: boolean
  extractingMail: boolean
  focusTimer: SandboxFocusTimer
  focusStats: SandboxFocusStats
  dynamicCalendarEvents: SandboxCalendarEvent[]
  dashboardData: ReturnType<typeof buildSandboxDashboardData>
  getCalendarEventsForWeek: (weekRef: Date) => SandboxCalendarEvent[]
  getTodaysFocusSessions: () => SandboxCalendarEvent[]
  navigate: (view: SandboxView) => void
  extractTasksFromMail: () => Promise<void>
  setTasks: React.Dispatch<React.SetStateAction<UITask[]>>
  startFocusSession: (durationMinutes: number, title: string) => void
  pauseFocusSession: () => void
  resumeFocusSession: () => void
  stopFocusSession: () => void
}

const SandboxContext = createContext<SandboxContextValue | null>(null)

export function useSandbox() {
  return useContext(SandboxContext)
}

function createFocusCalendarEvent(
  durationMinutes: number,
  title: string,
): SandboxCalendarEvent {
  const start = new Date()
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  const id = `focus-${start.getTime()}`

  return {
    id,
    summary: title.includes("Focus") ? title : `Focus Block — ${title}`,
    description: "Deep work session",
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    location: "Focus",
    calendarId: "google-primary",
    calendarName: "Alex Chen",
    htmlLink: "#",
  }
}

export function SandboxProvider({
  children,
  onNavigate,
}: {
  children: ReactNode
  onNavigate: (view: SandboxView) => void
}) {
  const [tasks, setTasks] = useState<UITask[]>(SANDBOX_INITIAL_TASKS)
  const [mailExtracted, setMailExtracted] = useState(false)
  const [extractingMail, setExtractingMail] = useState(false)
  const [focusTimer, setFocusTimer] = useState<SandboxFocusTimer>(INITIAL_FOCUS_TIMER)
  const [focusStats, setFocusStats] = useState<SandboxFocusStats>(INITIAL_FOCUS_STATS)
  const [dynamicCalendarEvents, setDynamicCalendarEvents] = useState<SandboxCalendarEvent[]>([])

  const extractTasksFromMail = useCallback(async () => {
    if (extractingMail || mailExtracted) return
    setExtractingMail(true)
    await new Promise((r) => setTimeout(r, 1400))
    setTasks((prev) => {
      const ids = new Set(prev.map((t) => t.id))
      const added = SANDBOX_EXTRACTED_TASKS.filter((t) => !ids.has(t.id))
      return [...prev, ...added]
    })
    setMailExtracted(true)
    setExtractingMail(false)
  }, [extractingMail, mailExtracted])

  const startFocusSession = useCallback((durationMinutes: number, title: string) => {
    const event = createFocusCalendarEvent(durationMinutes, title)
    const endAt = Date.now() + durationMinutes * 60 * 1000

    setDynamicCalendarEvents((prev) => [...prev, event])
    setFocusStats((prev) => ({
      ...prev,
      sessionsToday: prev.sessionsToday + 1,
    }))
    setFocusTimer({
      isActive: true,
      isRunning: true,
      durationMinutes,
      secondsRemaining: durationMinutes * 60,
      title: event.summary,
      endAt,
      eventId: event.id,
    })
  }, [])

  const pauseFocusSession = useCallback(() => {
    setFocusTimer((prev) => {
      if (!prev.isActive || !prev.isRunning) return prev
      const remaining = prev.endAt
        ? Math.max(0, Math.floor((prev.endAt - Date.now()) / 1000))
        : prev.secondsRemaining
      return {
        ...prev,
        isRunning: false,
        secondsRemaining: remaining,
        endAt: null,
      }
    })
  }, [])

  const resumeFocusSession = useCallback(() => {
    setFocusTimer((prev) => {
      if (!prev.isActive || prev.isRunning) return prev
      return {
        ...prev,
        isRunning: true,
        endAt: Date.now() + prev.secondsRemaining * 1000,
      }
    })
  }, [])

  const stopFocusSession = useCallback(() => {
    setFocusTimer((prev) => {
      if (prev.isActive && prev.durationMinutes > 0) {
        const elapsedMinutes = Math.max(
          0,
          prev.durationMinutes - Math.ceil(prev.secondsRemaining / 60),
        )
        if (elapsedMinutes > 0) {
          setFocusStats((stats) => ({
            ...stats,
            todayMinutes: stats.todayMinutes + elapsedMinutes,
            completedToday: stats.completedToday + 1,
          }))
        }
      }
      return { ...INITIAL_FOCUS_TIMER, durationMinutes: prev.durationMinutes, secondsRemaining: prev.durationMinutes * 60 }
    })
  }, [])

  useEffect(() => {
    if (!focusTimer.isRunning || !focusTimer.endAt) return

    const tick = () => {
      setFocusTimer((prev) => {
        if (!prev.isRunning || !prev.endAt) return prev
        const remaining = Math.max(0, Math.floor((prev.endAt - Date.now()) / 1000))
        if (remaining === 0) {
          setFocusStats((stats) => ({
            ...stats,
            todayMinutes: stats.todayMinutes + prev.durationMinutes,
            completedToday: stats.completedToday + 1,
          }))
          return {
            ...INITIAL_FOCUS_TIMER,
            durationMinutes: prev.durationMinutes,
            secondsRemaining: prev.durationMinutes * 60,
          }
        }
        return { ...prev, secondsRemaining: remaining }
      })
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [focusTimer.isRunning, focusTimer.endAt])

  const getCalendarEventsForWeek = useCallback(
    (weekRef: Date) => mergeSandboxCalendarEvents(weekRef, dynamicCalendarEvents),
    [dynamicCalendarEvents],
  )

  const getTodaysFocusSessions = useCallback(() => {
    const today = new Date()
    return dynamicCalendarEvents.filter((event) => {
      if (!event.start.dateTime) return false
      const start = new Date(event.start.dateTime)
      return (
        start.toDateString() === today.toDateString() &&
        (event.summary.toLowerCase().includes("focus") ||
          event.location?.toLowerCase() === "focus")
      )
    })
  }, [dynamicCalendarEvents])

  const dashboardData = useMemo(
    () => buildSandboxDashboardData(tasks, focusTimer, focusStats, dynamicCalendarEvents),
    [tasks, focusTimer, focusStats, dynamicCalendarEvents],
  )

  const value = useMemo<SandboxContextValue>(
    () => ({
      isSandbox: true,
      user: SANDBOX_USER,
      emails: SANDBOX_EMAILS,
      tasks,
      mailExtracted,
      extractingMail,
      focusTimer,
      focusStats,
      dynamicCalendarEvents,
      dashboardData,
      getCalendarEventsForWeek,
      getTodaysFocusSessions,
      navigate: onNavigate,
      extractTasksFromMail,
      setTasks,
      startFocusSession,
      pauseFocusSession,
      resumeFocusSession,
      stopFocusSession,
    }),
    [
      tasks,
      mailExtracted,
      extractingMail,
      focusTimer,
      focusStats,
      dynamicCalendarEvents,
      dashboardData,
      getCalendarEventsForWeek,
      getTodaysFocusSessions,
      onNavigate,
      extractTasksFromMail,
      startFocusSession,
      pauseFocusSession,
      resumeFocusSession,
      stopFocusSession,
    ],
  )

  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>
}
