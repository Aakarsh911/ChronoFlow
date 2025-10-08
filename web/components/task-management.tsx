"use client"

import React, { useState } from "react"
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Filter,
  Search,
  ExternalLink,
  MessageSquare,
  Bug,
  Zap,
  Calendar,
  User,
  MoreHorizontal,
  KanbanSquare,
  Users,
  ListChecks,
  ListTodo,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Data model for Jira issues normalized to our UI
type UITask = {
  id: string | number
  title: string
  description: string
  source: "jira" | "slack" | "teams"
  sourceId: string
  statusName: string
  statusCategory: "todo" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  assignee: string | null
  estimatedTime: number
  actualTime: number
  dueDate: string | null
  tags: string[]
  project: string | null
  url?: string
}

const sourceConfig: Record<UITask["source"], { icon: React.ElementType; color: string; name: string }> = {
  jira: { icon: KanbanSquare, color: "bg-blue-500/10 text-blue-600 border-blue-200", name: "Jira" },
  slack: { icon: MessageSquare, color: "bg-purple-500/10 text-purple-600 border-purple-200", name: "Slack" },
  teams: { icon: Users, color: "bg-indigo-500/10 text-indigo-600 border-indigo-200", name: "Teams" },
}

const priorityConfig = {
  high: { color: "bg-red-500/10 text-red-600 border-red-200", label: "High" },
  medium: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", label: "Medium" },
  low: { color: "bg-green-500/10 text-green-600 border-green-200", label: "Low" },
}

const statusConfig = {
  todo: { color: "bg-gray-500/10 text-gray-600 border-gray-200", label: "To Do" },
  "in-progress": { color: "bg-primary/10 text-primary border-primary/20", label: "In Progress" },
  done: { color: "bg-accent/10 text-accent border-accent/20", label: "Done" },
}

