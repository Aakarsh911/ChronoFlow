import { addDays, endOfWeek, isSameDay, startOfWeek } from "date-fns"

import type { SandboxFocusStats, SandboxFocusTimer, UITask } from "@/components/sandbox/sandbox-types"

export type SandboxEmail = {
  id: string
  subject: string
  from: { name: string; address: string }
  receivedDateTime: string
  bodyPreview: string
  isRead: boolean
  hasAttachments: boolean
  importance?: "low" | "normal" | "high"
  isStarred?: boolean
  provider: "gmail" | "outlook"
  bodyText?: string
}

export const SANDBOX_USER = { name: "Alex Chen", email: "alex@acme.dev" }

export const SANDBOX_EMAILS: SandboxEmail[] = [
  {
    id: "mail-1",
    subject: "Re: Safari login timeout — rollback plan needed",
    from: { name: "Alex Rivera", address: "alex@acme.dev" },
    receivedDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    bodyPreview:
      "Can you review the rollback plan for the Safari session timeout? We need sign-off before Friday's deploy.",
    isRead: false,
    hasAttachments: false,
    importance: "high",
    provider: "gmail",
    bodyText:
      "Hey — the Safari idle timeout is still reproducing in staging. Can you review the rollback plan and confirm by Friday EOD? Alex",
  },
  {
    id: "mail-2",
    subject: "PR review: auth refactor (#842)",
    from: { name: "Jordan Kim", address: "jordan@acme.dev" },
    receivedDateTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    bodyPreview: "When you get a chance, could you review the auth refactor PR? Blocking merge for sprint demo.",
    isRead: true,
    hasAttachments: false,
    importance: "normal",
    provider: "outlook",
  },
  {
    id: "mail-3",
    subject: "[Jira] ENG-1284 assigned to you",
    from: { name: "Jira", address: "jira@acme.dev" },
    receivedDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    bodyPreview: "ENG-1284 Login times out on Safari after 60s idle — Priority: High",
    isRead: true,
    hasAttachments: false,
    provider: "gmail",
  },
]

export const SANDBOX_INITIAL_TASKS: UITask[] = [
  {
    id: "task-1",
    title: "Prep sprint demo slides",
    description: "Outline shipped items for Thursday demo",
    source: "MANUAL",
    sourceId: null,
    status: "Done",
    priority: "Low",
    dueDate: null,
    url: null,
    sourceData: null,
  },
]

export const SANDBOX_EXTRACTED_TASKS: UITask[] = [
  {
    id: "task-ex-1",
    title: "Review Safari login rollback plan",
    description: "Sign off on rollback before Friday deploy — from Alex's email thread",
    source: "EMAIL_AI",
    sourceId: "mail-1",
    status: "To Do",
    priority: "High",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    url: null,
    sourceData: { emailSubject: "Re: Safari login timeout — rollback plan needed" },
  },
  {
    id: "task-ex-2",
    title: "Review auth refactor PR #842",
    description: "Jordan requested review — blocking sprint demo merge",
    source: "EMAIL_AI",
    sourceId: "mail-2",
    status: "To Do",
    priority: "Medium",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    url: null,
    sourceData: { emailSubject: "PR review: auth refactor (#842)" },
  },
]

export const SANDBOX_CALENDAR_EVENTS = [
  {
    id: "ev-1",
    summary: "Engineering standup",
    start: { dateTime: todayAt(9, 0) },
    end: { dateTime: todayAt(9, 15) },
    location: "Zoom",
    description: "Daily sync",
  },
  {
    id: "ev-2",
    summary: "Focus block — rollback review",
    start: { dateTime: todayAt(14, 0) },
    end: { dateTime: todayAt(15, 30) },
    location: "Calendar block",
    description: "Deep work",
  },
  {
    id: "ev-3",
    summary: "Sprint planning",
    start: { dateTime: todayAt(16, 0) },
    end: { dateTime: todayAt(17, 0) },
    location: "Conference room B",
  },
]

export type SandboxCalendarInfo = {
  id: string
  summary: string
  backgroundColor: string
  primary?: boolean
}

export type SandboxCalendarEvent = {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  calendarId: string
  calendarName: string
  htmlLink: string
  attendees?: Array<{ email: string; displayName?: string }>
}

