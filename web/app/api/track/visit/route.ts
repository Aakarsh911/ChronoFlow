import { NextResponse, type NextRequest } from "next/server"

import { recordVisit } from "@/lib/visit-tracking"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TrackBody = {
  path?: string
  source?: string
  medium?: string
  campaign?: string
  referrer?: string
}

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()
  return null
}

export async function POST(request: NextRequest) {
  let body: TrackBody = {}
  try {
    body = (await request.json()) as TrackBody
  } catch {
    body = {}
  }

  const result = await recordVisit({
    path: body.path ?? "/waitlist",
    source: body.source ?? null,
    medium: body.medium ?? null,
    campaign: body.campaign ?? null,
    referrer: body.referrer ?? null,
    userAgent: request.headers.get("user-agent"),
    ip: clientIp(request),
    country: request.headers.get("x-vercel-ip-country"),
  })

  // Always respond 200 — we never want client-side errors / retries leaking
  // tracking failures into user-visible breakage. The body just signals what
  // happened for debugging in the network tab.
  return NextResponse.json(result, { status: 200 })
}