export function TaskManagement() {
  const [filter, setFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [tasks, setTasks] = useState<UITask[]>([])
  const [loading, setLoading] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<"all" | UITask["source"]>("all")
  const [connections, setConnections] = useState<{ jira: boolean; slack: boolean; teams: boolean }>({
    jira: false,
    slack: false,
    teams: false,
  })
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Fetch connections
        try {
          const c = await fetch("/api/integrations", { cache: "no-store" })
          if (c.ok) {
            const map = await c.json()
            setConnections({
              jira: !!(map?.jira || map?.JIRA || map?.atlassian),
              slack: !!(map?.slack || map?.SLACK),
              teams: !!(map?.teams || map?.TEAMS || map?.microsoftTeams),
            })
          }
        } catch {}

    const res = await fetch("/api/jira/issues", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          const items: UITask[] = (data.issues || []).map((it: any) => ({
            id: it.id,
            title: it.summary,
            description: it.description || "",
            source: "jira",
            sourceId: it.key,
      statusName: it.statusName || "Unknown",
      statusCategory: mapStatusCategory(it.statusName),
            priority: mapPriority(it.priorityName),
            assignee: it.assignee,
            estimatedTime: it.timeOriginalEstimate ? Math.round(it.timeOriginalEstimate / 60) : 0,
            actualTime: it.timespent ? Math.round(it.timespent / 60) : 0,
            dueDate: it.dueDate,
            tags: [],
            project: it.projectName,
            url: it.url,
          }))
          setTasks(items)
        } else {
          setTasks([])
        }
      } catch {
        setTasks([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function mapStatusCategory(name?: string): UITask["statusCategory"] {
    const n = (name || "").toLowerCase()
    if (n.includes("done") || n.includes("resolved") || n.includes("closed") || n.includes("complete")) return "done"
    if (n.includes("progress") || n.includes("doing") || n.includes("review") || n.includes("qa")) return "in-progress"
    return "todo"
  }

  function mapPriority(name?: string): UITask["priority"] {
    const n = (name || "").toLowerCase()
    if (n.includes("high") || n.includes("blocker") || n.includes("critical")) return "high"
    if (n.includes("low")) return "low"
    return "medium"
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === "all" || task.statusName === filter
  const matchesSource = sourceFilter === "all" || task.source === sourceFilter
  return matchesSearch && matchesFilter && matchesSource
  })

  const getTaskStats = () => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.statusCategory === "done").length
    const inProgress = tasks.filter((t) => t.statusCategory === "in-progress").length
    const todo = tasks.filter((t) => t.statusCategory === "todo").length
    return { total, completed, inProgress, todo }
  }

  const stats = React.useMemo(() => {
    const total = tasks.length
    let completed = 0
    let inProgress = 0
    let todo = 0
    for (const t of tasks) {
      const key = String(t.id)
      const isChecked = !!checked[key]
      if (isChecked || t.statusCategory === "done") {
        completed++
      } else if (t.statusCategory === "in-progress") {
        inProgress++
      } else {
        todo++
      }
    }
    return { total, completed, inProgress, todo }
  }, [tasks, checked])
  const openCount = stats.todo + stats.inProgress
  const completionPct = React.useMemo(() => (stats.total ? Math.round((stats.completed / stats.total) * 100) : 0), [stats])

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const toggleTaskStatus = (taskId: string | number) => {
    const key = String(taskId)
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const STATUS_COLOR_CLASSES = [
    "bg-gray-500/10 text-gray-700 border-gray-200",
    "bg-sky-500/10 text-sky-700 border-sky-200",
    "bg-amber-500/10 text-amber-700 border-amber-200",
    "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    "bg-violet-500/10 text-violet-700 border-violet-200",
    "bg-rose-500/10 text-rose-700 border-rose-200",
    "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  ] as const

  function getStatusBadgeClass(name: string) {
    const n = (name || "").toLowerCase()
    if (n.includes("done") || n.includes("resolved") || n.includes("closed")) {
      return "bg-accent/10 text-accent border-accent/20"
    }
    if (n.includes("progress") || n.includes("review") || n.includes("qa")) {
      return "bg-primary/10 text-primary border-primary/20"
    }
    let hash = 0
    for (let i = 0; i < n.length; i++) hash = (hash * 31 + n.charCodeAt(i)) >>> 0
    const idx = hash % STATUS_COLOR_CLASSES.length
    return STATUS_COLOR_CLASSES[idx]
  }

  const uniqueStatuses = React.useMemo(() => {
    const set = new Set<string>()
    tasks.forEach((t) => set.add(t.statusName))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [tasks])

  return (
    <div className="space-y-6">
      {/* Task Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total */}
        <Card className="elevated-card border-0 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold text-foreground mt-2">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <ListTodo className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                All Tasks
              </Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-slate-300 to-slate-200" />
        </Card>

        {/* Open */}
        <Card className="elevated-card border-0 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Tasks</p>
                <p className="text-2xl font-bold text-foreground mt-2">{openCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                To Do
              </Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-blue-300" />
        </Card>

        {/* Completed */}
        <Card className="elevated-card border-0 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground mt-2">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                Done
              </Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-green-400 to-green-300" />
        </Card>

        {/* Completion */}
        <Card className="elevated-card border-0 relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold text-foreground mt-2">{completionPct}%</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4 py-2">
              <Progress value={completionPct} className="h-2" />
            </div>
          </CardContent>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-amber-300" />
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>Tasks for the day</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="jira">Jira</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="teams">Teams</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {uniqueStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task List */}
          <div className="mt-2 space-y-4">
            {sourceFilter !== "all" && !connections[sourceFilter] && (
              <div className="text-center py-10 border rounded-lg bg-muted/30">
                <p className="font-medium">{sourceConfig[sourceFilter as UITask["source"]].name} not connected</p>
                <p className="text-sm text-muted-foreground mt-1">Connect it in Settings to see tasks here.</p>
                <div className="mt-3">
                  <Link href="/settings" className="text-primary text-sm underline">Go to Settings</Link>
                </div>
              </div>
            )}
                {loading && (
                  <div className="text-center py-8 text-muted-foreground">Loading issues…</div>
                )}
            {!loading && filteredTasks.map((task) => {
              const key = String(task.id)
              const isChecked = checked[key] || task.statusCategory === "done"
              return (
              <Card key={task.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                        <button
                          aria-pressed={isChecked}
                          aria-label={isChecked ? "Mark as not done" : "Mark as done"}
                          onClick={() => toggleTaskStatus(task.id)}
                          className={cn(
                            "h-7 w-7 inline-flex items-center justify-center rounded-md transition-all",
                            "hover:bg-primary/10 hover:scale-110",
                            "active:scale-95"
                          )}
                        >
                          {isChecked ? (
                            <CheckCircle2 className="w-5 h-5 text-accent transition-colors" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                          )}
                        </button>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1 pr-2">
                <h3
                                className={cn(
                                  "font-medium text-sm",
                  isChecked && "line-through text-muted-foreground",
                                )}
                              >
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {task.url && (
                                  <DropdownMenuItem asChild>
                                    <a href={task.url} target="_blank" rel="noreferrer" className="flex items-center">
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Open in {sourceConfig[task.source as keyof typeof sourceConfig].name}
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Schedule Focus Time
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <User className="w-4 h-4 mr-2" />
                                  Reassign Task
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn("text-xs", sourceConfig[task.source as keyof typeof sourceConfig].color)}
                            >
                              {(() => {
                                const Icon = sourceConfig[task.source as keyof typeof sourceConfig].icon
                                return <Icon className="w-3 h-3 mr-1" />
                              })()}
                              <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent font-semibold">
                                {task.sourceId}
                              </span>
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                priorityConfig[task.priority as keyof typeof priorityConfig].color,
                              )}
                            >
                              {priorityConfig[task.priority as keyof typeof priorityConfig].label}
                            </Badge>
                            <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(task.statusName))}>
                              {task.statusName}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {task.project}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span>Est: {formatTime(task.estimatedTime)}</span>
                              {task.actualTime > 0 && <span>Actual: {formatTime(task.actualTime)}</span>}
                              {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                            </div>
                            {task.actualTime > 0 && task.estimatedTime > 0 && task.statusCategory !== "done" && (
                              <div className="flex items-center gap-2">
                                <Progress value={(task.actualTime / task.estimatedTime) * 100} className="w-20 h-2" />
                                <span>{Math.round((task.actualTime / task.estimatedTime) * 100)}%</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {task.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs bg-muted/50">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )})}

  {!loading && filteredTasks.length === 0 && sourceFilter === "all" && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No Jira issues found</p>
          <p className="text-sm mt-1">Check your filters or connection in Settings</p>
                  </div>
                )}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            AI Insights & Recommendations
          </CardTitle>
          <CardDescription>Smart suggestions based on your task patterns and history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Time Estimation Accuracy</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your estimates are 15% more accurate this week. Consider scheduling 2h focus blocks for complex
                    tasks.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={85} className="flex-1 h-2" />
                    <span className="text-xs font-medium">85%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex items-start gap-3">
                <Bug className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">High Priority Alert</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    2 high-priority tasks are due tomorrow. Consider rescheduling non-critical meetings.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 text-xs bg-transparent">
                    Auto-reschedule
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
