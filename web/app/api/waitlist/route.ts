import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

// Lightweight JSON-file storage. Easy to swap for Postgres/Prisma or any
// other backend later — see `readEntries` / `writeEntries` below.
const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "waitlist.json")

// Permissive but tight enough RFC-5322-style check. Server-side guard;
// the client also validates before calling.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type WaitlistEntry = {
  email: string
  source?: string
  createdAt: string
}

async function readEntries(): Promise<WaitlistEntry[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WaitlistEntry[]) : []
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return []
    throw err
  }
}

async function writeEntries(entries: WaitlistEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), "utf8")
}

export async function GET() {
  try {
    const entries = await readEntries()
    return NextResponse.json(
      { count: entries.length },
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

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const source = typeof body.source === "string" ? body.source.slice(0, 64) : undefined

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email." },
      { status: 400 },
    )
  }

  try {
    const entries = await readEntries()
    const duplicate = entries.find((e) => e.email === email)
    if (duplicate) {
      return NextResponse.json(
        {
          ok: true,
          alreadyOnList: true,
          count: entries.length,
        },
        { status: 200 },
      )
    }

    const next: WaitlistEntry = {
      email,
      source,
      createdAt: new Date().toISOString(),
    }
    entries.push(next)
    await writeEntries(entries)

    return NextResponse.json(
      { ok: true, alreadyOnList: false, count: entries.length },
      { status: 201 },
    )
  } catch (err) {
    console.error("waitlist POST failed", err)
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Try again." },
      { status: 500 },
    )
  }
}
