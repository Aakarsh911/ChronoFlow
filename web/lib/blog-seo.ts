import type { Metadata } from "next"
import { getSiteUrl } from "@/lib/waitlist-seo"

export function blogPageMetadata(path = "/blog"): Metadata {
  const siteUrl = getSiteUrl()

  return {
    title: "Blog — ChronoFlow",
    description:
      "Practical guides for software engineers — unified calendar and email, AI task extraction, and scheduling across Google and Microsoft.",
    metadataBase: new URL(siteUrl),
    alternates: { canonical: path },
    keywords: [
      "ChronoFlow blog",
      "productivity for software engineers",
      "Google Calendar Outlook sync",
      "AI task extraction from email",
      "team scheduling Microsoft Google",
      "unified inbox for developers",
    ],
    openGraph: {
      title: "Blog — ChronoFlow",
      description:
        "Practical guides for software engineers — calendar sync, inbox task extraction, and mixed-stack team scheduling.",
      type: "website",
      url: path,
      siteName: "ChronoFlow",
    },
    twitter: {
      card: "summary_large_image",
      title: "Blog — ChronoFlow",
      description:
        "Practical guides for software engineers — calendar sync, inbox task extraction, and mixed-stack team scheduling.",
    },
    robots: { index: true, follow: true },
  }
}

export function blogPostMetadata(post: {
  slug: string
  title: string
  description: string
  date: string
  tags: string[]
  author: string
}): Metadata {
  const siteUrl = getSiteUrl()
  const url = `${siteUrl}/blog/${post.slug}`

  return {
    title: `${post.title} — ChronoFlow Blog`,
    description: post.description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: `/blog/${post.slug}` },
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url,
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      siteName: "ChronoFlow",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    robots: { index: true, follow: true },
  }
}
