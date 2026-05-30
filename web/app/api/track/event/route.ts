import { NextResponse, type NextRequest } from "next/server"

import { recordEvent } from "@/lib/event-tracking"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TrackBody = {
  event?: string
  path?: string
  props?: Record<string, unknown> | null
  sessionId?: string
  source?: string
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
  if (request.cookies.get("cf_no_track")?.value === "1") {
    return NextResponse.json({ recorded: false, reason: "opt_out" }, { status: 200 })
  }

  let body: TrackBody = {}
  try {
    body = (await request.json()) as TrackBody
  } catch {
    body = {}
  }

  const result = await recordEvent({
    event: body.event ?? "",
    path: body.path ?? "/sandbox",
    props: body.props ?? null,
    sessionId: body.sessionId ?? null,
    source: body.source ?? "sandbox",
    userAgent: request.headers.get("user-agent"),
    ip: clientIp(request),
  })

  return NextResponse.json(result, { status: 200 })
}