export const SANDBOX_CALENDARS: SandboxCalendarInfo[] = [
  { id: "google-primary", summary: "Alex Chen", backgroundColor: "#1a73e8", primary: true },
  { id: "outlook-work", summary: "Work Calendar", backgroundColor: "#0078d4" },
]

/** Week-view events for every day Mon–Sun of the given week. */
export function getSandboxWeekCalendarEvents(weekRef: Date = new Date()): SandboxCalendarEvent[] {
  const weekStart = startOfWeek(weekRef, { weekStartsOn: 1 })
  const at = (dayOffset: number, hour: number, minute: number) => {
    const d = addDays(weekStart, dayOffset)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }
  const dateOnly = (dayOffset: number) => addDays(weekStart, dayOffset).toISOString().slice(0, 10)

  return [
    {
      id: "w-ev-mon-1",
      summary: "Engineering standup",
      start: { dateTime: at(0, 9, 0) },
      end: { dateTime: at(0, 9, 15) },
      location: "Zoom",
      calendarId: "google-primary",
      calendarName: "Alex Chen",
      htmlLink: "#",
    },
    {
      id: "w-ev-mon-2",
      summary: "PR review block",
      start: { dateTime: at(0, 14, 0) },
      end: { dateTime: at(0, 15, 0) },
      location: "Focus",
      calendarId: "google-primary",
      calendarName: "Alex Chen",
      htmlLink: "#",
    },
    {
      id: "w-ev-tue-1",
      summary: "1:1 with Jordan",
      start: { dateTime: at(1, 11, 0) },
      end: { dateTime: at(1, 11, 30) },
      location: "Google Meet",
      calendarId: "google-primary",
      calendarName: "Alex Chen",
      htmlLink: "#",
    },
    {
      id: "w-ev-tue-2",
      summary: "Auth refactor sync",
      start: { dateTime: at(1, 15, 30) },
      end: { dateTime: at(1, 16, 0) },
      location: "Slack huddle",
      calendarId: "outlook-work",
      calendarName: "Work Calendar",
      htmlLink: "#",
    },
    {
      id: "w-ev-wed-1",
      summary: "Focus block — rollback review",
      start: { dateTime: at(2, 10, 0) },
      end: { dateTime: at(2, 11, 30) },
      location: "Focus",
      calendarId: "google-primary",
      calendarName: "Alex Chen",
      htmlLink: "#",
    },
    {
      id: "w-ev-wed-2",
      summary: "Platform team sync",
      start: { dateTime: at(2, 16, 0) },
      end: { dateTime: at(2, 16, 45) },
      location: "Zoom",
      calendarId: "outlook-work",
      calendarName: "Work Calendar",
      htmlLink: "#",
    },
    {
      id: "w-ev-thu-1",
      summary: "Sprint planning",
      start: { dateTime: at(3, 10, 0) },
      end: { dateTime: at(3, 11, 0) },
      location: "Conference room B",
      calendarId: "outlook-work",
      calendarName: "Work Calendar",
      htmlLink: "#",
    },
    {
      id: "w-ev-thu-2",
      summary: "Demo prep",
      start: { dateTime: at(3, 14, 0) },
      end: { dateTime: at(3, 15, 0) },
      location: "Focus",
      calendarId: "google-primary",
      calendarName: "Alex Chen",
      htmlLink: "#",
    },
    {
      id: "w-ev-fri-1",
      summary: "Sprint demo",
      start: { dateTime: at(4, 11, 0) },
      end: { dateTime: at(4, 12, 0) },
      location: "All hands Zoom",
      calendarId: "outlook-work",
      calendarName: "Work Calendar",
      htmlLink: "#",
    },
    {
      id: "w-ev-fri-2",
      summary: "Company offsite",
      start: { date: dateOnly(4) },
      end: { date: dateOnly(4) },
      calendarId: "outlook-work",
      calendarName: "Work Calendar",
      htmlLink: "#",
    },
    {
      id: "w-ev-sat-1",
      summary: "Side project deep work",
      start: { dateTime: at(5, 10, 0) },
      end: { dateTime: at(5, 12, 0) },
      location: "Home office",
      calendarId: "google-primary",
      calendarName: "Alex Chen",
      htmlLink: "#",
    },
    {
      id: "w-ev-sat-2",
      summary: "Weekly recap & planning",
      start: { dateTime: at(5, 16, 0) },
      end: { dateTime: at(5, 17, 0) },
      location: "Notion",
      calendarId: "google-primary",
      calendarName: "Alex Chen",
      htmlLink: "#",
    },
    {
      id: "w-ev-sun-1",
      summary: "Inbox zero (personal)",
      start: { dateTime: at(6, 9, 30) },
      end: { dateTime: at(6, 10, 30) },
      location: "Gmail",
      calendarId: "google-primary",
      calendarName: "Alex Chen",
      htmlLink: "#",
    },
    {
      id: "w-ev-sun-2",
      summary: "Week ahead review",
      start: { dateTime: at(6, 18, 0) },
      end: { dateTime: at(6, 19, 0) },
      location: "Calendar",
      calendarId: "outlook-work",
      calendarName: "Work Calendar",
      htmlLink: "#",
    },
  ]
}

