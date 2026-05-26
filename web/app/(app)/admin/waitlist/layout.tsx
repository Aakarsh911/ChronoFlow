import type { Metadata } from "next"
import "@/app/waitlist/waitlist.css"

export const metadata: Metadata = {
  title: "Waitlist admin — ChronoFlow",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png" },
}

const themeBootScript = `(function(){try{var s=localStorage.getItem('cf-theme');var t=s||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark');document.documentElement.setAttribute('data-cf-theme',t);}catch(e){document.documentElement.setAttribute('data-cf-theme','dark');}})();`

export default function AdminWaitlistLayout({
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
