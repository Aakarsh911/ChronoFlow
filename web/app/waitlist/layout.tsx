import type { Metadata, Viewport } from "next"
import "./waitlist.css"

const TITLE = "ChronoFlow — Say it. It's done."
const DESCRIPTION =
  "An AI teammate for software engineers. Executes tasks across Calendar, Gmail, GitHub, Jira, and Slack using voice or text. No context switching, no dropped tasks."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "ChronoFlow",
  keywords: [
    "ChronoFlow",
    "AI assistant for engineers",
    "developer productivity",
    "voice AI",
    "natural language tasks",
    "Jira AI",
    "GitHub AI",
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
