import type { Metadata } from "next"

export const TAGLINE_LEAD = "Your calendar, email, and tasks"
export const TAGLINE_ACCENT = "finally talk to each other."

export const WAITLIST_TITLE = `ChronoFlow — ${TAGLINE_LEAD} ${TAGLINE_ACCENT}`

export const WAITLIST_DESCRIPTION =
  "Unified workspace for software engineers. AI extracts action items from Gmail, Outlook, and Teams. Calendar, Jira, focus blocks, and team scheduling in one place. Free beta for waitlist members."

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  return raw.replace(/\/$/, "")
}

export function waitlistJsonLd(siteUrl: string) {
  const pageUrl = `${siteUrl}/waitlist`

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "ChronoFlow",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/favicon.png`,
        },
        description: WAITLIST_DESCRIPTION,
        sameAs: [],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "ChronoFlow",
        url: siteUrl,
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}/#webpage`,
        url: pageUrl,
        name: WAITLIST_TITLE,
        description: WAITLIST_DESCRIPTION,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: {
          "@type": "SoftwareApplication",
          name: "ChronoFlow",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: WAITLIST_DESCRIPTION,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            description: "Free during private beta",
          },
        },
        mainEntity: {
          "@type": "SoftwareApplication",
          name: "ChronoFlow",
          applicationCategory: "ProductivityApplication",
          description: WAITLIST_DESCRIPTION,
          featureList: [
            "AI task extraction from Gmail, Outlook, and Microsoft Teams",
            "Unified calendar across Google Calendar and Outlook",
            "Team scheduling with shared availability",
            "Focus time blocks and productivity analytics",
            "Ask ChronoFlow chat drawer for cross-tool actions",
            "Integrations with Slack, Gmail, Jira, GitHub, Google Calendar, and Outlook",
          ],
        },
      },
    ],
  }
}

export function waitlistLlmsTxt(siteUrl: string, blogPosts: { title: string; slug: string }[] = []): string {
  const blogSection =
    blogPosts.length > 0
      ? `\n## Blog\n${siteUrl}/blog\n${blogPosts.map((p) => `- ${p.title}: ${siteUrl}/blog/${p.slug}`).join("\n")}\n`
      : ""

  return `# ChronoFlow

> ${WAITLIST_DESCRIPTION}

## Waitlist
${siteUrl}/waitlist
${blogSection}
## Product summary
ChronoFlow is a unified productivity workspace for software engineers. Work shows up in Slack, Gmail, Jira, and Calendar, but the action often needs to happen somewhere else — tasks fall through those gaps.

## Key capabilities
- AI reads your inbox and Teams messages and extracts action items with priority and due dates
- Gmail and Outlook in one inbox; Google Calendar and Outlook in one calendar
- Team scheduling without back-and-forth email chains
- Focus blocks that survive daily reshuffles
- Ask ChronoFlow: type what you need and run actions across email, Jira, and calendar
- Integrations: Google, Microsoft, Jira, Slack, GitHub

## How it works
1. Connect Google, Microsoft, and Jira via OAuth
2. Calendar, email, tasks, and team messages sync incrementally
3. Gemini extracts action items from your inbox in batches
4. One workspace for your whole day — calendar, mail, tasks, focus time

## Beta access
Private beta with weekly invite rollouts. Join the waitlist at ${siteUrl}/waitlist
`
}

export function waitlistPageMetadata(siteUrl: string): Metadata {
  return {
    title: WAITLIST_TITLE,
    description: WAITLIST_DESCRIPTION,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: "/waitlist",
    },
    applicationName: "ChronoFlow",
    keywords: [
      "ChronoFlow",
      "productivity for software engineers",
      "AI task extraction from email",
      "Gmail Outlook task manager",
      "unified workspace for engineers",
      "team scheduling Microsoft Teams",
      "focus blocks for developers",
      "Jira GitHub Slack integration",
    ],
    openGraph: {
      title: WAITLIST_TITLE,
      description: WAITLIST_DESCRIPTION,
      siteName: "ChronoFlow",
      type: "website",
      locale: "en_US",
      url: "/waitlist",
    },
    twitter: {
      card: "summary_large_image",
      title: WAITLIST_TITLE,
      description: WAITLIST_DESCRIPTION,
    },
    robots: { index: true, follow: true },
    icons: { icon: "/favicon.png" },
  }
}
