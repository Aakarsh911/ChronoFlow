import { getServerSession } from "next-auth"
import Link from "next/link"
import { Lock, ShieldCheck, UserMinus, UserPlus } from "lucide-react"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import {
  adminEmailList,
  isAdminEmail,
  listInvited,
  listWaitlist,
  type InvitedEntry,
  type WaitlistEntry,
} from "@/lib/access-list"
import { ThemeToggle } from "@/app/waitlist/theme-toggle"
import SignOutButton from "@/app/access-pending/sign-out-button"
import InviteForm from "./invite-form"
import { VisitsPanel } from "./visits-panel"
import { inviteFromWaitlistAction, revokeAction } from "./actions"

export const dynamic = "force-dynamic"

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function NotConfigured() {
  return (
    <main className="relative min-h-[100dvh]">
      <div className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="text-2xl font-semibold text-[var(--cf-text)]">
          Admin not configured
        </h1>
        <p className="mt-3 text-sm text-[var(--cf-text-muted)]">
          Set the{" "}
          <code className="rounded bg-[var(--cf-bg-soft)] px-1.5 py-0.5 font-mono text-[var(--cf-text)]">
            ADMIN_EMAILS
          </code>{" "}
          environment variable in{" "}
          <code className="rounded bg-[var(--cf-bg-soft)] px-1.5 py-0.5 font-mono text-[var(--cf-text)]">
            web/.env
          </code>{" "}
          to a comma-separated list of admin email addresses, then restart the
          server. Anyone in that list can sign in to the app and view this page.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] p-4 font-mono text-xs text-[var(--cf-text)]">
{`# web/.env
ADMIN_EMAILS=you@example.com,teammate@example.com`}
        </pre>
      </div>
    </main>
  )
}

function NotAuthorized({ email }: { email: string | null }) {
  return (
    <main className="relative min-h-[100dvh]">
      <div className="mx-auto max-w-2xl px-6 py-24">
        <span className="cf-chip cf-chip-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]">
          <Lock className="size-3" aria-hidden /> Admin only
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-[var(--cf-text)]">
          You don&apos;t have access to this page.
        </h1>
        <p className="mt-3 text-sm text-[var(--cf-text-muted)]">
          {email ? (
            <>
              <span className="font-mono text-[var(--cf-text)]">{email}</span> is
              not in the{" "}
              <code className="rounded bg-[var(--cf-bg-soft)] px-1.5 py-0.5 font-mono text-[var(--cf-text)]">
                ADMIN_EMAILS
              </code>{" "}
              allowlist. Add it to <code className="font-mono">web/.env</code>{" "}
              and restart the server.
            </>
          ) : (
            <>
              You need to be signed in with an admin email to view this page.{" "}
              <Link href="/login" className="underline">
                Sign in
              </Link>
              .
            </>
          )}
        </p>
        {email && (
          <div className="mt-6">
            <SignOutButton />
          </div>
        )}
      </div>
    </main>
  )
}

