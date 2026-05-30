export type UITask = {
  id: string
  title: string
  description: string | null
  source: string
  sourceId: string | null
  status: string
  priority: string | null
  dueDate: string | null
  url: string | null
  sourceData: unknown
}

export type SandboxView =
  | "dashboard"
  | "mail"
  | "tasks"
  | "calendar"
  | "focus"
  | "team"
  | "analytics"

export type SandboxFocusTimer = {
  isActive: boolean
  isRunning: boolean
  durationMinutes: number
  secondsRemaining: number
  title: string
  endAt: number | null
  eventId: string | null
}

export type SandboxFocusStats = {
  todayMinutes: number
  sessionsToday: number
  completedToday: number
}
