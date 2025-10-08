"use client"

import React, { useState, useEffect, useTransition } from "react"
import {
  CheckCircle2,
  Circle,
  Plus,
  Filter,
  Search,
  ExternalLink,
  MessageSquare,
  Calendar,
  MoreHorizontal,
  KanbanSquare,
  Users,
  ListChecks,
  ListTodo,
  TrendingUp,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

// Matches the Prisma Task model
type UITask = {
  id: string
  title: string
  description: string | null
  source: string
  sourceId: string | null
  status: string
  priority: string | null
  dueDate: string | null
  url: string | null
  sourceData: any
}

const sourceConfig: Record<string, { icon: React.ElementType; color: string; name: string }> = {
  JIRA: { icon: KanbanSquare, color: "bg-blue-500/10 text-blue-600 border-blue-200", name: "Jira" },
  SLACK: { icon: MessageSquare, color: "bg-purple-500/10 text-purple-600 border-purple-200", name: "Slack" },
  TEAMS: { icon: Users, color: "bg-indigo-500/10 text-indigo-600 border-indigo-200", name: "Teams" },
  MANUAL: { icon: ListTodo, color: "bg-gray-500/10 text-gray-600 border-gray-200", name: "Manual" },
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  High: { color: "bg-red-500/10 text-red-600 border-red-200", label: "High" },
  Medium: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", label: "Medium" },
  Low: { color: "bg-green-500/10 text-green-600 border-green-200", label: "Low" },
}

export function TaskManagement() {
  const [filter, setFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [tasks, setTasks] = useState<UITask[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [isSyncing, startSyncTransition] = useTransition()
  const { toast } = useToast()

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      } else {
        setTasks([])
        toast({
          variant: "destructive",
          title: "Failed to load tasks",
          description: "There was a problem fetching your tasks.",
        })
      }
    } catch (error) {
      setTasks([])
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to the server.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleSync = () => {
    startSyncTransition(async () => {
      toast({ title: "Syncing with Jira...", description: "Fetching latest tasks." })
      const res = await fetch("/api/tasks/sync", { method: "POST" })
      if (res.ok) {
        const result = await res.json()
        toast({
          title: "Sync Complete",
          description: result.message,
        })
        await fetchTasks()
      } else {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: "Could not sync tasks from Jira.",
        })
      }
    })
  }

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "Done" ? "To Do" : "Done"
    const originalTasks = tasks
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task))
    )

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        setTasks(originalTasks)
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not update task status.",
        })
      } else {
        const updatedTask = await res.json()
        setTasks((prevTasks) =>
          prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
        )
      }
    } catch (error) {
      setTasks(originalTasks)
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to the server to update task.",
      })
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === "all" || task.status === filter
    const matchesSource = sourceFilter === "all" || task.source === sourceFilter
    return matchesSearch && matchesFilter && matchesSource
  })

  const stats = React.useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "Done").length
    const inProgress = tasks.filter((t) => t.status === "In Progress").length
    const todo = total - completed - inProgress
    return { total, completed, inProgress, todo }
  }, [tasks])

  const openCount = stats.todo + stats.inProgress
  const completionPct = React.useMemo(() => (stats.total ? Math.round((stats.completed / stats.total) * 100) : 0), [stats])

  const STATUS_COLOR_CLASSES: Record<string, string> = {
    "To Do": "bg-gray-500/10 text-gray-700 border-gray-200",
    "In Progress": "bg-sky-500/10 text-sky-700 border-sky-200",
    "Done": "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  }

  function getStatusBadgeClass(status: string) {
    return STATUS_COLOR_CLASSES[status] || STATUS_COLOR_CLASSES.todo
  }

  const uniqueStatuses = React.useMemo(() => {
    const set = new Set<string>()
    tasks.forEach((t) => set.add(t.status))
    return Array.from(set).sort()
  }, [tasks])

  const uniqueSources = React.useMemo(() => {
    const set = new Set<string>()
    tasks.forEach((t) => set.add(t.source))
    return Array.from(set).sort()
  }, [tasks])

  const getProjectFromSourceData = (task: UITask) => {
    if (task.sourceData?.fields?.project?.name) {
      return task.sourceData.fields.project.name
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Task Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <Badge className="bg-slate-100 text-slate-700 border-slate-200">All Tasks</Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-slate-300 to-slate-200" />
        </Card>

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
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">To Do</Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-blue-300" />
        </Card>

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
              <Badge className="bg-green-100 text-green-700 border-green-200">Done</Badge>
            </div>
          </CardContent>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-green-400 to-green-300" />
        </Card>

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
            <div className="mt-4 py-1">
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
              <CardDescription>All your tasks from integrated sources</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
                Sync with Jira
              </Button>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </div>
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
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {sourceConfig[s]?.name || s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-2 space-y-4">
            {loading && <div className="text-center py-8 text-muted-foreground">Loading tasks…</div>}
            {!loading &&
              filteredTasks.map((task) => {
                const isChecked = task.status === "Done"
                const currentSourceConfig = sourceConfig[task.source] || sourceConfig.MANUAL
                const currentPriorityConfig = task.priority ? priorityConfig[task.priority] : null
                const projectName = getProjectFromSourceData(task)

                return (
                  <Card key={task.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <button
                          aria-pressed={isChecked}
                          aria-label={isChecked ? "Mark as not done" : "Mark as done"}
                          onClick={() => toggleTaskStatus(task.id, task.status)}
                          className={cn(
                            "h-7 w-7 inline-flex items-center justify-center rounded-md transition-all",
                            "hover:bg-primary/10 hover:scale-110 active:scale-95"
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
                              <h3 className={cn("font-medium text-sm", isChecked && "line-through text-muted-foreground")}>
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
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
                                      Open in {currentSourceConfig.name}
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Schedule Focus Time
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={cn("text-xs", currentSourceConfig.color)}>
                              <currentSourceConfig.icon className="w-3 h-3 mr-1" />
                              <span className="font-semibold">{task.sourceId}</span>
                            </Badge>
                            {currentPriorityConfig && (
                              <Badge variant="outline" className={cn("text-xs", currentPriorityConfig.color)}>
                                {currentPriorityConfig.label}
                              </Badge>
                            )}
                            <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(task.status))}>
                              {task.status}
                            </Badge>
                            {projectName && (
                              <Badge variant="secondary" className="text-xs">
                                {projectName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

            {!loading && filteredTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
                <p className="text-sm mt-1">Try syncing with Jira or adjusting your filters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
