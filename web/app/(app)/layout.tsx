import { Suspense } from "react"

import "@/app/waitlist/waitlist.css"
import "@/app/app-shell.css"

import { NextAuthProvider } from "@/components/next-auth-provider"
import ReduxProvider from "@/components/redux-provider"

const themeBootScript = `(function(){try{if(localStorage.getItem('cf-theme')==='dark'){document.documentElement.setAttribute('data-cf-theme','dark');}}catch(e){}})();`

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      <Suspense fallback={<div className="cf-app p-8 text-[var(--cf-text-muted)]">Loading…</div>}>
        <ReduxProvider>
          <NextAuthProvider>
            <div className="cf-app cf-app-host min-h-screen" suppressHydrationWarning>
              {children}
            </div>
          </NextAuthProvider>
        </ReduxProvider>
      </Suspense>
    </>
  )
}
