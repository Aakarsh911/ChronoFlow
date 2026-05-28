import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getAlternative, getAllAlternativeSlugs, alternatives } from "@/lib/alternatives"
import { getSiteUrl } from "@/lib/waitlist-seo"
import { Check, X, ArrowRight, ChevronRight } from "lucide-react"
import "@/app/waitlist/waitlist.css"

interface Props {
  params: Promise<{ tool: string }>
}

export function generateStaticParams() {
  return getAllAlternativeSlugs().map((slug) => ({ tool: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params
  const alt = getAlternative(tool)
  if (!alt) return {}

  const siteUrl = getSiteUrl()

  return {
    title: alt.titleTag,
    description: alt.metaDescription,
    alternates: { canonical: `/alternatives/${tool}` },
    openGraph: {
      title: alt.titleTag,
      description: alt.metaDescription,
      type: "website",
      url: `${siteUrl}/alternatives/${tool}`,
    },
  }
}

function Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--cf-accent)" />
      <path d="M16 7C11.03 7 7 11.03 7 16s4.03 9 9 9 9-4.03 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 11v5l3 3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async function AlternativeToolPage({ params }: Props) {
  const { tool } = await params
  const alt = getAlternative(tool)
  if (!alt) return notFound()

  const siteUrl = getSiteUrl()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: alt.titleTag,
    description: alt.metaDescription,
    url: `${siteUrl}/alternatives/${tool}`,
  }

  // Other alternatives for cross-linking
  const others = alternatives.filter((a) => a.slug !== tool).slice(0, 3)

  return (
    <div className="cf-waitlist min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <header className="border-b border-[var(--cf-border)] bg-[var(--cf-bg)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/waitlist" className="flex items-center gap-2">
            <Logo />
            <span className="font-mono text-sm font-semibold tracking-tight text-[var(--cf-text)]">chronoflow</span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link href="/blog" className="text-sm text-[var(--cf-text-muted)] hover:text-[var(--cf-text)] transition-colors">Blog</Link>
            <Link href="/alternatives" className="text-sm text-[var(--cf-text-muted)] hover:text-[var(--cf-text)] transition-colors">← Compare</Link>
            <Link href="/waitlist" className="rounded-md bg-[var(--cf-accent)] px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              Join beta
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-[var(--cf-text-dim)]">
          <Link href="/alternatives" className="hover:text-[var(--cf-text)] transition-colors">Compare</Link>
          <ChevronRight className="h-3 w-3" />
          <span>vs. {alt.tool}</span>
        </nav>

        {/* H1 */}
        <h1 className="mb-4 text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-[var(--cf-text)]">
          ChronoFlow vs {alt.tool}:{" "}
          <span className="text-[var(--cf-accent)]">{alt.tagline}</span>
        </h1>

        {/* Intro */}
        <p className="mb-10 max-w-2xl text-[var(--cf-text-muted)] leading-relaxed">{alt.intro}</p>

        {/* Comparison table */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-[var(--cf-text)]">Side-by-side comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--cf-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)]">
                  <th className="px-4 py-3 text-left font-semibold text-[var(--cf-text-dim)]">Feature</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--cf-text-dim)]">{alt.tool}</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--cf-accent)]">ChronoFlow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--cf-border)] bg-[var(--cf-bg-elev)]">
                {alt.comparison.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-[var(--cf-text-muted)] font-medium">{row.feature}</td>
                    <td className="px-4 py-3 text-[var(--cf-text-muted)]">
                      {row.competitor === "No" ? (
                        <span className="flex items-center gap-1 text-[var(--cf-text-dim)]">
                          <X className="h-3.5 w-3.5" /> No
                        </span>
                      ) : (
                        row.competitor
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--cf-text)]">
                      {row.chronoflow === "Yes" || row.chronoflow.startsWith("Yes") ? (
                        <span className="flex items-start gap-1 text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {row.chronoflow}
                        </span>
                      ) : (
                        row.chronoflow
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Where competitor excels */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-[var(--cf-text)]">Where {alt.tool} excels</h2>
          <ul className="space-y-2">
            {alt.competitorExcels.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-[var(--cf-text-muted)] text-sm leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--cf-border-strong)] shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* Where ChronoFlow is different */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-[var(--cf-text)]">Where ChronoFlow is different</h2>
          <ul className="space-y-3">
            {alt.chronoflowDifferent.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="mt-1 h-4 w-4 rounded-full bg-[var(--cf-accent-soft)] flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5 text-[var(--cf-accent)]" />
                </span>
                <span className="text-[var(--cf-text-muted)]">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Who should switch */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-[var(--cf-text)]">Who should use ChronoFlow instead</h2>
          <ul className="space-y-2">
            {alt.whoShouldSwitch.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-[var(--cf-text-muted)] text-sm leading-relaxed">
                <ArrowRight className="mt-0.5 h-4 w-4 text-[var(--cf-accent)] shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-accent-soft)] px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
          <div>
            <p className="font-semibold text-[var(--cf-text)]">Try ChronoFlow free during the beta</p>
            <p className="mt-1 text-sm text-[var(--cf-text-muted)]">
              Connect Google or Microsoft via OAuth. No credit card, no migration.
            </p>
          </div>
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--cf-accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity shrink-0"
          >
            Join the waitlist <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Other comparisons */}
        {others.length > 0 && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--cf-text-dim)]">
              More comparisons
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {others.map((other) => (
                <Link
                  key={other.slug}
                  href={`/alternatives/${other.slug}`}
                  className="group rounded-lg border border-[var(--cf-border)] px-4 py-3 hover:border-[var(--cf-accent)] transition-colors"
                >
                  <p className="text-xs text-[var(--cf-text-dim)] mb-0.5">vs.</p>
                  <p className="text-sm font-medium text-[var(--cf-text)] group-hover:text-[var(--cf-accent)] transition-colors">
                    {other.tool}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
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
