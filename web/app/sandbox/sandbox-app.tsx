"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  BarChart3,
  Calendar,
  Clock,
  Home,
  Mail,
  Menu,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react"

import { AppLogo } from "@/components/app-logo"
import { ThemeToggle } from "@/app/waitlist/theme-toggle"
import { WaitlistForm } from "@/app/waitlist/waitlist-form"
import { SandboxProvider, useSandbox } from "@/components/sandbox/sandbox-context"
import type { SandboxView } from "@/components/sandbox/sandbox-types"
import { SandboxViewRouter } from "@/components/sandbox/views"
import { cn } from "@/lib/utils"
import { useTrackEvent } from "@/lib/use-track-event"
import { SandboxAiDrawer } from "./sandbox-ai-drawer"
import { SandboxExitModal } from "./sandbox-exit-modal"

const NAV: Array<{ id: SandboxView; title: string; icon: typeof Home }> = [
  { id: "dashboard", title: "Dashboard", icon: Home },
  { id: "mail", title: "Mail", icon: Mail },
  { id: "tasks", title: "Tasks", icon: Target },
  { id: "calendar", title: "Calendar", icon: Calendar },
  { id: "focus", title: "Focus", icon: Clock },
  { id: "team", title: "Team", icon: Users },
  { id: "analytics", title: "Analytics", icon: BarChart3 },
]

export function SandboxApp() {
  const [view, setView] = useState<SandboxView>("mail")
  const navigate = useCallback((next: SandboxView) => setView(next), [])

  return (
    <SandboxProvider onNavigate={navigate}>
      <SandboxChrome view={view} onNavigate={navigate} />
    </SandboxProvider>
  )
}

