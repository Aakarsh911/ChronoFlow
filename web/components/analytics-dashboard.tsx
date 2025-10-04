"use client"

import { useState } from "react"
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"

// Mock analytics data
const weeklyProductivity = [
  { day: "Mon", focusTime: 4.5, meetings: 2, tasks: 8, productivity: 85 },
  { day: "Tue", focusTime: 3.2, meetings: 4, tasks: 6, productivity: 72 },
  { day: "Wed", focusTime: 5.1, meetings: 1, tasks: 9, productivity: 92 },
  { day: "Thu", focusTime: 2.8, meetings: 5, tasks: 5, productivity: 68 },
  { day: "Fri", focusTime: 4.0, meetings: 3, tasks: 7, productivity: 78 },
]

const monthlyTrends = [
  { month: "Jan", focusTime: 85, meetings: 45, tasks: 156, productivity: 82 },
  { month: "Feb", focusTime: 92, meetings: 38, tasks: 168, productivity: 87 },
  { month: "Mar", focusTime: 78, meetings: 52, tasks: 142, productivity: 79 },
  { month: "Apr", focusTime: 95, meetings: 41, tasks: 174, productivity: 89 },
  { month: "May", focusTime: 88, meetings: 47, tasks: 161, productivity: 85 },
  { month: "Jun", focusTime: 102, meetings: 35, tasks: 189, productivity: 93 },
]

const timeAllocation = [
  { name: "Focus Time", value: 45, color: "hsl(var(--primary))" },
  { name: "Meetings", value: 25, color: "hsl(var(--chart-4))" },
  { name: "Email & Slack", value: 15, color: "hsl(var(--chart-2))" },
  { name: "Admin Tasks", value: 10, color: "hsl(var(--chart-3))" },
  { name: "Breaks", value: 5, color: "hsl(var(--muted-foreground))" },
]

const meetingPatterns = [
  { time: "9:00", count: 12, efficiency: 85 },
  { time: "10:00", count: 18, efficiency: 78 },
  { time: "11:00", count: 15, efficiency: 82 },
  { time: "14:00", count: 22, efficiency: 71 },
  { time: "15:00", count: 19, efficiency: 76 },
  { time: "16:00", count: 14, efficiency: 88 },
]

