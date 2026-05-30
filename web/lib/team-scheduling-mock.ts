import type { TeamsMember, MemberCalendar, CalendarEvent } from "@/components/team-scheduling-types"

const DEMO_MEMBERS: TeamsMember[] = [
  {
    id: "demo-jordan",
    displayName: "Jordan Kim",
    email: "jordan@acme.dev",
    jobTitle: "Staff Engineer",
    teamIds: ["demo-team"],
  },
  {
    id: "demo-sam",
    displayName: "Sam Patel",
    email: "sam@acme.dev",
    jobTitle: "Senior Engineer",
    teamIds: ["demo-team"],
  },
  {
    id: "demo-alex",
    displayName: "Alex Rivera",
    email: "alex@acme.dev",
    jobTitle: "Engineering Manager",
    teamIds: ["demo-team"],
  },
  {
    id: "demo-maya",
    displayName: "Maya Patel",
    email: "maya@acme.dev",
    jobTitle: "Product Engineer",
    teamIds: ["demo-team"],
  },
]

/** Busy hour ranges per member: [dayIndex 0=Mon, startHour, endHour] */
const DEMO_BUSY: Record<string, Array<[number, number, number]>> = {
  "demo-jordan": [
    [0, 9, 10],
    [0, 14, 15],
    [1, 11, 12],
    [2, 9, 11],
    [3, 10, 12],
    [3, 15, 16],
    [4, 11, 12],
  ],
  "demo-sam": [
    [0, 10, 11],
    [1, 9, 10],
    [1, 13, 14],
    [2, 14, 16],
    [3, 9, 11],
    [4, 9, 10],
  ],
  "demo-alex": [
    [0, 11, 12],
    [1, 10, 12],
    [2, 9, 10],
    [2, 15, 17],
    [3, 14, 15],
    [4, 10, 11],
    [4, 15, 16],
  ],
  "demo-maya": [
    [0, 9, 11],
    [1, 14, 16],
    [2, 11, 13],
    [3, 9, 10],
    [4, 13, 15],
  ],
}

function getWeekMonday(weekOffset: number) {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7)
  start.setHours(0, 0, 0, 0)
  return start
}

function eventAt(weekOffset: number, dayIndex: number, startHour: number, endHour: number, subject: string): CalendarEvent {
  const start = getWeekMonday(weekOffset)
  start.setDate(start.getDate() + dayIndex)
  start.setHours(startHour, 0, 0, 0)
  const end = new Date(start)
  end.setHours(endHour, 0, 0, 0)
  return {
    subject,
    start: { dateTime: start.toISOString(), timeZone: "UTC" },
    end: { dateTime: end.toISOString(), timeZone: "UTC" },
    isAllDay: false,
    showAs: "busy",
  }
}

function computeAvailability(events: CalendarEvent[]) {
  const now = new Date()
  const busyNow = events.some((event) => {
    const start = new Date(event.start.dateTime)
    const end = new Date(event.end.dateTime)
    return start <= now && end > now
  })

  const futureBusy = events
    .map((e) => new Date(e.start.dateTime))
    .filter((d) => d > now)
    .sort((a, b) => a.getTime() - b.getTime())[0]

  const futureFree = events
    .map((e) => new Date(e.end.dateTime))
    .filter((d) => d > now)
    .sort((a, b) => a.getTime() - b.getTime())[0]

  if (busyNow) {
    return {
      status: "busy" as const,
      nextAvailable: futureFree?.toISOString() ?? "now",
      nextBusyAt: undefined,
    }
  }

  return {
    status: "available" as const,
    nextAvailable: "now",
    nextBusyAt: futureBusy?.toISOString(),
  }
}

export function getDemoTeamMembers(): TeamsMember[] {
  return DEMO_MEMBERS
}

export function getDemoMemberCalendars(weekOffset: number): MemberCalendar[] {
  const now = new Date()
  const isCurrentWeek = weekOffset === 0

  return DEMO_MEMBERS.map((member) => {
    const blocks = DEMO_BUSY[member.id] ?? []
    const events = blocks.map(([day, start, end], i) =>
      eventAt(weekOffset, day, start, end, `Focus / sync ${i + 1}`),
    )

    const todayEvents = isCurrentWeek
      ? events.filter((e) => {
          const d = new Date(e.start.dateTime)
          return d.toDateString() === now.toDateString()
        })
      : events

    return {
      memberId: member.id,
      userName: member.displayName,
      userEmail: member.email,
      timezone: "Pacific Standard Time",
      availability: isCurrentWeek ? computeAvailability(todayEvents) : { status: "available", nextAvailable: "now" },
      eventsCount: events.length,
      events,
    }
  })
}
