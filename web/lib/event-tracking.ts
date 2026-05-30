import { prisma } from "@/lib/prisma"
import { hashIp, isBotUserAgent, isRateLimited } from "@/lib/visit-tracking"

const MAX_USER_AGENT_LENGTH = 256
const MAX_FIELD_LENGTH = 128
const MAX_EVENT_LENGTH = 64
const MAX_SESSION_LENGTH = 64

function clean(value: string | null | undefined, max = MAX_FIELD_LENGTH): string | null {
  if (!value) return null
  const trimmed = value.trim().slice(0, max)
  return trimmed.length > 0 ? trimmed : null
}

export type RecordEventInput = {
  event: string
  path: string
  props?: Record<string, unknown> | null
  sessionId?: string | null
  source?: string | null
  userAgent?: string | null
  ip?: string | null
}

export type RecordEventResult =
  | { recorded: true }
  | { recorded: false; reason: "bot" | "rate_limited" | "invalid" | "error" }

export async function recordEvent(
  input: RecordEventInput,
): Promise<RecordEventResult> {
  const event = clean(input.event, MAX_EVENT_LENGTH)
  const path = clean(input.path) ?? "/"
  if (!event) return { recorded: false, reason: "invalid" }

  if (isBotUserAgent(input.userAgent)) {
    return { recorded: false, reason: "bot" }
  }

  const ipHash = hashIp(input.ip)
  const rateKey = `evt:${ipHash ?? "noip"}:${event}`
  if (isRateLimited(rateKey)) {
    return { recorded: false, reason: "rate_limited" }
  }

  const sessionId = clean(input.sessionId, MAX_SESSION_LENGTH)
  const source = clean(input.source, MAX_FIELD_LENGTH)
  const userAgent = clean(input.userAgent, MAX_USER_AGENT_LENGTH)

  try {
    await prisma.productEvent.create({
      data: {
        event,
        path,
        props: input.props ?? undefined,
        sessionId,
        source,
        ipHash,
        userAgent,
      },
    })
    return { recorded: true }
  } catch (error) {
    console.error("[event-tracking] failed to record event", error)
    return { recorded: false, reason: "error" }
  }
}

export type EventBreakdown = {
  event: string
  count: number
  uniqueSessions: number
}

export type SandboxSessionSummary = {
  sessionId: string
  eventCount: number
  lastSeen: string
  features: string[]
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function getSandboxEventStats(): Promise<{
  total7d: number
  total30d: number
  uniqueSessions7d: number
  uniqueSessions30d: number
  topEvents: EventBreakdown[]
  recentSessions: SandboxSessionSummary[]
}> {
  const since7 = daysAgo(7)
  const since30 = daysAgo(30)

  const [last7Rows, last30Rows] = await Promise.all([
    prisma.productEvent.findMany({
      where: { source: "sandbox", createdAt: { gte: since7 } },
      select: { event: true, sessionId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productEvent.findMany({
      where: { source: "sandbox", createdAt: { gte: since30 } },
      select: { event: true, sessionId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const unique7 = new Set<string>()
  for (const r of last7Rows) if (r.sessionId) unique7.add(r.sessionId)

  const unique30 = new Set<string>()
  for (const r of last30Rows) if (r.sessionId) unique30.add(r.sessionId)

  const eventCounts = new Map<string, { count: number; sessions: Set<string> }>()
  for (const r of last30Rows) {
    let bucket = eventCounts.get(r.event)
    if (!bucket) {
      bucket = { count: 0, sessions: new Set() }
      eventCounts.set(r.event, bucket)
    }
    bucket.count += 1
    if (r.sessionId) bucket.sessions.add(r.sessionId)
  }

  const topEvents: EventBreakdown[] = Array.from(eventCounts.entries())
    .map(([event, b]) => ({
      event,
      count: b.count,
      uniqueSessions: b.sessions.size,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  const sessionMap = new Map<
    string,
    { count: number; lastSeen: Date; features: Set<string> }
  >()
  for (const r of last30Rows) {
    if (!r.sessionId) continue
    let bucket = sessionMap.get(r.sessionId)
    if (!bucket) {
      bucket = { count: 0, lastSeen: r.createdAt, features: new Set() }
      sessionMap.set(r.sessionId, bucket)
    }
    bucket.count += 1
    if (r.createdAt > bucket.lastSeen) bucket.lastSeen = r.createdAt
    if (r.event.startsWith("sandbox_view_")) {
      bucket.features.add(r.event.replace("sandbox_view_", ""))
    }
  }

  const recentSessions: SandboxSessionSummary[] = Array.from(sessionMap.entries())
    .map(([sessionId, b]) => ({
      sessionId: sessionId.slice(0, 8) + "…",
      eventCount: b.count,
      lastSeen: b.lastSeen.toISOString(),
      features: Array.from(b.features).slice(0, 6),
    }))
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, 12)

  return {
    total7d: last7Rows.length,
    total30d: last30Rows.length,
    uniqueSessions7d: unique7.size,
    uniqueSessions30d: unique30.size,
    topEvents,
    recentSessions,
  }
}
