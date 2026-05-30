import type { Metadata } from "next"
import type { Viewport } from "next"

import "@/app/waitlist/waitlist.css"
import "@/app/app-shell.css"

import { TrackPageView } from "@/app/waitlist/track-pageview"

const themeBootScript = `(function(){try{if(localStorage.getItem('cf-theme')==='dark'){document.documentElement.setAttribute('data-cf-theme','dark');}}catch(e){}})();`

export const metadata: Metadata = {
  title: "Try ChronoFlow — Interactive Demo for Engineering Teams",
  description:
    "Explore ChronoFlow with sample data. See how calendar, email, tasks, and focus time work together — no signup required.",
  alternates: { canonical: "/sandbox" },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: "#f7f8fa",
  colorScheme: "light",
}

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <div className="cf-app cf-app-host min-h-screen" suppressHydrationWarning>
        <TrackPageView path="/sandbox" />
        {children}
      </div>
    </>
  )
}
