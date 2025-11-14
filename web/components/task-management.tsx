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
  Mail,
  KanbanSquare,
  Users,
  ListChecks,
  ListTodo,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Loader2,
  Zap,
  Target,
  Clock,
  Flame,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { AIConsentDialog } from "./ai-consent-dialog"

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
  EMAIL_AI: { icon: Mail, color: "bg-purple-500/10 text-purple-600 border-purple-200", name: "Email (AI)" },
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
  const [isExtractingTasks, startExtractTransition] = useTransition()
  const [isExtractingFromTeams, startTeamsExtractTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [consentDialogOpen, setConsentDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'email' | 'teams' | null>(null)
  const [focusTimeDialogOpen, setFocusTimeDialogOpen] = useState(false)
  const [taskToSchedule, setTaskToSchedule] = useState<UITask | null>(null)
  const [focusDate, setFocusDate] = useState("")
  const [focusHour, setFocusHour] = useState("09")
  const [focusMinute, setFocusMinute] = useState("00")
  const [focusDuration, setFocusDuration] = useState(60) // Duration in minutes, default 60
  const [isScheduling, setIsScheduling] = useState(false)
  
  // Quick add task (Todoist-style)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickTaskTitle, setQuickTaskTitle] = useState("")
  const [quickTaskDescription, setQuickTaskDescription] = useState("")
  const [quickTaskPriority, setQuickTaskPriority] = useState("Medium")
  const [quickTaskDueDate, setQuickTaskDueDate] = useState<string | null>(null)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [parsedTaskPreview, setParsedTaskPreview] = useState<{
    title: string
    priority: string
    dueDate: string | null
    dueDateText: string | null
  } | null>(null)
  
  const { toast } = useToast()

  const fetchTasks = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      // Add timestamp to force cache bypass
      const timestamp = new Date().getTime()
      const res = await fetch(`/api/tasks?t=${timestamp}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      } else {
        if (!silent) {
          setTasks([])
          toast({
            variant: "destructive",
            title: "Failed to load tasks",
            description: "There was a problem fetching your tasks.",
          })
        }
      }
    } catch (error) {
      if (!silent) {
        setTasks([])
        toast({
          variant: "destructive",
          title: "Network Error",
          description: "Could not connect to the server.",
        })
      }
    } finally {
      if (!silent) setLoading(false)
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

  const handleExtractFromTeams = () => {
    startTeamsExtractTransition(async () => {
      toast({ 
        title: "Teams Extraction Started", 
        description: "Analyzing saved Teams messages for actionable tasks..." 
      })
      
      try {
        const res = await fetch("/api/tasks/extract-from-teams", { 
          method: "POST" 
        })
        
        if (res.ok) {
          const result = await res.json()
          toast({
            title: "Teams Extraction Complete",
            description: `Found ${result.extracted} tasks. Created ${result.created} new tasks.`,
          })
          await fetchTasks()
        } else {
          const error = await res.json()
          
          // Check if consent is required
          if (error.code === 'AI_CONSENT_REQUIRED') {
            setPendingAction('teams')
            setConsentDialogOpen(true)
            return
          }
          
          toast({
            variant: "destructive",
            title: "Teams Extraction Failed",
            description: error.error || "Could not extract tasks from Teams messages. Make sure you have saved some messages in Teams.",
          })
        }
      } catch (error) {
        console.error("Teams extraction error:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to extract tasks from Teams messages.",
        })
      }
    })
  }

  const handleExtractFromEmails = () => {
    startExtractTransition(async () => {
      toast({ 
        title: "AI Extraction Started", 
        description: "Analyzing emails for actionable tasks..." 
      })
      
      try {
        const res = await fetch("/api/tasks/extract-from-emails", { 
          method: "POST",
          cache: "no-store"
        })
        
        if (res.ok) {
          const result = await res.json()
          
          toast({
            title: "Extraction Complete",
            description: `Created ${result.tasksCreated} task(s) from ${result.emailsProcessed} email(s). ${result.duplicatesSkipped > 0 ? `Skipped ${result.duplicatesSkipped} duplicate(s).` : ''}`,
          })
          
          // Instant cache refresh
          await fetchTasks()
        } else {
          const error = await res.json()
          
          // Check if consent is required
          if (error.code === 'AI_CONSENT_REQUIRED') {
            setPendingAction('email')
            setConsentDialogOpen(true)
            return
          }
          
          toast({
            variant: "destructive",
            title: "Extraction Failed",
            description: error.error || "Could not extract tasks from emails.",
          })
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Network Error",
          description: "Could not connect to the server.",
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
        // Silently refresh tasks to ensure cache is in sync (no loading state)
        await fetchTasks(true)
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

  const handleDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      const res = await fetch(`/api/tasks/${taskToDelete}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: "Could not delete task.",
        })
      } else {
        // Remove task from local state
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskToDelete))
        toast({
          title: "✅ Task Deleted",
          description: "Task has been permanently deleted.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to the server.",
      })
    } finally {
      setDeleteDialogOpen(false)
      setTaskToDelete(null)
    }
  }

  const handleScheduleFocusTime = async () => {
    if (!taskToSchedule || !focusDate || !focusHour || !focusMinute) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields.",
      })
      return
    }

    const focusTime = getFocusTimeString()

    // Validate that the selected time is not in the past
    const selectedDateTime = new Date(`${focusDate}T${focusTime}`)
    const now = new Date()
    
    if (selectedDateTime < now) {
      toast({
        variant: "destructive",
        title: "Invalid Time",
        description: "Cannot schedule focus time in the past. Please select a future time.",
      })
      return
    }

    setIsScheduling(true)

    try {
      const res = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: taskToSchedule.id,
          taskTitle: taskToSchedule.title,
          taskDescription: taskToSchedule.description,
          date: focusDate,
          time: focusTime,
          duration: focusDuration,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        toast({
          variant: "destructive",
          title: "Scheduling Failed",
          description: error.error || "Could not schedule focus time in Google Calendar.",
        })
      } else {
        const result = await res.json()
        toast({
          title: "✅ Focus Time Scheduled",
          description: `Focus session scheduled for ${new Date(selectedDateTime).toLocaleString()}`,
        })
        setFocusTimeDialogOpen(false)
        resetFocusTimeForm()
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to the server.",
      })
    } finally {
      setIsScheduling(false)
    }
  }

  // Format duration in hours and minutes
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    }
    return `${hours}h ${mins}m`
  }

  const resetFocusTimeForm = () => {
    setTaskToSchedule(null)
    setFocusDate("")
    setFocusHour("09")
    setFocusMinute("00")
    setFocusDuration(60)
  }

  // Get full time string from hour and minute
  const getFocusTimeString = () => {
    return `${focusHour}:${focusMinute}`
  }

  // Check if selected focus time is in the past
  const isTimeInPast = React.useMemo(() => {
    if (!focusDate || !focusHour || !focusMinute) return false
    const timeString = `${focusHour}:${focusMinute}`
    const selectedDateTime = new Date(`${focusDate}T${timeString}`)
    const now = new Date()
    return selectedDateTime < now
  }, [focusDate, focusHour, focusMinute])

  // NLP Parser for task input (Todoist-style)
  const parseTaskInput = (input: string) => {
    let cleanTitle = input
    let priority = "Medium"
    let dueDate: string | null = null
    let dueDateText: string | null = null

    // Priority patterns: #high, #p1, !high, !!
    const priorityPatterns = [
      { regex: /#(high|p1|urgent|!!)/gi, value: "High" },
      { regex: /#(medium|p2|!)/gi, value: "Medium" },
      { regex: /#(low|p3)/gi, value: "Low" },
    ]

    for (const pattern of priorityPatterns) {
      if (pattern.regex.test(input)) {
        priority = pattern.value
        cleanTitle = cleanTitle.replace(pattern.regex, "").trim()
        break
      }
    }

    // Date patterns
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const datePatterns = [
      // "today" or "@today"
      {
        regex: /(@today|today)\b/gi,
        date: today.toISOString().split('T')[0],
        text: "Today"
      },
      // "tomorrow" or "@tomorrow"
      {
        regex: /(@tomorrow|tomorrow)\b/gi,
        date: tomorrow.toISOString().split('T')[0],
        text: "Tomorrow"
      },
      // "next week" or "@next week"
      {
        regex: /(@next week|next week)\b/gi,
        date: nextWeek.toISOString().split('T')[0],
        text: "Next Week"
      },
      // Monday, Tuesday, etc.
      {
        regex: /(@monday|monday)\b/gi,
        date: getNextDayOfWeek(1).toISOString().split('T')[0],
        text: "Monday"
      },
      {
        regex: /(@tuesday|tuesday)\b/gi,
        date: getNextDayOfWeek(2).toISOString().split('T')[0],
        text: "Tuesday"
      },
      {
        regex: /(@wednesday|wednesday)\b/gi,
        date: getNextDayOfWeek(3).toISOString().split('T')[0],
        text: "Wednesday"
      },
      {
        regex: /(@thursday|thursday)\b/gi,
        date: getNextDayOfWeek(4).toISOString().split('T')[0],
        text: "Thursday"
      },
      {
        regex: /(@friday|friday)\b/gi,
        date: getNextDayOfWeek(5).toISOString().split('T')[0],
        text: "Friday"
      },
      {
        regex: /(@saturday|saturday)\b/gi,
        date: getNextDayOfWeek(6).toISOString().split('T')[0],
        text: "Saturday"
      },
      {
        regex: /(@sunday|sunday)\b/gi,
        date: getNextDayOfWeek(0).toISOString().split('T')[0],
        text: "Sunday"
      },
      // Date formats: 12/25, Dec 25, 2024-12-25
      {
        regex: /(\d{1,2})\/(\d{1,2})\b/gi,
        handler: (match: RegExpMatchArray) => {
          const month = parseInt(match[1]) - 1
          const day = parseInt(match[2])
          const year = today.getFullYear()
          const date = new Date(year, month, day)
          if (date < today) {
            date.setFullYear(year + 1)
          }
          return {
            date: date.toISOString().split('T')[0],
            text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }
        }
      }
    ]

    for (const pattern of datePatterns) {
      const match = input.match(pattern.regex)
      if (match) {
        if (pattern.handler) {
          const result = pattern.handler(match)
          dueDate = result.date
          dueDateText = result.text
        } else {
          dueDate = pattern.date
          dueDateText = pattern.text
        }
        cleanTitle = cleanTitle.replace(pattern.regex, "").trim()
        break
      }
    }

    // Clean up extra spaces
    cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim()

    return { title: cleanTitle, priority, dueDate, dueDateText }
  }

  // Helper function to get next occurrence of a day of week
  function getNextDayOfWeek(dayOfWeek: number): Date {
    const today = new Date()
    const currentDay = today.getDay()
    let daysUntil = dayOfWeek - currentDay
    
    if (daysUntil <= 0) {
      daysUntil += 7
    }
    
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + daysUntil)
    return nextDate
  }

  // Parse task input as user types
  React.useEffect(() => {
    if (quickTaskTitle) {
      const parsed = parseTaskInput(quickTaskTitle)
      setParsedTaskPreview(parsed)
      setQuickTaskPriority(parsed.priority)
      setQuickTaskDueDate(parsed.dueDate)
    } else {
      setParsedTaskPreview(null)
    }
  }, [quickTaskTitle])

  // Quick add task handler
  const handleQuickAddTask = async () => {
    const parsed = parsedTaskPreview || parseTaskInput(quickTaskTitle)
    
    if (!parsed.title.trim()) {
      toast({
        variant: "destructive",
        title: "Task title required",
        description: "Please enter a task title",
      })
      return
    }

    setIsCreatingTask(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parsed.title.trim(),
          description: quickTaskDescription.trim() || null,
          priority: parsed.priority,
          source: 'MANUAL',
          status: 'To Do',
          dueDate: parsed.dueDate,
        }),
      })

      if (response.ok) {
        const dueDateInfo = parsed.dueDateText ? ` (Due: ${parsed.dueDateText})` : ''
        toast({
          title: "✅ Task created",
          description: `"${parsed.title}"${dueDateInfo}`,
        })
        
        // Reset form
        setQuickTaskTitle("")
        setQuickTaskDescription("")
        setQuickTaskPriority("Medium")
        setQuickTaskDueDate(null)
        setParsedTaskPreview(null)
        setShowQuickAdd(false)
        
        // Refresh tasks
        fetchTasks(true)
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Failed to create task",
          description: error.error || "Something went wrong",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network error",
        description: "Could not create task",
      })
    } finally {
      setIsCreatingTask(false)
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
    const todo = total - completed
    return { total, completed, todo }
  }, [tasks])

  const openCount = stats.todo
  const completionPct = React.useMemo(() => (stats.total ? Math.round((stats.completed / stats.total) * 100) : 0), [stats])

  const STATUS_COLOR_CLASSES: Record<string, string> = {
    "To Do": "bg-gray-500/10 text-gray-700 border-gray-200",
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
    <div className="relative min-h-screen">
      {/* Animated Mesh Background */}
      <div className="mesh-gradient-bg">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-6">
        {/* Task Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-2xl relative group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {stats.total}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">Total Tasks</div>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm">
                <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
                  {openCount}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">To Do</div>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  {stats.completed}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">Completed</div>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 backdrop-blur-sm">
                <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 dark:from-amber-400 dark:to-yellow-400 bg-clip-text text-transparent">
                  {completionPct}%
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">Progress</div>
              </div>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

        {/* Filters and Actions */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                Task Management
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Unified view from Jira, Email AI, Teams, and more
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSync} 
                disabled={isSyncing}
                className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all duration-200"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
                Sync
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExtractFromEmails} 
                disabled={isExtractingTasks}
                className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all duration-200"
              >
                {isExtractingTasks ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Extract
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExtractFromTeams} 
                disabled={isExtractingFromTeams}
                className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all duration-200"
              >
                {isExtractingFromTeams ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Teams
              </Button>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                onClick={() => setShowQuickAdd(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-3 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500"
                />
              </div>
            </div>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[200px] bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <SelectValue placeholder="All sources" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-slate-200 dark:border-slate-700">
                <SelectItem value="all">All Sources</SelectItem>
                {uniqueSources.map((s) => {
                  const config = sourceConfig[s] || sourceConfig.MANUAL
                  return (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-3.5 h-3.5" />
                        <span>{config.name}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px] bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-slate-500" />
                  <SelectValue placeholder="All statuses" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-slate-200 dark:border-slate-700">
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Add Task Form (Todoist-style with NLP) */}
          {showQuickAdd && (
            <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-lg">
              <div className="space-y-3">
                <div>
                  <Input
                    placeholder="e.g., Review design mockups tomorrow #high"
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleQuickAddTask()
                      } else if (e.key === 'Escape') {
                        setShowQuickAdd(false)
                        setQuickTaskTitle("")
                        setQuickTaskDescription("")
                        setParsedTaskPreview(null)
                      }
                    }}
                    className="font-medium border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-500"
                    autoFocus
                  />
                  
                  {/* Real-time NLP Preview */}
                  {parsedTaskPreview && parsedTaskPreview.title !== quickTaskTitle && (
                    <div className="mt-2 p-2 bg-white/80 dark:bg-slate-800/80 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Smart Parse:</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {parsedTaskPreview.title}
                            </span>
                            {parsedTaskPreview.dueDateText && (
                              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700">
                                <Calendar className="w-3 h-3 mr-1" />
                                {parsedTaskPreview.dueDateText}
                              </Badge>
                            )}
                            {parsedTaskPreview.priority !== "Medium" && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  parsedTaskPreview.priority === "High" && "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400",
                                  parsedTaskPreview.priority === "Low" && "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
                                )}
                              >
                                {parsedTaskPreview.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <Input
                  placeholder="Description (optional)"
                  value={quickTaskDescription}
                  onChange={(e) => setQuickTaskDescription(e.target.value)}
                  className="text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-500"
                />
                
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="font-medium">Try:</p>
                    <p>• "Buy groceries tomorrow" → Sets due date</p>
                    <p>• "Review PR #high" → Sets high priority</p>
                    <p>• "Team meeting friday #p1" → Date + priority</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowQuickAdd(false)
                        setQuickTaskTitle("")
                        setQuickTaskDescription("")
                        setQuickTaskPriority("Medium")
                        setParsedTaskPreview(null)
                      }}
                      disabled={isCreatingTask}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleQuickAddTask}
                      disabled={isCreatingTask || !quickTaskTitle.trim()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isCreatingTask ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Task
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <kbd className="px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded">Enter</kbd> to add • <kbd className="px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded">Esc</kbd> to cancel
                  </p>
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-3 h-3" />
                    <span className="font-medium">Smart parsing enabled</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-3">
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-slate-400" />
                <p className="text-slate-600 dark:text-slate-400">Loading tasks...</p>
              </div>
            )}
            
            {!loading &&
              filteredTasks.map((task) => {
                const isChecked = task.status === "Done"
                const currentSourceConfig = sourceConfig[task.source] || sourceConfig.MANUAL
                const currentPriorityConfig = task.priority ? priorityConfig[task.priority] : null
                const projectName = getProjectFromSourceData(task)

                return (
                  <div 
                    key={task.id} 
                    className={cn(
                      "relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700",
                      "rounded-xl p-5 group transition-all duration-200",
                      "hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
                      "hover:border-slate-300 dark:hover:border-slate-600",
                      isChecked && "opacity-75"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        aria-pressed={isChecked}
                        aria-label={isChecked ? "Mark as not done" : "Mark as done"}
                        onClick={() => toggleTaskStatus(task.id, task.status)}
                        className={cn(
                          "flex-shrink-0 mt-0.5 p-1.5 rounded-lg transition-all duration-200",
                          "hover:scale-110 active:scale-95",
                          isChecked 
                            ? "bg-gradient-to-br from-green-500 to-emerald-500 shadow-sm" 
                            : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                        )}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            {task.url ? (
                              <a 
                                href={task.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="group/link inline-flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <h3 className={cn(
                                  "font-semibold text-base leading-tight",
                                  isChecked 
                                    ? "line-through text-slate-400 dark:text-slate-500" 
                                    : "text-slate-900 dark:text-slate-100 group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400"
                                )}>
                                  {task.title}
                                </h3>
                                <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                              </a>
                            ) : (
                              <h3 className={cn(
                                "font-semibold text-base leading-tight",
                                isChecked 
                                  ? "line-through text-slate-400 dark:text-slate-500" 
                                  : "text-slate-900 dark:text-slate-100"
                              )}>
                                {task.title}
                              </h3>
                            )}
                            {task.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="flex-shrink-0 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                              >
                                <MoreHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-slate-200 dark:border-slate-700">
                              {task.url && (
                                <DropdownMenuItem asChild>
                                  <a href={task.url} target="_blank" rel="noreferrer" className="flex items-center cursor-pointer">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open in {currentSourceConfig.name}
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setTaskToSchedule(task)
                                  // Set default date to today and time to next hour
                                  const now = new Date()
                                  const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
                                  nextHour.setMinutes(0, 0, 0)
                                  setFocusDate(now.toISOString().split('T')[0])
                                  setFocusHour(nextHour.getHours().toString().padStart(2, '0'))
                                  setFocusMinute('00')
                                  setFocusTimeDialogOpen(true)
                                }}
                              >
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule Focus Time
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30"
                                onClick={() => {
                                  setTaskToDelete(task.id)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Task
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                            currentSourceConfig.color
                          )}>
                            <currentSourceConfig.icon className="w-3.5 h-3.5" />
                            <span>{task.source === 'EMAIL_AI' ? 'Mail' : task.sourceId}</span>
                          </div>
                          
                          {currentPriorityConfig && (
                            <div className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-medium",
                              currentPriorityConfig.color
                            )}>
                              {currentPriorityConfig.label}
                            </div>
                          )}
                          
                          <div className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium",
                            getStatusBadgeClass(task.status)
                          )}>
                            {task.status}
                          </div>
                          
                          {projectName && (
                            <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {projectName}
                            </div>
                          )}
                          
                          {task.dueDate && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

            {!loading && filteredTasks.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 mb-4">
                  <ListTodo className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">No tasks found</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Try syncing with Jira or adjusting your filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              Delete Task
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              This action cannot be undone. This will permanently delete the task from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTask}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule Focus Time Dialog */}
      <Dialog open={focusTimeDialogOpen} onOpenChange={(open) => {
        setFocusTimeDialogOpen(open)
        if (!open) resetFocusTimeForm()
      }}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Schedule Focus Time
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Schedule a dedicated focus session for: <span className="font-semibold text-slate-900 dark:text-slate-100">{taskToSchedule?.title}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date Input */}
            <div className="space-y-2">
              <Label htmlFor="focus-date" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Date
              </Label>
              <Input
                id="focus-date"
                type="date"
                value={focusDate}
                onChange={(e) => setFocusDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                required
              />
            </div>

            {/* Time Selection - Hour and Minute */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Start Time
              </Label>
              <div className="flex gap-2">
                {/* Hour Dropdown */}
                <Select value={focusHour} onValueChange={setFocusHour}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-h-[300px]">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hourValue = i.toString().padStart(2, '0')
                      const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i
                      const period = i >= 12 ? 'PM' : 'AM'
                      return (
                        <SelectItem key={hourValue} value={hourValue}>
                          {displayHour} {period}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                {/* Minute Dropdown */}
                <Select value={focusMinute} onValueChange={setFocusMinute}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-h-[300px]">
                    {Array.from({ length: 60 }, (_, i) => {
                      const minute = i.toString().padStart(2, '0')
                      return (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              {focusDate === new Date().toISOString().split('T')[0] && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Current time: {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              )}
            </div>

            {/* Duration Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Duration
                </Label>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatDuration(focusDuration)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Slider
                  value={[focusDuration]}
                  onValueChange={(value) => setFocusDuration(value[0])}
                  min={15}
                  max={480} // 8 hours
                  step={15} // 15-minute intervals
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>15 min</span>
                  <span>2 hrs</span>
                  <span>4 hrs</span>
                  <span>6 hrs</span>
                  <span>8 hrs</span>
                </div>
              </div>
            </div>

            {/* Warning for past time */}
            {isTimeInPast && focusDate && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-900 dark:text-red-100 font-medium">
                  ⚠️ The selected time is in the past. Please choose a future date and time.
                </p>
              </div>
            )}

            {/* Preview */}
            {focusDate && focusHour && focusMinute && !isTimeInPast && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <span className="font-semibold">Focus session will be scheduled for:</span>
                  <br />
                  {new Date(`${focusDate}T${getFocusTimeString()}`).toLocaleString()}
                  <br />
                  <span className="text-xs">Duration: {formatDuration(focusDuration)}</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFocusTimeDialogOpen(false)
                resetFocusTimeForm()
              }}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleFocusTime}
              disabled={isScheduling || !focusDate || isTimeInPast}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScheduling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule in Google Calendar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Consent Dialog */}
      <AIConsentDialog 
        isOpen={consentDialogOpen} 
        onConsent={() => {
          setConsentDialogOpen(false)
          // Retry the action that triggered consent
          if (pendingAction === 'email') {
            handleExtractFromEmails()
          } else if (pendingAction === 'teams') {
            handleExtractFromTeams()
          }
          setPendingAction(null)
        }}
        onDecline={() => {
          setConsentDialogOpen(false)
          setPendingAction(null)
        }}
      />
    </div>
  )
}
