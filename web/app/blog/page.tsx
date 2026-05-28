import type { Metadata } from "next"
import Link from "next/link"
import { getAllPosts } from "@/lib/blog"
import { getSiteUrl } from "@/lib/waitlist-seo"
import { ArrowRight, Clock, Tag } from "lucide-react"
import "@/app/waitlist/waitlist.css"

export const metadata: Metadata = {
  title: "Blog — ChronoFlow",
  description:
    "Technical writing from the ChronoFlow team. Deep dives on calendar sync, multi-provider OAuth, AI task extraction, and building for engineering teams.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — ChronoFlow",
    description:
      "Technical writing from the ChronoFlow team. Deep dives on calendar sync, AI task extraction, and building for engineering teams.",
    type: "website",
    url: "/blog",
  },
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--cf-accent)" />
      <path
        d="M16 7C11.03 7 7 11.03 7 16s4.03 9 9 9 9-4.03 9-9"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M16 11v5l3 3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts()

  return (
    <div className="cf-waitlist min-h-screen">
      {/* Nav */}
      <header className="border-b border-[var(--cf-border)] bg-[var(--cf-bg)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/waitlist" className="flex items-center gap-2" aria-label="ChronoFlow home">
            <Logo />
            <span className="font-mono text-sm font-semibold tracking-tight text-[var(--cf-text)]">
              chronoflow
            </span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              href="/blog"
              className="text-sm font-medium text-[var(--cf-accent)]"
            >
              Blog
            </Link>
            <Link
              href="/alternatives"
              className="text-sm text-[var(--cf-text-muted)] hover:text-[var(--cf-text)] transition-colors"
            >
              Compare
            </Link>
            <Link
              href="/waitlist"
              className="rounded-md bg-[var(--cf-accent)] px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Join beta
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-14 sm:px-8">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-[var(--cf-text)]">
            Blog
          </h1>
          <p className="max-w-xl text-[var(--cf-text-muted)] leading-relaxed">
            Technical writing from the ChronoFlow team — calendar sync, AI task extraction,
            multi-provider OAuth, and building productivity tools for engineering teams.
          </p>
        </div>

        {/* CTA */}
        <div className="mb-10 rounded-xl border border-[var(--cf-border)] bg-[var(--cf-accent-soft)] px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-medium text-[var(--cf-text)]">ChronoFlow is in private beta</p>
            <p className="mt-0.5 text-sm text-[var(--cf-text-muted)]">
              Unified calendar, email, and tasks for engineering teams.
            </p>
          </div>
          <Link
            href="/waitlist"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--cf-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity shrink-0"
          >
            Join the waitlist <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Posts */}
        <div className="divide-y divide-[var(--cf-border)]">
          {posts.map((post) => (
            <article key={post.slug} className="py-8 group">
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--cf-text-dim)]">
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {post.readTime} read
                  </span>
                </div>

                <h2 className="mb-2 text-lg font-semibold text-[var(--cf-text)] group-hover:text-[var(--cf-accent)] transition-colors leading-snug">
                  {post.title}
                </h2>

                <p className="mb-4 text-sm leading-relaxed text-[var(--cf-text-muted)]">
                  {post.description}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--cf-border)] px-2.5 py-0.5 text-xs text-[var(--cf-text-dim)]"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--cf-border)] bg-[var(--cf-bg)]">
        <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
          <span className="font-mono text-xs text-[var(--cf-text-muted)]">
            chronoflow · © {new Date().getFullYear()}
          </span>
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
