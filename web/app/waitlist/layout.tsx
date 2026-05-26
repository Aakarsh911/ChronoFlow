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
  themeColor: "#f7f8fa",
  colorScheme: "light",
}

// Runs synchronously before any waitlist markup paints. Light is the default
// — the CSS itself defines light as the default state, so we only need to
// set `data-cf-theme="dark"` when the user has explicitly toggled into dark
// (stored in localStorage). OS dark-mode preference is intentionally NOT
// honored here; the waitlist page is positioned as enterprise-feeling
// (Stripe / Linear / Vercel style) and that reads better in light by default.
const themeBootScript = `(function(){try{if(localStorage.getItem('cf-theme')==='dark'){document.documentElement.setAttribute('data-cf-theme','dark');}}catch(e){}})();`

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
