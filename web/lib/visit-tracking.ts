import { createHash } from "crypto"

import { prisma } from "@/lib/prisma"

/**
 * First-party visit tracking for the public marketing pages.
 *
 * Design choices:
 *   • Only writes a row when at least one UTM param is present. Untagged
 *     traffic (direct, internal browsing, crawlers that strip params, etc.)
 *     is ignored on purpose — keeps the table noise-free and means the
 *     site owner doesn't need a separate self-exclusion mechanism.
 *   • IPs are never stored raw. We hash with SHA-256 + a daily-rotating
 *     salt so we can do rough unique-visitor counts within a 24h window
 *     without persisting PII beyond that.
 *   • A small in-process rate cap prevents accidental loops or trivial
 *     spam from blowing up the table on serverless cold starts.
 *
 * If you want to also count untagged visits later, just relax the
 * `hasUtm` check in `recordVisit`.
 */

const VISIT_TRACKING_SECRET =
  process.env.VISIT_TRACKING_SECRET ?? "chronoflow-visit-default-salt"

const MAX_USER_AGENT_LENGTH = 256
const MAX_REFERRER_LENGTH = 512
const MAX_FIELD_LENGTH = 128

/* ---------------------- bot detection ---------------------- */

const BOT_UA_PATTERN =
  /bot|crawl|spider|preview|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|skype|linkedinbot|twitterbot|googlebot|yandex|duckduckbot|applebot|ahrefsbot|semrushbot|mj12bot|monitoring|uptimerobot|pingdom|headlesschrome/i

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true
  return BOT_UA_PATTERN.test(ua)
}

/* ---------------------- IP hashing ---------------------- */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  return createHash("sha256")
    .update(`${VISIT_TRACKING_SECRET}|${todayKey()}|${ip}`)
    .digest("hex")
    .slice(0, 32)
}

/* ---------------------- in-process rate cap ---------------------- */

type RateBucket = { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

export function isRateLimited(key: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  bucket.count += 1
  if (bucket.count > RATE_LIMIT) return true
  return false
}

/* ---------------------- normalize input ---------------------- */

function clean(value: string | null | undefined, max = MAX_FIELD_LENGTH): string | null {
  if (!value) return null
  const trimmed = value.trim().slice(0, max)
  return trimmed.length > 0 ? trimmed : null
}

function refererHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null
  try {
    return new URL(referrer).host.toLowerCase()
  } catch {
    return clean(referrer, MAX_REFERRER_LENGTH)
  }
}

/* ---------------------- write path ---------------------- */

export type RecordVisitInput = {
  path: string
  source: string | null
  medium: string | null
  campaign: string | null
  referrer: string | null
  userAgent: string | null
  ip: string | null
  country: string | null
}

export type RecordVisitResult =
  | { recorded: true }
  | { recorded: false; reason: "no_utm" | "bot" | "rate_limited" | "error" }

export async function recordVisit(
  input: RecordVisitInput,
): Promise<RecordVisitResult> {
  const source = clean(input.source)
  const medium = clean(input.medium)
  const campaign = clean(input.campaign)

  const hasUtm = Boolean(source || medium || campaign)
  if (!hasUtm) {
    return { recorded: false, reason: "no_utm" }
  }

  if (isBotUserAgent(input.userAgent)) {
    return { recorded: false, reason: "bot" }
  }

  const ipHash = hashIp(input.ip)
  const rateKey = ipHash ?? `noip:${input.userAgent ?? "unknown"}`
  if (isRateLimited(rateKey)) {
    return { recorded: false, reason: "rate_limited" }
  }

  const path = clean(input.path) ?? "/"
  const referrer = refererHost(input.referrer)
  const userAgent = clean(input.userAgent, MAX_USER_AGENT_LENGTH)
  const country = clean(input.country, 8)

  try {
    await prisma.pageVisit.create({
      data: {
        path,
        source,
        medium,
        campaign,
        referrer,
        ipHash,
        userAgent,
        country,
      },
    })
    return { recorded: true }
  } catch (error) {
    console.error("[visit-tracking] failed to record visit", error)
    return { recorded: false, reason: "error" }
  }
}

/* ---------------------- read path (admin stats) ---------------------- */

export type VisitTotals = {
  totalAllTime: number
  total7d: number
  total30d: number
  uniqueVisitors7d: number
  uniqueVisitors30d: number
}

export type SourceBreakdown = {
  source: string
  count: number
  uniqueVisitors: number
}

export type DailyBucket = {
  day: string // YYYY-MM-DD
  count: number
  uniqueVisitors: number
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function getVisitStats(): Promise<{
  totals: VisitTotals
  topSources: SourceBreakdown[]
  daily: DailyBucket[]
}> {
  const since7 = daysAgo(7)
  const since30 = daysAgo(30)

  const [
    totalAllTime,
    last7Rows,
    last30Rows,
  ] = await Promise.all([
    prisma.pageVisit.count(),
    prisma.pageVisit.findMany({
      where: { createdAt: { gte: since7 } },
      select: { ipHash: true, source: true, createdAt: true },
    }),
    prisma.pageVisit.findMany({
      where: { createdAt: { gte: since30 } },
      select: { ipHash: true, source: true, createdAt: true },
    }),
  ])

  const total7d = last7Rows.length
  const total30d = last30Rows.length

  const unique7 = new Set<string>()
  for (const r of last7Rows) if (r.ipHash) unique7.add(r.ipHash)

  const unique30 = new Set<string>()
  for (const r of last30Rows) if (r.ipHash) unique30.add(r.ipHash)

  // Top sources over the last 30d
  const sourceCounts = new Map<string, { count: number; uniques: Set<string> }>()
  for (const r of last30Rows) {
    const src = r.source ?? "(none)"
    let bucket = sourceCounts.get(src)
    if (!bucket) {
      bucket = { count: 0, uniques: new Set() }
      sourceCounts.set(src, bucket)
    }
    bucket.count += 1
    if (r.ipHash) bucket.uniques.add(r.ipHash)
  }
  const topSources: SourceBreakdown[] = Array.from(sourceCounts.entries())
    .map(([source, b]) => ({
      source,
      count: b.count,
      uniqueVisitors: b.uniques.size,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Daily buckets for the last 30d (UTC days)
  const dailyMap = new Map<string, { count: number; uniques: Set<string> }>()
  for (let i = 29; i >= 0; i--) {
    const d = daysAgo(i)
    const key = d.toISOString().slice(0, 10)
    dailyMap.set(key, { count: 0, uniques: new Set() })
  }
  for (const r of last30Rows) {
    const key = r.createdAt.toISOString().slice(0, 10)
    let bucket = dailyMap.get(key)
    if (!bucket) {
      bucket = { count: 0, uniques: new Set() }
      dailyMap.set(key, bucket)
    }
    bucket.count += 1
    if (r.ipHash) bucket.uniques.add(r.ipHash)
  }
  const daily: DailyBucket[] = Array.from(dailyMap.entries()).map(
    ([day, b]) => ({ day, count: b.count, uniqueVisitors: b.uniques.size }),
  )

  return {
    totals: {
      totalAllTime,
      total7d,
      total30d,
      uniqueVisitors7d: unique7.size,
      uniqueVisitors30d: unique30.size,
    },
    topSources,
    daily,
  }
}
