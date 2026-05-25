import { NextRequest, NextResponse } from "next/server"
import { addToWaitlist, waitlistCount } from "@/lib/access-list"

// Server-side guard. The client also validates before calling.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function GET() {
  try {
    const count = await waitlistCount()
    return NextResponse.json(
      { count },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (err) {
    console.error("waitlist GET failed", err)
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown; source?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    )
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const source =
    typeof body.source === "string" ? body.source.slice(0, 64) : undefined

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email." },
      { status: 400 },
    )
  }

  try {
    const { added, total } = await addToWaitlist(email, source)
    return NextResponse.json(
      { ok: true, alreadyOnList: !added, count: total },
      { status: added ? 201 : 200 },
    )
  } catch (err) {
    console.error("waitlist POST failed", err)
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Try again." },
      { status: 500 },
    )
  }
}