const insights = [
  {
    type: "success",
    title: "Peak Performance Window",
    description: "You're most productive between 9-11 AM with 92% efficiency",
    action: "Schedule important tasks during this time",
    impact: "+15% productivity",
  },
  {
    type: "warning",
    title: "Meeting Overload",
    description: "Thursday has 5 meetings, reducing focus time by 60%",
    action: "Consider rescheduling 2 non-critical meetings",
    impact: "+2.5h focus time",
  },
  {
    type: "info",
    title: "Task Completion Pattern",
    description: "You complete 40% more tasks on days with <3 meetings",
    action: "Block calendar for focus days",
    impact: "+3 tasks/day",
  },
  {
    type: "success",
    title: "Focus Block Effectiveness",
    description: "90-minute focus blocks show 25% higher completion rates",
    action: "Standardize on 90-minute sessions",
    impact: "+25% completion",
  },
]

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("week")
  const [selectedTab, setSelectedTab] = useState("overview")

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-accent" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case "info":
        return <Zap className="w-5 h-5 text-primary" />
      default:
        return <BarChart3 className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-accent/20 bg-accent/5"
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      case "info":
        return "border-primary/20 bg-primary/5"
      default:
        return "border-border bg-muted/30"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-1">Insights into your productivity patterns and time management</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Productivity Score</p>
                <p className="text-2xl font-bold text-accent">87%</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUp className="w-3 h-3 text-accent" />
                  <span className="text-xs text-accent">+5% from last week</span>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Focus Time</p>
                <p className="text-2xl font-bold text-primary">19.6h</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUp className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary">+2.3h from last week</span>
                </div>
              </div>
              <Clock className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold">35</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDown className="w-3 h-3 text-red-500" />
                  <span className="text-xs text-red-500">-3 from last week</span>
                </div>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meeting Hours</p>
                <p className="text-2xl font-bold text-chart-4">12.5h</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDown className="w-3 h-3 text-accent" />
                  <span className="text-xs text-accent">-1.2h from last week</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-chart-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="focus">Focus Analysis</TabsTrigger>
          <TabsTrigger value="meetings">Meeting Patterns</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Productivity Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Productivity Trend</CardTitle>
                <CardDescription>Your productivity score and focus time over the week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyProductivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="productivity"
                      stroke="hsl(var(--accent))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="focusTime"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time Allocation */}
            <Card>
              <CardHeader>
                <CardTitle>Time Allocation</CardTitle>
                <CardDescription>How you spend your working hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={timeAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {timeAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>6-Month Trends</CardTitle>
                <CardDescription>Long-term productivity and focus time patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="focusTime"
                      stackId="1"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="meetings"
                      stackId="2"
                      stroke="hsl(var(--chart-4))"
                      fill="hsl(var(--chart-4))"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="focus" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Focus Time Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Focus Session Effectiveness</CardTitle>
                <CardDescription>Completion rates by session duration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">25-minute sessions</span>
                    <div className="flex items-center gap-2">
                      <Progress value={68} className="w-20 h-2" />
                      <span className="text-sm text-muted-foreground">68%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">45-minute sessions</span>
                    <div className="flex items-center gap-2">
                      <Progress value={82} className="w-20 h-2" />
                      <span className="text-sm text-muted-foreground">82%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">90-minute sessions</span>
                    <div className="flex items-center gap-2">
                      <Progress value={94} className="w-20 h-2" />
                      <span className="text-sm text-muted-foreground">94%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">120-minute sessions</span>
                    <div className="flex items-center gap-2">
                      <Progress value={76} className="w-20 h-2" />
                      <span className="text-sm text-muted-foreground">76%</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-sm font-medium text-accent">Optimal Duration: 90 minutes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your highest completion rate with sustained focus
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Interruption Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Interruption Patterns</CardTitle>
                <CardDescription>When and how often you get interrupted</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyProductivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="meetings" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-primary">Best Focus Days: Monday & Wednesday</p>
                  <p className="text-xs text-muted-foreground mt-1">Fewer meetings = higher productivity</p>
                </div>
              </CardContent>
            </Card>

            {/* Focus Time Heatmap */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily Focus Patterns</CardTitle>
                <CardDescription>Your most productive hours throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 12 }, (_, hour) => {
                    const intensity = Math.random() * 100
                    return (
                      <div
                        key={hour}
                        className={cn(
                          "aspect-square rounded flex items-center justify-center text-xs font-medium",
                          intensity > 80 && "bg-accent text-accent-foreground",
                          intensity > 60 && intensity <= 80 && "bg-primary text-primary-foreground",
                          intensity > 40 && intensity <= 60 && "bg-secondary text-secondary-foreground",
                          intensity <= 40 && "bg-muted text-muted-foreground",
                        )}
                      >
                        {hour + 9}
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span>9 AM</span>
                  <span>Peak productivity: 10-11 AM</span>
                  <span>8 PM</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Meeting Efficiency by Time */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Efficiency by Time</CardTitle>
                <CardDescription>How effective meetings are at different times</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={meetingPatterns}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="efficiency" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Meeting Load Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Load Analysis</CardTitle>
                <CardDescription>Meeting frequency and impact on productivity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average meetings/day</span>
                    <span className="text-sm font-bold">3.2</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average meeting duration</span>
                    <span className="text-sm font-bold">42 min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Meeting-free days</span>
                    <span className="text-sm font-bold">1.2/week</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Back-to-back meetings</span>
                    <span className="text-sm font-bold">28%</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-600">Recommendation</p>
                  <p className="text-xs text-yellow-600 mt-1">Consider blocking one full day per week for deep work</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="space-y-6">
            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent" />
                  AI-Powered Insights
                </CardTitle>
                <CardDescription>Personalized recommendations based on your patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.map((insight, index) => (
                    <div key={index} className={cn("p-4 rounded-lg border", getInsightColor(insight.type))}>
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium">Recommended Action:</p>
                            <p className="text-xs text-muted-foreground">{insight.action}</p>
                            <Badge variant="secondary" className="text-xs">
                              {insight.impact}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* What-If Scenarios */}
            <Card>
              <CardHeader>
                <CardTitle>What-If Planning</CardTitle>
                <CardDescription>See how schedule changes would impact your productivity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-sm mb-2">Scenario: Accept 2PM meeting on Wednesday</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Impact on focus time:</p>
                      <p className="font-medium text-red-600">-1.5 hours</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Productivity score change:</p>
                      <p className="font-medium text-red-600">-8%</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm">
                      Decline Meeting
                    </Button>
                    <Button variant="outline" size="sm">
                      Suggest Alternative
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-accent/5 border-accent/20">
                  <h4 className="font-medium text-sm mb-2">Scenario: Block Friday afternoon for deep work</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Additional focus time:</p>
                      <p className="font-medium text-accent">+3 hours</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Productivity score change:</p>
                      <p className="font-medium text-accent">+12%</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button size="sm" className="bg-accent hover:bg-accent/90">
                      Block Calendar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
