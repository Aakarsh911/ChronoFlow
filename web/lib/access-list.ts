import { prisma } from "@/lib/prisma"

/**
 * Beta-access plumbing.
 *
 *   • `WaitlistSignup` table — public signup queue. Anyone can land here.
 *   • `InvitedEmail`   table — explicit allowlist of emails that may sign in.
 *
 * The waitlist is purely informational; the *invited* list is what NextAuth's
 * signIn callback gates on. Admins (set via the ADMIN_EMAILS env var) always
 * pass regardless of either list — that's the bootstrap mechanism.
 *
 * createdAt / invitedAt are returned as ISO strings rather than Date objects
 * so callers can compare with `localeCompare` and pass them straight into
 * `new Date(...)` for formatting.
 */

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254
}

/* ---------------- Waitlist ---------------- */

export async function listWaitlist(): Promise<WaitlistEntry[]> {
  const rows = await prisma.waitlistSignup.findMany({
    orderBy: { createdAt: "desc" },
  })
  return rows.map((r) => ({
    email: r.email,
    source: r.source ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }))
}

export async function isOnWaitlist(email: string): Promise<boolean> {
  const norm = normalizeEmail(email)
  if (!norm) return false
  const found = await prisma.waitlistSignup.findUnique({
    where: { email: norm },
    select: { id: true },
  })
  return !!found
}

export async function addToWaitlist(
  email: string,
  source?: string,
): Promise<{ added: boolean; entry: WaitlistEntry; total: number }> {
  const norm = normalizeEmail(email)
  if (!isValidEmail(norm)) {
    throw new Error("addToWaitlist: invalid email")
  }

  const cleanedSource =
    typeof source === "string" && source.length > 0
      ? source.slice(0, 64)
      : undefined

  const existing = await prisma.waitlistSignup.findUnique({
    where: { email: norm },
  })

  if (existing) {
    const total = await prisma.waitlistSignup.count()
    return {
      added: false,
      entry: {
        email: existing.email,
        source: existing.source ?? undefined,
        createdAt: existing.createdAt.toISOString(),
      },
      total,
    }
  }

  const created = await prisma.waitlistSignup.create({
    data: { email: norm, source: cleanedSource },
  })
  const total = await prisma.waitlistSignup.count()
  return {
    added: true,
    entry: {
      email: created.email,
      source: created.source ?? undefined,
      createdAt: created.createdAt.toISOString(),
    },
    total,
  }
}

export async function waitlistCount(): Promise<number> {
  return prisma.waitlistSignup.count()
}

/* ---------------- Invited list ---------------- */

export async function listInvited(): Promise<InvitedEntry[]> {
  const rows = await prisma.invitedEmail.findMany({
    orderBy: { invitedAt: "desc" },
  })
  return rows.map((r) => ({
    email: r.email,
    invitedAt: r.invitedAt.toISOString(),
    invitedBy: r.invitedBy ?? undefined,
    notes: r.notes ?? undefined,
  }))
}

export async function isInvited(email: string): Promise<boolean> {
  const norm = normalizeEmail(email)
  if (!norm) return false
  const found = await prisma.invitedEmail.findUnique({
    where: { email: norm },
    select: { id: true },
  })
  return !!found
}

export async function addInvite(
  email: string,
  meta?: { invitedBy?: string; notes?: string },
): Promise<{ added: boolean; entry: InvitedEntry }> {
  const norm = normalizeEmail(email)
  if (!isValidEmail(norm)) {
    throw new Error("addInvite: invalid email")
  }

  const existing = await prisma.invitedEmail.findUnique({
    where: { email: norm },
  })
  if (existing) {
    return {
      added: false,
      entry: {
        email: existing.email,
        invitedAt: existing.invitedAt.toISOString(),
        invitedBy: existing.invitedBy ?? undefined,
        notes: existing.notes ?? undefined,
      },
    }
  }

  const created = await prisma.invitedEmail.create({
    data: {
      email: norm,
      invitedBy: meta?.invitedBy,
      notes: meta?.notes,
    },
  })
  return {
    added: true,
    entry: {
      email: created.email,
      invitedAt: created.invitedAt.toISOString(),
      invitedBy: created.invitedBy ?? undefined,
      notes: created.notes ?? undefined,
    },
  }
}

export async function revokeInvite(email: string): Promise<boolean> {
  const norm = normalizeEmail(email)
  if (!norm) return false
  try {
    await prisma.invitedEmail.delete({ where: { email: norm } })
    return true
  } catch {
    // Prisma throws P2025 if the record doesn't exist — treat as no-op.
    return false
  }
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