export function mergeSandboxCalendarEvents(
  weekRef: Date,
  dynamicEvents: SandboxCalendarEvent[],
): SandboxCalendarEvent[] {
  const weekStart = startOfWeek(weekRef, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekRef, { weekStartsOn: 1 })
  weekEnd.setHours(23, 59, 59, 999)

  const dynamicInWeek = dynamicEvents.filter((event) => {
    const raw = event.start.dateTime ?? (event.start.date ? `${event.start.date}T12:00:00` : null)
    if (!raw) return false
    const dt = new Date(raw)
    return dt >= weekStart && dt <= weekEnd
  })

  return [...getSandboxWeekCalendarEvents(weekRef), ...dynamicInWeek]
}

export function getSandboxEventsForDay(
  day: Date,
  weekRef: Date,
  dynamicEvents: SandboxCalendarEvent[],
): SandboxCalendarEvent[] {
  return mergeSandboxCalendarEvents(weekRef, dynamicEvents).filter((event) => {
    const raw = event.start.dateTime ?? (event.start.date ? `${event.start.date}T00:00:00` : null)
    return raw ? isSameDay(new Date(raw), day) : false
  })
}

function todayAt(hour: number, minute: number): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function buildSandboxDashboardData(
  tasks: UITask[],
  focusTimer: SandboxFocusTimer,
  focusStats: SandboxFocusStats,
  dynamicCalendarEvents: SandboxCalendarEvent[],
) {
  const completed = tasks.filter((t) => t.status === "Done").length
  const overdue = tasks.filter((t) => {
    if (!t.dueDate || t.status === "Done") return false
    return new Date(t.dueDate) < new Date()
  }).length
  const unread = SANDBOX_EMAILS.filter((e) => !e.isRead).length
  const now = new Date()
  const todayEvents = getSandboxEventsForDay(now, now, dynamicCalendarEvents)
    .map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start,
      end: e.end,
      location: e.location,
    }))
    .sort(
      (a, b) =>
        new Date(a.start.dateTime ?? a.start.date ?? 0).getTime() -
        new Date(b.start.dateTime ?? b.start.date ?? 0).getTime(),
    )
  const nextMeeting = todayEvents.find((e) => {
    const start = e.start.dateTime
    return start && new Date(start) > now
  })

  const activeMinutes =
    focusTimer.isActive && focusTimer.durationMinutes > 0
      ? focusTimer.durationMinutes -
        Math.ceil(Math.max(0, focusTimer.secondsRemaining) / 60)
      : 0

  return {
    tasks: {
      total: tasks.length,
      completed,
      pending: tasks.length - completed,
      overdue,
    },
    focus: {
      isActive: focusTimer.isActive,
      isRunning: focusTimer.isRunning,
      currentSession: focusTimer.isActive
        ? {
            title: focusTimer.title,
            minutesRemaining: Math.ceil(focusTimer.secondsRemaining / 60),
          }
        : null,
      todayMinutes: focusStats.todayMinutes + Math.max(0, activeMinutes),
      sessionsToday: focusStats.sessionsToday,
    },
    calendar: { todayEvents, nextMeeting },
    emails: { unread },
  }
}
