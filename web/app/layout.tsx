import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { NextAuthProvider } from "@/components/next-auth-provider"
import ReduxProvider from "@/components/redux-provider"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "ChronoFlow",
  description: "ChronoFlow is an AI-powered productivity platform that unifies your calendar, email, and task management. Seamlessly integrate Google Calendar, Outlook, and Gmail to optimize your schedule, extract tasks from emails, and boost your focus with intelligent time blocking.",
  generator: "v0.app",
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <ReduxProvider>
            <NextAuthProvider>{children}</NextAuthProvider>
          </ReduxProvider>
        </Suspense>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
