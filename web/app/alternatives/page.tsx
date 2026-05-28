import type { Metadata } from "next"
import Link from "next/link"
import { alternatives } from "@/lib/alternatives"
import { ArrowRight } from "lucide-react"
import "@/app/waitlist/waitlist.css"

export const metadata: Metadata = {
  title: "ChronoFlow vs. Alternatives | Compare Productivity Tools for Engineering Teams",
  description:
    "See how ChronoFlow compares to ClickUp, Motion, Reclaim, Clockwise, and Lindy. Unified calendar, email, and tasks built for engineering teams.",
  alternates: { canonical: "/alternatives" },
  openGraph: {
    title: "ChronoFlow vs. Alternatives | Compare Productivity Tools for Engineering Teams",
    description:
      "See how ChronoFlow compares to ClickUp, Motion, Reclaim, Clockwise, and Lindy. Unified calendar, email, and tasks built for engineering teams.",
    type: "website",
    url: "/alternatives",
  },
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--cf-accent)" />
      <path d="M16 7C11.03 7 7 11.03 7 16s4.03 9 9 9 9-4.03 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 11v5l3 3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AlternativesIndexPage() {
  return (
    <div className="cf-waitlist min-h-screen">
      <header className="border-b border-[var(--cf-border)] bg-[var(--cf-bg)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/waitlist" className="flex items-center gap-2">
            <Logo />
            <span className="font-mono text-sm font-semibold tracking-tight text-[var(--cf-text)]">chronoflow</span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link href="/blog" className="text-sm text-[var(--cf-text-muted)] hover:text-[var(--cf-text)] transition-colors">Blog</Link>
            <Link href="/alternatives" className="text-sm font-medium text-[var(--cf-accent)]">Compare</Link>
            <Link href="/waitlist" className="rounded-md bg-[var(--cf-accent)] px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              Join beta
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-14 sm:px-8">
        <div className="mb-12">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-[var(--cf-text)]">
            ChronoFlow vs. the alternatives
          </h1>
          <p className="max-w-xl text-[var(--cf-text-muted)] leading-relaxed">
            How does ChronoFlow compare to the tools you're already considering? We've put together honest, side-by-side comparisons for engineering teams.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {alternatives.map((alt) => (
            <Link
              key={alt.slug}
              href={`/alternatives/${alt.slug}`}
              className="group flex flex-col rounded-xl border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] p-5 hover:border-[var(--cf-accent)] hover:shadow-sm transition-all"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--cf-text-dim)] uppercase tracking-wide">
                  ChronoFlow vs.
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--cf-text-dim)] group-hover:text-[var(--cf-accent)] transition-colors" />
              </div>
              <h2 className="mb-1 text-lg font-semibold text-[var(--cf-text)] group-hover:text-[var(--cf-accent)] transition-colors">
                {alt.tool}
              </h2>
              <p className="text-sm text-[var(--cf-text-muted)]">{alt.tagline}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-[var(--cf-border)] bg-[var(--cf-accent-soft)] px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-medium text-[var(--cf-text)]">Ready to try ChronoFlow?</p>
            <p className="mt-0.5 text-sm text-[var(--cf-text-muted)]">
              Join the private beta — unified calendar, email, and tasks for engineering teams.
            </p>
          </div>
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--cf-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity shrink-0"
          >
            Join the waitlist <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <footer className="border-t border-[var(--cf-border)] bg-[var(--cf-bg)]">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
          <span className="font-mono text-xs text-[var(--cf-text-muted)]">chronoflow · © {new Date().getFullYear()}</span>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--cf-text-muted)]">
            <Link href="/privacy" className="hover:text-[var(--cf-text)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--cf-text)] transition-colors">Terms</Link>
            <Link href="/blog" className="hover:text-[var(--cf-text)] transition-colors">Blog</Link>
            <Link href="/alternatives" className="hover:text-[var(--cf-text)] transition-colors">Compare</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
