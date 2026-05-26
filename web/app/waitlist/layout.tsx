import type { Metadata, Viewport } from "next"
import "./waitlist.css"

const TITLE =
  "ChronoFlow — Where engineering tasks stop falling through the cracks."
const DESCRIPTION =
  "The unified workspace for software engineers buried in Slack, Gmail, Jira, and Calendar. AI extracts action items from your inbox automatically. Team scheduling, focus blocks, and a chat drawer that runs actions across your tools."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
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
    title: TITLE,
    description: DESCRIPTION,
    siteName: "ChronoFlow",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.png" },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
}

// Runs synchronously before any waitlist markup paints, so the theme is
// already set when the CSS variables are read. Reads from localStorage
// first, then falls back to the user's OS preference. Failures are
// silently ignored so the page still renders in the default dark theme.
const themeBootScript = `(function(){try{var s=localStorage.getItem('cf-theme');var t=s||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark');document.documentElement.setAttribute('data-cf-theme',t);}catch(e){document.documentElement.setAttribute('data-cf-theme','dark');}})();`

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <div className="cf-waitlist" suppressHydrationWarning>
        {children}
      </div>
    </>
  )
}
