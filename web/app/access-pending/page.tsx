import Link from "next/link"
import { ArrowRight, Lock, Sparkles, MailCheck } from "lucide-react"
import { listWaitlist } from "@/lib/access-list"
import { WaitlistForm } from "@/app/waitlist/waitlist-form"
import { ThemeToggle } from "@/app/waitlist/theme-toggle"
import SignOutButton from "./sign-out-button"

export const dynamic = "force-dynamic"

type Search = { email?: string | string[] }

function pickEmail(search: Search | undefined): string | null {
  const raw = search?.email
  if (!raw) return null
  const v = Array.isArray(raw) ? raw[0] : raw
  if (!v) return null
  const trimmed = v.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return null
  return trimmed
}

function formatJoinedAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diffMs = Date.now() - then
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return "today"
  if (days === 1) return "1 day ago"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months === 1) return "1 month ago"
  return `${months} months ago`
}

export default async function AccessPendingPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const params = await searchParams
  const email = pickEmail(params)

  let onWaitlist = false
  let joinedAgo: string | null = null
  if (email) {
    const list = await listWaitlist()
    const found = list.find((e) => e.email === email)
    if (found) {
      onWaitlist = true
      joinedAgo = formatJoinedAgo(found.createdAt)
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      {/* background — same vocabulary as the waitlist landing page */}
      <div aria-hidden className="cf-grid pointer-events-none absolute inset-0 -z-20" />
      <div aria-hidden className="cf-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh]" />
      <div aria-hidden className="cf-aurora-field pointer-events-none absolute inset-0 -z-10">
        <div className="cf-aurora cf-aurora-a" />
        <div className="cf-aurora cf-aurora-b" />
        <div className="cf-aurora cf-aurora-c" />
      </div>

      {/* top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5 sm:px-8">
        <Link
          href="/waitlist"
          className="font-mono text-sm font-semibold tracking-tight text-[var(--cf-text)] hover:text-[rgba(var(--cf-accent-rgb),1)] transition"
        >
          ChronoFlow
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      {/* main card */}
      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pb-24 pt-10 sm:px-8 sm:pt-16">
        <span className="cf-chip cf-chip-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]">
          <Lock className="size-3" aria-hidden />
          Beta access required
        </span>

        <h1 className="mt-6 text-balance text-center text-3xl font-semibold tracking-tight text-[var(--cf-text)] sm:text-4xl">
          You&apos;re not on the access list yet.
        </h1>

        <p className="mt-4 max-w-xl text-balance text-center text-[15px] leading-relaxed text-[var(--cf-text-muted)] sm:text-base">
          ChronoFlow is in private beta and we&apos;re rolling invites out by hand
          each week. We&apos;ll send your invite from{" "}
          <span className="font-mono text-[var(--cf-text)]">team@chronoflow.app</span>
          {" "}as soon as a slot opens up.
        </p>

        <div className="mt-10 w-full">
          {email && onWaitlist ? (
            <div className="cf-card-glow rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--cf-accent-soft)] text-[rgba(var(--cf-accent-rgb),1)]">
                  <MailCheck className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--cf-text)]">
                    You&apos;re already on the waitlist.
                  </p>
                  <p className="mt-1 text-sm text-[var(--cf-text-muted)]">
                    <span className="font-mono text-[var(--cf-text)]">{email}</span>
                    {joinedAgo ? ` • joined ${joinedAgo}` : ""}. Hang tight — we&apos;ll
                    email you the moment your invite is ready.
                  </p>
                </div>
              </div>
            </div>
          ) : email ? (
            <div className="cf-card-glow rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--cf-accent-soft)] text-[rgba(var(--cf-accent-rgb),1)]">
                  <Sparkles className="size-4" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--cf-text)]">
                    Add yourself to the waitlist
                  </p>
                  <p className="mt-1 text-sm text-[var(--cf-text-muted)]">
                    We didn&apos;t find{" "}
                    <span className="font-mono text-[var(--cf-text)]">{email}</span>{" "}
                    on the list yet. Drop your email below and we&apos;ll queue you up.
                  </p>
                  <div className="mt-4">
                    <WaitlistForm variant="footer" source="access-pending" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="cf-card-glow rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-6 sm:p-7">
              <p className="text-sm font-semibold text-[var(--cf-text)]">
                Want an invite?
              </p>
              <p className="mt-1 text-sm text-[var(--cf-text-muted)]">
                Drop your email below and we&apos;ll let you know the moment your
                slot is ready.
              </p>
              <div className="mt-4">
                <WaitlistForm variant="footer" source="access-pending" />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
          <Link
            href="/waitlist"
            className="group inline-flex items-center gap-1.5 text-sm text-[var(--cf-text-muted)] hover:text-[rgba(var(--cf-accent-rgb),1)] transition"
          >
            Back to the waitlist page
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </main>
  )
}
