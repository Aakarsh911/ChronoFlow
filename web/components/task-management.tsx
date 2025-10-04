"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Mock data for tasks from different sources
const mockTasks = [
  {
    id: 1,
    title: "Fix authentication bug in login flow",
    description: "Users are experiencing issues with OAuth login",
    source: "jira",
    sourceId: "AUTH-123",
    status: "in-progress",
    priority: "high",
    assignee: "John Doe",
    estimatedTime: 240, // minutes
    actualTime: 120,
    dueDate: "2024-01-16",
    tags: ["bug", "authentication"],
    project: "Auth System",
  },
  {
    id: 2,
    title: "Review PR for new dashboard components",
    description: "Code review needed for dashboard refactor",
    source: "slack",
    sourceId: "msg-456",
    status: "todo",
    priority: "medium",
    assignee: "John Doe",
    estimatedTime: 60,
    actualTime: 0,
    dueDate: "2024-01-15",
    tags: ["review", "frontend"],
    project: "Dashboard",
  },
  {
    id: 3,
    title: "Update API documentation",
    description: "Documentation needs to reflect recent API changes",
    source: "teams",
    sourceId: "teams-789",
    status: "done",
    priority: "low",
    assignee: "John Doe",
    estimatedTime: 90,
    actualTime: 85,
    dueDate: "2024-01-14",
    tags: ["documentation", "api"],
    project: "API",
  },
  {
    id: 4,
    title: "Implement user preferences feature",
    description: "Allow users to customize their dashboard layout",
    source: "jira",
    sourceId: "FEAT-456",
    status: "todo",
    priority: "medium",
    assignee: "John Doe",
    estimatedTime: 480,
    actualTime: 0,
    dueDate: "2024-01-20",
    tags: ["feature", "frontend"],
    project: "User Experience",
  },
  {
    id: 5,
    title: "Database performance optimization",
    description: "Optimize slow queries identified in monitoring",
    source: "slack",
    sourceId: "msg-101",
    status: "in-progress",
    priority: "high",
    assignee: "John Doe",
    estimatedTime: 360,
    actualTime: 180,
    dueDate: "2024-01-17",
    tags: ["performance", "database"],
    project: "Infrastructure",
  },
]

const sourceConfig = {
  jira: { icon: "🟦", color: "bg-blue-500/10 text-blue-600 border-blue-200", name: "Jira" },
  slack: { icon: "🟣", color: "bg-purple-500/10 text-purple-600 border-purple-200", name: "Slack" },
  teams: { icon: "🔵", color: "bg-indigo-500/10 text-indigo-600 border-indigo-200", name: "Teams" },
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
  const [selectedTab, setSelectedTab] = useState("all")

  const filteredTasks = mockTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === "all" || task.status === filter
    const matchesTab = selectedTab === "all" || task.source === selectedTab
    return matchesSearch && matchesFilter && matchesTab
  })

  const getTaskStats = () => {
    const total = mockTasks.length
    const completed = mockTasks.filter((t) => t.status === "done").length
    const inProgress = mockTasks.filter((t) => t.status === "in-progress").length
    const todo = mockTasks.filter((t) => t.status === "todo").length
    return { total, completed, inProgress, todo }
  }

  const stats = getTaskStats()

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const toggleTaskStatus = (taskId: number) => {
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
                <p className="text-2xl font-bold">{Math.round((stats.completed / stats.total) * 100)}%</p>
              </div>
              <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-secondary" />
              </div>
            </div>
            <Progress value={(stats.completed / stats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>Manage tasks from Slack, Teams, and Jira with AI-powered estimates</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
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

          {/* Source Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Sources</TabsTrigger>
              <TabsTrigger value="jira">Jira</TabsTrigger>
              <TabsTrigger value="slack">Slack</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              <div className="space-y-4">
                {filteredTasks.map((task) => (
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
                                <DropdownMenuItem>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Open in {sourceConfig[task.source as keyof typeof sourceConfig].name}
                                </DropdownMenuItem>
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
                              {sourceConfig[task.source as keyof typeof sourceConfig].icon} {task.sourceId}
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
                              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                            {task.actualTime > 0 && task.status !== "done" && (
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

                {filteredTasks.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks found matching your criteria</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
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
