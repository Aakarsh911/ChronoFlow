import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getAllPosts, getAllSlugs, getPost } from "@/lib/blog"
import { blogPostMetadata } from "@/lib/blog-seo"
import { getSiteUrl } from "@/lib/waitlist-seo"
import { ArrowLeft, ArrowRight, Clock, Tag } from "lucide-react"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}

  return blogPostMetadata(post)
}

function Logo() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return notFound()

  const allPosts = await getAllPosts()
  const currentIndex = allPosts.findIndex((p) => p.slug === slug)
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null

  const siteUrl = getSiteUrl()
  const postUrl = `${siteUrl}/blog/${slug}`

  // JSON-LD Article schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    url: postUrl,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "ChronoFlow",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/favicon.png`,
      },
    },
    keywords: post.tags.join(", "),
  }

  return (
    <div className="cf-waitlist min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
            <Link href="/blog" className="text-sm text-[var(--cf-text-muted)] hover:text-[var(--cf-text)] transition-colors">
              ← Blog
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

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
          {/* Article */}
          <div className="min-w-0">
            {/* Header */}
            <header className="mb-8">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--cf-text-dim)]">
                <span>{post.author}</span>
                <span>·</span>
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

              <h1 className="mb-4 text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-[var(--cf-text)]">
                {post.title}
              </h1>

              <p className="text-[var(--cf-text-muted)] leading-relaxed">{post.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
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
            </header>

            {/* Post body */}
            <div className="blog-prose [&_code]:rounded [&_code]:bg-[var(--cf-bg-soft)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-[var(--cf-text)] [&_pre_code]:bg-transparent [&_pre_code]:px-0 [&_pre_code]:py-0">
              {post.content()}
            </div>

            {/* Author bio */}
            <div className="mt-12 rounded-xl border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-6 py-5">
              <p className="mb-1 text-sm font-semibold text-[var(--cf-text)]">ChronoFlow Team</p>
              <p className="text-sm leading-relaxed text-[var(--cf-text-muted)]">
                ChronoFlow unifies your calendar, email, and tasks across Google and Microsoft.{" "}
                <Link
                  href="/waitlist"
                  className="text-[var(--cf-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Join the beta at chronoflow.work/waitlist
                </Link>
                .
              </p>
            </div>

            {/* Prev / Next */}
            {(prevPost || nextPost) && (
              <nav
                className="mt-10 grid grid-cols-2 gap-4 border-t border-[var(--cf-border)] pt-8"
                aria-label="Post navigation"
              >
                <div>
                  {prevPost && (
                    <Link
                      href={`/blog/${prevPost.slug}`}
                      className="group flex flex-col gap-1"
                    >
                      <span className="flex items-center gap-1 text-xs text-[var(--cf-text-dim)]">
                        <ArrowLeft className="h-3 w-3" /> Older
                      </span>
                      <span className="text-sm font-medium text-[var(--cf-text)] group-hover:text-[var(--cf-accent)] transition-colors leading-snug">
                        {prevPost.title}
                      </span>
                    </Link>
                  )}
                </div>
                <div className="text-right">
                  {nextPost && (
                    <Link
                      href={`/blog/${nextPost.slug}`}
                      className="group flex flex-col items-end gap-1"
                    >
                      <span className="flex items-center gap-1 text-xs text-[var(--cf-text-dim)]">
                        Newer <ArrowRight className="h-3 w-3" />
                      </span>
                      <span className="text-sm font-medium text-[var(--cf-text)] group-hover:text-[var(--cf-accent)] transition-colors leading-snug">
                        {nextPost.title}
                      </span>
                    </Link>
                  )}
                </div>
              </nav>
            )}
          </div>

          {/* Sidebar (desktop only) */}
          {post.sections && post.sections.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--cf-text-dim)]">
                Contents
              </p>
              <nav className="flex flex-col gap-1 text-sm">
                {(post.sections ?? []).map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="text-[var(--cf-text-muted)] hover:text-[var(--cf-text)] transition-colors py-0.5"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="mt-8 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-4">
                <p className="mb-2 text-xs font-semibold text-[var(--cf-text)]">Try ChronoFlow</p>
                <p className="mb-3 text-xs text-[var(--cf-text-muted)] leading-relaxed">
                  Unified calendar, email, and tasks for engineering teams.
                </p>
                <Link
                  href="/waitlist"
                  className="inline-flex w-full items-center justify-center rounded-md bg-[var(--cf-accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                >
                  Join the beta
                </Link>
              </div>
            </div>
          </aside>
          )}
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
