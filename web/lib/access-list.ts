import { promises as fs } from "fs"
import path from "path"

/**
 * Beta-access plumbing.
 *
 *   • `data/waitlist.json` — public signup queue (anyone can land on this).
 *   • `data/invited.json`  — explicit allowlist of emails that can log in.
 *
 * The waitlist is purely informational; the *invited* list is what NextAuth's
 * signIn callback gates on. Admins (set via the ADMIN_EMAILS env var) always
 * get access regardless of either list — that's the bootstrap mechanism.
 *
 * NOTE: JSON-file storage is fine for local dev / single-instance Node, but
 * file writes don't persist on serverless platforms. Swap the read/write
 * helpers for a DB call when you deploy somewhere ephemeral.
 */

const DATA_DIR = path.join(process.cwd(), "data")
const INVITED_FILE = path.join(DATA_DIR, "invited.json")
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.json")

export type InvitedEntry = {
  email: string
  invitedAt: string
  invitedBy?: string
  notes?: string
}

export type WaitlistEntry = {
  email: string
  source?: string
  createdAt: string
}

async function readJsonArray<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return []
    throw err
  }
}

async function writeJsonArray<T>(file: string, value: T[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8")
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/* ---------------- Waitlist (read-only here) ---------------- */

export async function listWaitlist(): Promise<WaitlistEntry[]> {
  return readJsonArray<WaitlistEntry>(WAITLIST_FILE)
}

export async function isOnWaitlist(email: string): Promise<boolean> {
  const norm = normalizeEmail(email)
  if (!norm) return false
  const entries = await listWaitlist()
  return entries.some((e) => e.email === norm)
}

/* ---------------- Invited list ---------------- */

export async function listInvited(): Promise<InvitedEntry[]> {
  return readJsonArray<InvitedEntry>(INVITED_FILE)
}

export async function isInvited(email: string): Promise<boolean> {
  const norm = normalizeEmail(email)
  if (!norm) return false
  const entries = await listInvited()
  return entries.some((e) => e.email === norm)
}

export async function addInvite(
  email: string,
  meta?: { invitedBy?: string; notes?: string },
): Promise<{ added: boolean; entry: InvitedEntry }> {
  const norm = normalizeEmail(email)
  if (!norm) {
    throw new Error("addInvite: empty email")
  }
  const entries = await listInvited()
  const existing = entries.find((e) => e.email === norm)
  if (existing) return { added: false, entry: existing }

  const entry: InvitedEntry = {
    email: norm,
    invitedAt: new Date().toISOString(),
    invitedBy: meta?.invitedBy,
    notes: meta?.notes,
  }
  entries.push(entry)
  await writeJsonArray(INVITED_FILE, entries)
  return { added: true, entry }
}

export async function revokeInvite(email: string): Promise<boolean> {
  const norm = normalizeEmail(email)
  if (!norm) return false
  const entries = await listInvited()
  const next = entries.filter((e) => e.email !== norm)
  if (next.length === entries.length) return false
  await writeJsonArray(INVITED_FILE, next)
  return true
}

/* ---------------- Admin ---------------- */

/** Comma-separated list of admin emails from the env var. Always lower-cased. */
export function adminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmailList().includes(email.toLowerCase())
}

/* ---------------- Combined access check ---------------- */

/**
 * The single source of truth used by the NextAuth signIn callback.
 * Admins always pass. Non-admins must have been explicitly invited.
 */
export async function hasBetaAccess(email: string): Promise<boolean> {
  if (isAdminEmail(email)) return true
  return isInvited(email)
}
