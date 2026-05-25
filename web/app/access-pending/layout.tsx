import type { Metadata, Viewport } from "next"
import "../waitlist/waitlist.css"

export const metadata: Metadata = {
  title: "Access pending — ChronoFlow",
  description:
    "ChronoFlow is in private beta. Access is invite-only while we roll out gradually.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png" },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
}

const themeBootScript = `(function(){try{var s=localStorage.getItem('cf-theme');var t=s||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark');document.documentElement.setAttribute('data-cf-theme',t);}catch(e){document.documentElement.setAttribute('data-cf-theme','dark');}})();`

export default function AccessPendingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <div className="cf-waitlist" suppressHydrationWarning>
        {children}
      </div>
    </>
  )
}