export default async function AdminWaitlistPage() {
  // 1. ADMIN_EMAILS must be configured.
  if (adminEmailList().length === 0) {
    return <NotConfigured />
  }

  // 2. The signed-in user must be an admin.
  const session = await getServerSession(authOptions)
  const sessionEmail = session?.user?.email ?? null
  if (!isAdminEmail(sessionEmail)) {
    return <NotAuthorized email={sessionEmail} />
  }

  // 3. Load both lists.
  const [waitlist, invited] = await Promise.all([listWaitlist(), listInvited()])

  // Sort: newest signups first, newest invites first.
  const waitlistSorted: WaitlistEntry[] = [...waitlist].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  const invitedSorted: InvitedEntry[] = [...invited].sort((a, b) =>
    b.invitedAt.localeCompare(a.invitedAt),
  )
  const invitedSet = new Set(invitedSorted.map((e) => e.email))

  return (
    <main className="relative min-h-[100dvh]">
      <header className="sticky top-0 z-10 border-b border-[var(--cf-border)] bg-[color-mix(in_oklch,var(--cf-bg)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/waitlist"
              className="font-mono text-sm font-semibold text-[var(--cf-text)] hover:text-[rgba(var(--cf-accent-rgb),1)] transition"
            >
              ChronoFlow
            </Link>
            <span className="text-[var(--cf-text-dim)]">/</span>
            <span className="font-mono text-sm text-[var(--cf-text-muted)]">
              admin / waitlist
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-2.5 py-1 font-mono text-[11px] text-[var(--cf-text-muted)] sm:inline-flex">
              <ShieldCheck className="size-3 text-[rgba(var(--cf-accent-rgb),1)]" aria-hidden />
              {sessionEmail}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--cf-text)] sm:text-3xl">
            Waitlist & invites
          </h1>
          <p className="text-sm text-[var(--cf-text-muted)]">
            {waitlistSorted.length} on the waitlist · {invitedSorted.length}{" "}
            invited · only invited users + admins can sign in.
          </p>
        </div>

        {/* Visits */}
        <VisitsPanel />

        {/* Manual invite */}
        <div className="mt-8 rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-5 sm:p-6">
          <div className="flex flex-col gap-1 sm:gap-1.5">
            <h2 className="text-sm font-semibold text-[var(--cf-text)]">
              Invite someone
            </h2>
            <p className="text-xs text-[var(--cf-text-muted)]">
              Adds the email to the allowlist. They can sign in immediately —
              you still need to email them the link separately.
            </p>
          </div>
          <div className="mt-4">
            <InviteForm />
          </div>
        </div>

        {/* Invited list */}
        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cf-text-muted)]">
              Invited ({invitedSorted.length})
            </h2>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)]">
            {invitedSorted.length === 0 ? (
              <p className="p-6 text-sm text-[var(--cf-text-muted)]">
                Nobody invited yet. Use the form above, or invite directly from
                the waitlist below.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] text-left text-[11px] uppercase tracking-wider text-[var(--cf-text-muted)]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Invited</th>
                    <th className="px-4 py-2.5 font-medium">By</th>
                    <th className="px-4 py-2.5 font-medium">Notes</th>
                    <th className="px-4 py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invitedSorted.map((row) => (
                    <tr
                      key={row.email}
                      className="border-b border-[var(--cf-border)] last:border-b-0"
                    >
                      <td className="px-4 py-3 font-mono text-[var(--cf-text)]">
                        {row.email}
                      </td>
                      <td className="px-4 py-3 text-[var(--cf-text-muted)]">
                        {formatDate(row.invitedAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[var(--cf-text-muted)]">
                        {row.invitedBy ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--cf-text-muted)]">
                        {row.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <form action={revokeAction}>
                          <input type="hidden" name="email" value={row.email} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--cf-border)] bg-transparent px-2.5 py-1 text-xs text-[var(--cf-text-muted)] transition hover:border-[var(--cf-danger)] hover:text-[var(--cf-danger)]"
                          >
                            <UserMinus className="size-3" aria-hidden />
                            Revoke
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Waitlist */}
        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cf-text-muted)]">
              Waitlist ({waitlistSorted.length})
            </h2>
            <span className="font-mono text-[11px] text-[var(--cf-text-dim)]">
              data/waitlist.json
            </span>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)]">
            {waitlistSorted.length === 0 ? (
              <p className="p-6 text-sm text-[var(--cf-text-muted)]">
                Nobody has joined the waitlist yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] text-left text-[11px] uppercase tracking-wider text-[var(--cf-text-muted)]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                    <th className="px-4 py-2.5 font-medium">Source</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlistSorted.map((row) => {
                    const already = invitedSet.has(row.email)
                    return (
                      <tr
                        key={row.email}
                        className="border-b border-[var(--cf-border)] last:border-b-0"
                      >
                        <td className="px-4 py-3 font-mono text-[var(--cf-text)]">
                          {row.email}
                        </td>
                        <td className="px-4 py-3 text-[var(--cf-text-muted)]">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[var(--cf-text-muted)]">
                          {row.source ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {already ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(var(--cf-accent-rgb),0.35)] bg-[var(--cf-accent-soft)] px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider text-[rgba(var(--cf-accent-rgb),1)]">
                              Invited
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--cf-border)] px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider text-[var(--cf-text-muted)]">
                              Waiting
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {already ? (
                            <span className="text-xs text-[var(--cf-text-dim)]">—</span>
                          ) : (
                            <form action={inviteFromWaitlistAction}>
                              <input
                                type="hidden"
                                name="email"
                                value={row.email}
                              />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--cf-border)] bg-transparent px-2.5 py-1 text-xs text-[var(--cf-text-muted)] transition hover:border-[rgba(var(--cf-accent-rgb),0.6)] hover:text-[rgba(var(--cf-accent-rgb),1)]"
                              >
                                <UserPlus className="size-3" aria-hidden />
                                Invite
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-dashed border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-4 text-xs text-[var(--cf-text-muted)]">
          <p className="font-medium text-[var(--cf-text)]">Storage</p>
          <p className="mt-1">
            Both lists are persisted in Postgres via Prisma — see the{" "}
            <code className="font-mono text-[var(--cf-text)]">
              WaitlistSignup
            </code>{" "}
            and{" "}
            <code className="font-mono text-[var(--cf-text)]">
              InvitedEmail
            </code>{" "}
            models in{" "}
            <code className="font-mono text-[var(--cf-text)]">
              prisma/schema.prisma
            </code>
            . Admin access is controlled by the{" "}
            <code className="font-mono text-[var(--cf-text)]">
              ADMIN_EMAILS
            </code>{" "}
            env var.
          </p>
        </div>
      </section>
    </main>
  )
}
