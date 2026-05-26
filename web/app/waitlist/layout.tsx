import type { Viewport } from "next"
import "./waitlist.css"

import {
  getSiteUrl,
  waitlistJsonLd,
  waitlistPageMetadata,
} from "@/lib/waitlist-seo"

export const metadata = waitlistPageMetadata(getSiteUrl())

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
  const jsonLd = waitlistJsonLd(getSiteUrl())

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="cf-waitlist" suppressHydrationWarning>
        {children}
      </div>
    </>
  )
}
