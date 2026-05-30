"use client"

import { useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Filter,
  GitPullRequest,
  Mail,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import {
  analyticsInsights,
  analyticsKpis,
  contextSwitchBreakdown,
  focusSessionStats,
  hourlyFocusIntensity,
  integrationStats,
  meetingPatterns,
  taskSources,
  weeklyProductivity,
  weeklyWorkMix,
  whatIfScenarios,
} from "@/lib/analytics-mock-data"
import { cn } from "@/lib/utils"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const tooltipStyle = {
  backgroundColor: "var(--cf-bg-elev, var(--card))",
  border: "1px solid var(--cf-border, var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
}

type TimeRange = "week" | "month"

function TrendBadge({
  delta,
  trend,
  label,
  invert = false,
}: {
  delta: string
  trend: "up" | "down"
  label: string
  invert?: boolean
}) {
  const isPositive = invert ? trend === "down" : trend === "up"
  const Icon = isPositive ? ArrowUp : ArrowDown
  return (
    <div className="mt-1 flex items-center gap-1">
      <Icon className={cn("h-3 w-3", isPositive ? "text-[rgba(var(--cf-accent-rgb),1)]" : "text-red-500")} />
      <span className={cn("text-xs", isPositive ? "text-[rgba(var(--cf-accent-rgb),1)]" : "text-red-500")}>
        {delta} {label}
      </span>
    </div>
  )
}

function getInsightIcon(type: string) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-[rgba(var(--cf-accent-rgb),1)]" />
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />
    default:
      return <Zap className="h-5 w-5 text-[rgba(var(--cf-primary-rgb),1)]" />
  }
}

