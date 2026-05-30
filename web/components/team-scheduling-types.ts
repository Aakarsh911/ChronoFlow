export type TeamsMember = {
  id: string
  displayName: string
  email?: string
  jobTitle?: string
  teamIds: string[]
}

export type Availability = {
  status: "available" | "busy"
  nextAvailable: string
  currentEventEnd?: string
  busyUntil?: string | null
  nextBusyAt?: string | null
}

export type CalendarEvent = {
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  isAllDay: boolean
  showAs: string
}

export type MemberCalendar = {
  memberId: string
  userName?: string
  userEmail?: string
  timezone?: string
  error?: string
  availability?: Availability
  eventsCount?: number
  events?: CalendarEvent[]
}