function SandboxChrome({
  view,
  onNavigate,
}: {
  view: SandboxView
  onNavigate: (view: SandboxView) => void
}) {
  const track = useTrackEvent("/sandbox")
  const sandbox = useSandbox()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [waitlistOpen, setWaitlistOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const exitShown = useRef(false)
  const sessionStart = useRef(Date.now())

  const switchView = useCallback(
    (next: SandboxView) => {
      onNavigate(next)
      setSidebarOpen(false)
      track(`sandbox_view_${next}`)
    },
    [onNavigate, track],
  )

  useEffect(() => {
    track("sandbox_session_start")
    track("sandbox_view_mail")
  }, [track])

  useEffect(() => {
    const onMouseOut = (e: MouseEvent) => {
      if (exitShown.current) return
      if (e.clientY > 12) return
      if (Date.now() - sessionStart.current < 8000) return
      exitShown.current = true
      setExitOpen(true)
      track("sandbox_exit_intent_shown")
    }
    document.addEventListener("mouseout", onMouseOut)
    return () => document.removeEventListener("mouseout", onMouseOut)
  }, [track])

  const openWaitlist = (source: string) => {
    setWaitlistOpen(true)
    track("sandbox_waitlist_open", { props: { source } })
  }

  const currentNav = NAV.find((n) => n.id === view)
  const openTaskCount = sandbox
    ? sandbox.tasks.filter((t) => t.status !== "Done").length
    : 0

  return (
    <div className="relative flex min-h-screen">
      <div className="pointer-events-none fixed inset-0 cf-grid opacity-70" aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] cf-glow" aria-hidden />

      <aside
        className={cn(
          "cf-app-sidebar transition-transform duration-300 ease-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <Link
            href="/sandbox"
            className="flex h-[65px] shrink-0 flex-col items-center justify-center gap-1 border-b border-[var(--cf-border)] px-2"
          >
            <AppLogo size="sm" />
            <span className="font-mono text-[9px] font-semibold tracking-tight text-[var(--cf-text-muted)]">
              demo mode
            </span>
          </Link>

          <nav className="mt-4 flex flex-1 flex-col gap-1 px-2">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchView(item.id)}
                  className={cn("cf-app-nav-item relative w-full", view === item.id && "is-active")}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  <span>{item.title}</span>
                  {item.id === "tasks" && openTaskCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[rgba(var(--cf-accent-rgb),1)] px-1 font-mono text-[9px] font-bold text-white">
                      {openTaskCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="border-t border-[var(--cf-border)] p-2">
            <button
              type="button"
              onClick={() => {
                setAiOpen(true)
                track("sandbox_ai_open")
              }}
              className="cf-app-nav-item w-full text-[rgba(var(--cf-accent-rgb),1)]"
            >
              <Zap className="h-5 w-5" strokeWidth={1.75} />
              <span>Ask ChronoFlow</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="cf-sandbox-main">
        <header className="cf-app-header cf-sandbox-header">
          <div className="flex w-full items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md p-1.5 text-[var(--cf-text-muted)] hover:bg-[var(--cf-bg-soft)] lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="font-mono text-sm font-medium text-[var(--cf-text)]">
                {currentNav?.title ?? "Dashboard"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => openWaitlist("header")}
                className="hidden rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3 py-1.5 font-mono text-[11px] text-[var(--cf-text)] hover:border-[rgba(var(--cf-accent-rgb),0.5)] sm:inline-flex"
              >
                Get early access
              </button>
            </div>
          </div>
        </header>

        <div className="cf-sandbox-demo-banner px-3 py-2 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] sm:text-[13px]">
            <div className="flex items-center gap-2">
              <span className="cf-chip-accent rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                Interactive demo
              </span>
              <span className="text-[var(--cf-text-muted)]">
                Sample data · mirrors the authenticated app UI
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/waitlist"
                className="hidden font-mono text-[11px] text-[var(--cf-text-muted)] hover:text-[var(--cf-text)] sm:inline"
              >
                About ChronoFlow
              </Link>
              <button
                type="button"
                onClick={() => openWaitlist("banner")}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold text-white transition hover:brightness-110"
                style={{
                  background:
                    "linear-gradient(110deg, rgba(var(--cf-accent-rgb), 1), rgba(var(--cf-primary-rgb), 1))",
                }}
              >
                Join waitlist
              </button>
            </div>
          </div>
        </div>

        <main className="cf-app-content min-h-0 flex-1 overflow-x-hidden pb-24">
          <SandboxViewRouter view={view} />
        </main>
      </div>

      {!waitlistOpen && (
        <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2">
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--cf-border-strong)] bg-[color-mix(in_oklch,var(--cf-bg-elev)_94%,transparent)] p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[var(--cf-text-muted)]">
              <span className="font-medium text-[var(--cf-text)]">Like what you see?</span>{" "}
              Join the waitlist for early access.
            </p>
            <button
              type="button"
              onClick={() => openWaitlist("floating")}
              className="shrink-0 rounded-md px-4 py-2 font-mono text-[12px] font-semibold text-white"
              style={{
                background:
                  "linear-gradient(110deg, rgba(var(--cf-accent-rgb), 1), rgba(var(--cf-primary-rgb), 1))",
              }}
            >
              Join waitlist
            </button>
          </div>
        </div>
      )}

      {waitlistOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setWaitlistOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-6 shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--cf-text)]">Get early access</h2>
                <p className="mt-1 text-sm text-[var(--cf-text-muted)]">
                  Join the waitlist for priority beta invites.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWaitlistOpen(false)}
                className="rounded-md p-1 text-[var(--cf-text-muted)] hover:bg-[var(--cf-bg-soft)]"
                aria-label="Close waitlist form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5">
              <WaitlistForm
                variant="hero"
                source="sandbox"
                onJoined={() => track("sandbox_waitlist_join", { props: { source: "modal" } })}
              />
            </div>
          </div>
        </div>
      )}

      <SandboxAiDrawer
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onPrompt={(prompt) => track("sandbox_ai_prompt", { props: { prompt } })}
      />

      <SandboxExitModal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        onJoin={() => track("sandbox_exit_intent_join")}
      />
    </div>
  )
}
