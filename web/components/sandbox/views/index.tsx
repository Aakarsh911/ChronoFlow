"use client"

import type { SandboxView } from "@/components/sandbox/sandbox-types"
import { SandboxAnalyticsView } from "./sandbox-analytics-view"
import { SandboxCalendarView } from "./sandbox-calendar-view"
import { SandboxDashboardView } from "./sandbox-dashboard-view"
import { SandboxFocusView } from "./sandbox-focus-view"
import { SandboxMailView } from "./sandbox-mail-view"
import { SandboxTasksView } from "./sandbox-tasks-view"
import { SandboxTeamView } from "./sandbox-team-view"

export function SandboxViewRouter({ view }: { view: SandboxView }) {
  switch (view) {
    case "dashboard":
      return <SandboxDashboardView />
    case "mail":
      return <SandboxMailView />
    case "tasks":
      return <SandboxTasksView />
    case "calendar":
      return <SandboxCalendarView />
    case "focus":
      return <SandboxFocusView />
    case "team":
      return <SandboxTeamView />
    case "analytics":
      return <SandboxAnalyticsView />
    default:
      return <SandboxMailView />
  }
}
