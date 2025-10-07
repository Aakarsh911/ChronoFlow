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
  status: "todo" | "in-progress" | "done"
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
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [tasks, setTasks] = useState<UITask[]>([])
  const [loading, setLoading] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<"all" | UITask["source"]>("all")
  const [connections, setConnections] = useState<{ jira: boolean; slack: boolean; teams: boolean }>({
    jira: false,
    slack: false,
    teams: false,
  })

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
            description: it.summary,
            source: "jira",
            sourceId: it.key,
            status: mapStatus(it.statusName),
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

  function mapStatus(name?: string): UITask["status"] {
    const n = (name || "").toLowerCase()
    if (n.includes("progress") || n.includes("doing")) return "in-progress"
    if (n.includes("done") || n.includes("resolved") || n.includes("closed")) return "done"
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
    const matchesFilter = filter === "all" || task.status === filter
  const matchesSource = sourceFilter === "all" || task.source === sourceFilter
  return matchesSearch && matchesFilter && matchesSource
  })

  const getTaskStats = () => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "done").length
    const inProgress = tasks.filter((t) => t.status === "in-progress").length
    const todo = tasks.filter((t) => t.status === "todo").length
    return { total, completed, inProgress, todo }
  }

  const stats = getTaskStats()
  const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const toggleTaskStatus = (taskId: string | number) => {
    // In a real app, this would update the task status
    console.log(`Toggle task ${taskId} status`)
  }

  return (
    <div className="space-y-6">
      {/* Task Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                <Circle className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
              </div>
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-accent">{stats.completed}</p>
              </div>
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
        <p className="text-2xl font-bold">{completionPct}%</p>
              </div>
              <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-secondary" />
              </div>
            </div>
      <Progress value={completionPct} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>Issues assigned to you from Jira</CardDescription>
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
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
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
            {!loading && filteredTasks.map((task) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => toggleTaskStatus(task.id)}
                        >
                          {task.status === "done" ? (
                            <CheckCircle2 className="w-5 h-5 text-accent" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                          )}
                        </Button>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3
                                className={cn(
                                  "font-medium text-sm",
                                  task.status === "done" && "line-through text-muted-foreground",
                                )}
                              >
                                {task.title}
                              </h3>
                              <p className="text-xs text-muted-foreground">{task.description}</p>
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
                              {task.sourceId}
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
                            <Badge
                              variant="outline"
                              className={cn("text-xs", statusConfig[task.status as keyof typeof statusConfig].color)}
                            >
                              {statusConfig[task.status as keyof typeof statusConfig].label}
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
                            {task.actualTime > 0 && task.estimatedTime > 0 && task.status !== "done" && (
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
                ))}

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
