export type AnalyticsInsight = {
  type: "success" | "warning" | "info"
  title: string
  description: string
  action: string
  impact: string
}

export const analyticsKpis = {
  week: {
    deepWorkHours: { value: "14.2h", delta: "+2.1h", trend: "up" as const, label: "vs last week" },
    contextSwitches: { value: "23", delta: "-4", trend: "up" as const, label: "per day avg" },
    emailToTaskRate: { value: "68%", delta: "+9%", trend: "up" as const, label: "triaged in 24h" },
    meetingHours: { value: "9.5h", delta: "-1.2h", trend: "up" as const, label: "vs last week" },
  },
  month: {
    deepWorkHours: { value: "58h", delta: "+6.4h", trend: "up" as const, label: "vs last month" },
    contextSwitches: { value: "26", delta: "-2", trend: "up" as const, label: "per day avg" },
    emailToTaskRate: { value: "61%", delta: "+4%", trend: "up" as const, label: "triaged in 24h" },
    meetingHours: { value: "41h", delta: "-3h", trend: "up" as const, label: "vs last month" },
  },
}

export const weeklyWorkMix = [
  { day: "Mon", deepWork: 3.2, meetings: 1.5, email: 1.1, admin: 0.4 },
  { day: "Tue", deepWork: 2.4, meetings: 2.8, email: 1.3, admin: 0.5 },
  { day: "Wed", deepWork: 3.8, meetings: 0.8, email: 0.9, admin: 0.3 },
  { day: "Thu", deepWork: 1.6, meetings: 3.5, email: 1.4, admin: 0.6 },
  { day: "Fri", deepWork: 3.2, meetings: 0.9, email: 1.0, admin: 0.4 },
]

export const weeklyProductivity = [
  { day: "Mon", focusScore: 88, tasksDone: 7, emailsTriaged: 12 },
  { day: "Tue", focusScore: 74, tasksDone: 5, emailsTriaged: 18 },
  { day: "Wed", focusScore: 94, tasksDone: 9, emailsTriaged: 8 },
  { day: "Thu", focusScore: 62, tasksDone: 4, emailsTriaged: 22 },
  { day: "Fri", focusScore: 86, tasksDone: 8, emailsTriaged: 10 },
]

export const taskSources = [
  { name: "Email → task", value: 38, color: "rgba(var(--cf-accent-rgb), 1)" },
  { name: "Manual", value: 28, color: "rgba(var(--cf-primary-rgb), 1)" },
  { name: "Calendar", value: 18, color: "#9333ea" },
  { name: "Jira / Linear", value: 16, color: "#ea580c" },
]

export const contextSwitchBreakdown = [
  { tool: "Mail → Tasks", count: 42, pct: 34 },
  { tool: "Calendar → Mail", count: 28, pct: 23 },
  { tool: "Tasks → Calendar", count: 24, pct: 19 },
  { tool: "Focus → Mail", count: 18, pct: 15 },
  { tool: "Other", count: 11, pct: 9 },
]

/** Hourly focus intensity 9 AM – 8 PM (deterministic, Mon–Fri avg). */
export const hourlyFocusIntensity = [
  32, 48, 72, 88, 76, 54, 38, 42, 68, 82, 74, 45,
]

export const focusSessionStats = [
  { duration: "25 min", completion: 64, sessions: 8 },
  { duration: "45 min", completion: 78, sessions: 12 },
  { duration: "90 min", completion: 91, sessions: 6 },
  { duration: "120 min", completion: 73, sessions: 3 },
]

export const meetingPatterns = [
  { time: "9:00", count: 8, efficiency: 86 },
  { time: "10:00", count: 14, efficiency: 79 },
  { time: "11:00", count: 11, efficiency: 84 },
  { time: "14:00", count: 18, efficiency: 68 },
  { time: "15:00", count: 16, efficiency: 72 },
  { time: "16:00", count: 9, efficiency: 88 },
]

export const integrationStats = [
  { name: "Gmail", synced: 142, extracted: 18, label: "emails → tasks" },
  { name: "Outlook", synced: 89, extracted: 11, label: "emails → tasks" },
  { name: "Google Calendar", synced: 34, extracted: 6, label: "events → blocks" },
  { name: "Jira", synced: 22, extracted: 9, label: "issues linked" },
]

export const analyticsInsights: AnalyticsInsight[] = [
  {
    type: "success",
    title: "Best deep-work window",
    description: "Wednesdays average 3.8h uninterrupted — your highest deep-work day.",
    action: "Protect Wednesday mornings with a recurring focus block.",
    impact: "+1.2h deep work / week",
  },
  {
    type: "warning",
    title: "Thursday meeting stack",
    description: "5 meetings on Thursday cut deep work by 58% vs your weekly average.",
    action: "Decline or async two standing syncs.",
    impact: "+2.5h focus time",
  },
  {
    type: "info",
    title: "Email batching works",
    description: "Days with mail triaged before 10 AM show 31% fewer context switches.",
    action: "Block 9:00–9:30 for inbox processing.",
    impact: "-7 switches / day",
  },
  {
    type: "success",
    title: "90-minute focus blocks",
    description: "Longer sessions have a 91% task completion rate vs 64% for 25-min sprints.",
    action: "Default focus timer to 90 minutes for code reviews and PR work.",
    impact: "+27% completion",
  },
]

export const whatIfScenarios = [
  {
    title: "Accept 2 PM sync on Wednesday",
    negative: true,
    focusDelta: "-1.5h deep work",
    scoreDelta: "-11 focus score",
  },
  {
    title: "Block Friday 1–4 PM for rollout prep",
    negative: false,
    focusDelta: "+2.8h deep work",
    scoreDelta: "+14 focus score",
  },
]