function getInsightColor(type: string) {
  switch (type) {
    case "success":
      return "border-[rgba(var(--cf-accent-rgb),0.25)] bg-[rgba(var(--cf-accent-rgb),0.06)]"
    case "warning":
      return "border-amber-500/25 bg-amber-500/5"
    default:
      return "border-[rgba(var(--cf-primary-rgb),0.25)] bg-[rgba(var(--cf-primary-rgb),0.06)]"
  }
}

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("week")
  const [tab, setTab] = useState("overview")

  const kpis = analyticsKpis[timeRange]
  const avgFocusScore = useMemo(
    () => Math.round(weeklyProductivity.reduce((s, d) => s + d.focusScore, 0) / weeklyProductivity.length),
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="How your week actually went"
        subtitle="Deep work, context switching, and email-to-task flow — synced from calendar, mail, and tasks."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[140px] border-[var(--cf-border)] bg-[var(--cf-bg-soft)]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="border-[var(--cf-border)]" disabled>
              Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="cf-surface-card border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deep work</p>
                <p className="text-2xl font-bold text-[rgba(var(--cf-primary-rgb),1)]">{kpis.deepWorkHours.value}</p>
                <TrendBadge {...kpis.deepWorkHours} label={kpis.deepWorkHours.label} />
              </div>
              <div className="rounded-lg bg-[rgba(var(--cf-primary-rgb),0.12)] p-2">
                <Clock className="h-5 w-5 text-[rgba(var(--cf-primary-rgb),1)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cf-surface-card border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Context switches</p>
                <p className="text-2xl font-bold">{kpis.contextSwitches.value}</p>
                <TrendBadge {...kpis.contextSwitches} label={kpis.contextSwitches.label} invert />
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cf-surface-card border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email → task</p>
                <p className="text-2xl font-bold text-[rgba(var(--cf-accent-rgb),1)]">
                  {kpis.emailToTaskRate.value}
                </p>
                <TrendBadge {...kpis.emailToTaskRate} label={kpis.emailToTaskRate.label} />
              </div>
              <div className="rounded-lg bg-[rgba(var(--cf-accent-rgb),0.12)] p-2">
                <Mail className="h-5 w-5 text-[rgba(var(--cf-accent-rgb),1)]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cf-surface-card border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meeting hours</p>
                <p className="text-2xl font-bold">{kpis.meetingHours.value}</p>
                <TrendBadge {...kpis.meetingHours} label={kpis.meetingHours.label} invert />
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-3">
        <TrendingUp className="h-4 w-4 text-[rgba(var(--cf-accent-rgb),1)]" />
        <span className="text-sm text-[var(--cf-text-muted)]">
          Weekly focus score:{" "}
          <span className="font-semibold text-[var(--cf-text)]">{avgFocusScore}/100</span>
          {" · "}
          Best day: <span className="font-medium text-[var(--cf-text)]">Wednesday</span>
          {" · "}
          Biggest drag: <span className="font-medium text-[var(--cf-text)]">Thursday meetings</span>
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-[var(--cf-bg-soft)] p-1 lg:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Work patterns</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="cf-surface-card border-0">
              <CardHeader>
                <CardTitle className="text-base">Daily work mix</CardTitle>
                <CardDescription>Hours spent in deep work, meetings, email, and admin</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={weeklyWorkMix}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="h" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="deepWork" name="Deep work" stackId="a" fill="rgba(var(--cf-primary-rgb), 0.85)" />
                    <Bar dataKey="meetings" name="Meetings" stackId="a" fill="#9333ea" />
                    <Bar dataKey="email" name="Email" stackId="a" fill="rgba(var(--cf-accent-rgb), 0.75)" />
                    <Bar dataKey="admin" name="Admin" stackId="a" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="cf-surface-card border-0">
              <CardHeader>
                <CardTitle className="text-base">Task sources</CardTitle>
                <CardDescription>Where completed tasks originated this week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={taskSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {taskSources.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Share"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="cf-surface-card border-0 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Focus score & throughput</CardTitle>
                <CardDescription>Daily focus score vs tasks completed and emails triaged</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={weeklyProductivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="focusScore"
                      name="Focus score"
                      stroke="rgba(var(--cf-accent-rgb), 1)"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="tasksDone"
                      name="Tasks done"
                      stroke="rgba(var(--cf-primary-rgb), 1)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="emailsTriaged"
                      name="Emails triaged"
                      stroke="#ea580c"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="cf-surface-card border-0">
              <CardHeader>
                <CardTitle className="text-base">Focus by hour</CardTitle>
                <CardDescription>Average intensity 9 AM – 8 PM (Mon–Fri)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                  {hourlyFocusIntensity.map((intensity, hour) => (
                    <div key={hour} className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "flex aspect-square w-full items-center justify-center rounded-md text-[10px] font-medium",
                          intensity >= 80 && "bg-[rgba(var(--cf-accent-rgb),0.85)] text-white",
                          intensity >= 60 && intensity < 80 && "bg-[rgba(var(--cf-primary-rgb),0.7)] text-white",
                          intensity >= 40 && intensity < 60 && "bg-muted text-muted-foreground",
                          intensity < 40 && "bg-muted/40 text-muted-foreground",
                        )}
                        title={`${intensity}% focus`}
                      >
                        {hour + 9}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Peak: 10–11 AM · Low: lunch block 12–1 PM
                </p>
              </CardContent>
            </Card>

            <Card className="cf-surface-card border-0">
              <CardHeader>
                <CardTitle className="text-base">Context switches</CardTitle>
                <CardDescription>Top transitions between tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contextSwitchBreakdown.map((row) => (
                  <div key={row.tool} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{row.tool}</span>
                      <span className="font-medium tabular-nums">{row.count}</span>
                    </div>
                    <Progress value={row.pct} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="cf-surface-card border-0">
              <CardHeader>
                <CardTitle className="text-base">Focus session length</CardTitle>
                <CardDescription>Completion rate by block duration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {focusSessionStats.map((row) => (
                  <div key={row.duration} className="flex items-center justify-between gap-3">
                    <div className="min-w-[72px] text-sm font-medium">{row.duration}</div>
                    <Progress value={row.completion} className="h-2 flex-1" />
                    <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                      {row.completion}%
                    </span>
                  </div>
                ))}
                <div className="rounded-lg border border-[rgba(var(--cf-accent-rgb),0.25)] bg-[rgba(var(--cf-accent-rgb),0.06)] p-3">
                  <p className="text-sm font-medium text-[rgba(var(--cf-accent-rgb),1)]">Sweet spot: 90 minutes</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Best for PR reviews and implementation work</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cf-surface-card border-0">
              <CardHeader>
                <CardTitle className="text-base">Meeting efficiency</CardTitle>
                <CardDescription>Score by time slot (action items captured / hour)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={meetingPatterns}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="efficiency"
                      name="Efficiency %"
                      stroke="rgba(var(--cf-accent-rgb), 1)"
                      fill="rgba(var(--cf-accent-rgb), 0.2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {integrationStats.map((item) => (
              <Card key={item.name} className="cf-surface-card border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      synced
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold tabular-nums">{item.synced}</p>
                      <p className="text-xs text-muted-foreground">items synced</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold tabular-nums text-[rgba(var(--cf-accent-rgb),1)]">
                        {item.extracted}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="cf-surface-card mt-6 border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitPullRequest className="h-4 w-4" />
                Cross-tool flow this week
              </CardTitle>
              <CardDescription>Sample pipeline from connected sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {[
                  { step: "Gmail", detail: "18 threads flagged", icon: Mail },
                  { step: "→ Tasks", detail: "14 tasks created", icon: Target },
                  { step: "→ Calendar", detail: "6 focus blocks", icon: Clock },
                  { step: "→ Done", detail: "11 completed", icon: CheckCircle2 },
                ].map((node, i) => {
                  const Icon = node.icon
                  return (
                    <div
                      key={node.step}
                      className={cn(
                        "flex flex-1 items-center gap-3 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-3",
                        i < 3 && "sm:border-r-0 sm:rounded-r-none",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[rgba(var(--cf-accent-rgb),1)]" />
                      <div>
                        <p className="text-sm font-medium">{node.step}</p>
                        <p className="text-xs text-muted-foreground">{node.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6 space-y-6">
          <Card className="cf-surface-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-5 w-5 text-[rgba(var(--cf-accent-rgb),1)]" />
                Recommendations
              </CardTitle>
              <CardDescription>Based on your calendar, mail, and task patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {analyticsInsights.map((insight) => (
                  <div
                    key={insight.title}
                    className={cn("rounded-lg border p-4", getInsightColor(insight.type))}
                  >
                    <div className="flex gap-3">
                      {getInsightIcon(insight.type)}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold">{insight.title}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
                        <p className="mt-3 text-xs">
                          <span className="font-medium">Try: </span>
                          {insight.action}
                        </p>
                        <Badge variant="secondary" className="mt-2 text-[10px]">
                          {insight.impact}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="cf-surface-card border-0">
            <CardHeader>
              <CardTitle className="text-base">What-if planning</CardTitle>
              <CardDescription>Estimated impact before you accept a meeting or block time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {whatIfScenarios.map((scenario) => (
                <div
                  key={scenario.title}
                  className={cn(
                    "rounded-lg border p-4",
                    scenario.negative
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-[rgba(var(--cf-accent-rgb),0.25)] bg-[rgba(var(--cf-accent-rgb),0.06)]",
                  )}
                >
                  <h4 className="text-sm font-medium">{scenario.title}</h4>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Deep work</p>
                      <p className={cn("font-semibold", scenario.negative ? "text-red-600" : "text-[rgba(var(--cf-accent-rgb),1)]")}>
                        {scenario.focusDelta}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Focus score</p>
                      <p className={cn("font-semibold", scenario.negative ? "text-red-600" : "text-[rgba(var(--cf-accent-rgb),1)]")}>
                        {scenario.scoreDelta}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
