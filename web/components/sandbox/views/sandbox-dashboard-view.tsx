"use client"

import { Calendar, CheckCircle, Inbox, Target, Timer } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/page-header"
import { useSandbox } from "@/components/sandbox/sandbox-context"
import { SANDBOX_USER } from "@/lib/sandbox-data"
import type { SandboxView } from "@/components/sandbox/sandbox-types"

const EVENT_BAR_COLORS = [
  "rgba(var(--cf-accent-rgb), 1)",
  "rgba(var(--cf-primary-rgb), 1)",
  "#ea580c",
  "#16a34a",
  "#9333ea",
] as const

export function SandboxDashboardView() {
  const sandbox = useSandbox()
  if (!sandbox) return null

  const data = sandbox.dashboardData
  const firstName = SANDBOX_USER.name.split(" ")[0]

  const quickLinks: Array<{
    view: SandboxView
    label: string
    detail: string
    icon: typeof Target
    accent: string
  }> = [
    {
      view: "tasks",
      label: "Tasks",
      detail: `${data.tasks.pending} pending`,
      icon: Target,
      accent: "rgba(var(--cf-accent-rgb), 1)",
    },
    {
      view: "mail",
      label: "Mail",
      detail: `${data.emails.unread} unread`,
      icon: Inbox,
      accent: "#ea580c",
    },
    {
      view: "focus",
      label: "Focus",
      detail: data.focus.isActive
        ? data.focus.isRunning
          ? `${data.focus.currentSession?.minutesRemaining ?? 0}m left`
          : "Paused"
        : `${data.focus.todayMinutes}m today`,
      icon: Timer,
      accent: "rgba(var(--cf-primary-rgb), 1)",
    },
    {
      view: "calendar",
      label: "Calendar",
      detail: `${data.calendar.todayEvents.length} today`,
      icon: Calendar,
      accent: "#9333ea",
    },
  ]

  return (
    <div className="cf-page-shell">
      <div className="cf-page-inner space-y-5">
        <PageHeader
          title={`Good afternoon, ${firstName}`}
          subtitle={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
                {data.tasks.completed} done
              </span>
              <span className="text-[var(--cf-text-dim)]">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[rgba(var(--cf-primary-rgb),1)]" />
                {data.calendar.todayEvents.length} events
              </span>
              <span className="text-[var(--cf-text-dim)]">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5 text-orange-500" />
                {data.emails.unread} unread
              </span>
            </span>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickLinks.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => sandbox.navigate(item.view)}
              className="cf-surface-card block w-full p-3 text-left transition-colors hover:border-[rgba(var(--cf-accent-rgb),0.35)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: `color-mix(in srgb, ${item.accent} 12%, transparent)`,
                    color: item.accent,
                  }}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--cf-text)]">{item.label}</p>
                  <p className="truncate text-xs text-[var(--cf-text-muted)]">{item.detail}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Card className="cf-surface-card h-full border-0">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-primary" />
                  Today&apos;s Schedule
                </CardTitle>
                <CardDescription>
                  {data.calendar.todayEvents.length
                    ? `${data.calendar.todayEvents.length} events`
                    : "No events scheduled"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pb-5">
                {data.calendar.todayEvents.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No events scheduled for today.
                  </p>
                ) : (
                  data.calendar.todayEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg bg-muted/30 p-3"
                  >
                    <div
                      className="mt-0.5 h-12 w-1.5 shrink-0 rounded-full"
                      style={{ background: EVENT_BAR_COLORS[index % EVENT_BAR_COLORS.length] }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-foreground">{event.summary}</h4>
                        <span className="text-sm text-muted-foreground">
                          {event.start.dateTime && event.end.dateTime ? (
                            <>
                              {format(parseISO(event.start.dateTime), "h:mm a")} –{" "}
                              {format(parseISO(event.end.dateTime), "h:mm a")}
                            </>
                          ) : (
                            "All day"
                          )}
                        </span>
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {event.location ?? "Meeting"}
                      </Badge>
                    </div>
                  </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="cf-surface-card border-0">
            <CardHeader className="pb-2 pt-5">
              <CardTitle className="text-base font-semibold">Today&apos;s Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-5">
              {data.focus.isActive && data.focus.currentSession && (
                <div className="rounded-lg border border-[rgba(var(--cf-accent-rgb),0.3)] bg-[rgba(var(--cf-accent-rgb),0.06)] p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-[rgba(var(--cf-accent-rgb),1)]">
                    {data.focus.isRunning ? "Focus session live" : "Focus session paused"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--cf-text)]">
                    {data.focus.currentSession.title}
                  </p>
                  <p className="text-xs text-[var(--cf-text-muted)]">
                    {data.focus.currentSession.minutesRemaining} min remaining
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tasks completed</span>
                <span className="text-sm font-semibold text-primary">
                  {data.tasks.completed}/{data.tasks.total}
                </span>
              </div>
              <Progress
                value={
                  data.tasks.total > 0 ? (data.tasks.completed / data.tasks.total) * 100 : 0
                }
                className="h-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Focus time</span>
                <span className="text-sm font-semibold">{data.focus.todayMinutes}m</span>
              </div>
              {data.focus.sessionsToday > 0 && (
                <p className="text-xs text-muted-foreground">
                  {data.focus.sessionsToday} session{data.focus.sessionsToday === 1 ? "" : "s"} today
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
