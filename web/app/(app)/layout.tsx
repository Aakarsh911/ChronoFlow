import { Suspense } from "react"

import { NextAuthProvider } from "@/components/next-auth-provider"
import ReduxProvider from "@/components/redux-provider"

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReduxProvider>
        <NextAuthProvider>{children}</NextAuthProvider>
      </ReduxProvider>
    </Suspense>
  )
}
