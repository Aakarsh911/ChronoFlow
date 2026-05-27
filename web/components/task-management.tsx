"use client"

import React, { useState, useEffect, useTransition } from "react"
import {
  CheckCircle2,
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
  RefreshCw,
  Sparkles,
  Loader2,
  Zap,
  Clock,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { PageHeader } from "@/components/page-header"
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

  // Split tasks into active and completed for grouped display
  const activeTasks = filteredTasks.filter((t) => t.status !== "Done")
  const completedTasks = filteredTasks.filter((t) => t.status === "Done")

  const renderTaskRow = (task: UITask) => {
    const isChecked = task.status === "Done"
    const currentSourceConfig = sourceConfig[task.source] || sourceConfig.MANUAL
    const currentPriorityConfig = task.priority ? priorityConfig[task.priority] : null
    const projectName = getProjectFromSourceData(task)

    // Status dot color
    const statusDotColor =
      task.status === "Done"
        ? "bg-emerald-500"
        : task.status === "In Progress"
          ? "bg-blue-500"
          : task.status === "In Review"
            ? "bg-amber-500"
            : "bg-[var(--cf-border-strong)]"

    return (
      <div key={task.id} className={cn("cf-task-row group", isChecked && "is-done")}>
        {/* Checkbox */}
        <button
          type="button"
          aria-pressed={isChecked}
          aria-label={isChecked ? "Mark as not done" : "Mark as done"}
          onClick={() => toggleTaskStatus(task.id, task.status)}
          className={cn(
            "cf-task-check mt-0.5 shrink-0 transition-all duration-150",
            isChecked && "is-done",
          )}
        >
          {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {task.url ? (
                <a
                  href={task.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group/link inline-flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className={cn(
                      "text-sm font-medium leading-snug text-[var(--cf-text)] transition-colors",
                      isChecked && "line-through text-[var(--cf-text-dim)]",
                      !isChecked && "group-hover/link:text-[rgba(var(--cf-accent-rgb),1)]",
                    )}
                  >
                    {task.title}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-[var(--cf-text-dim)] opacity-0 transition-opacity group-hover/link:opacity-100" />
                </a>
              ) : (
                <span
                  className={cn(
                    "text-sm font-medium leading-snug text-[var(--cf-text)]",
                    isChecked && "line-through text-[var(--cf-text-dim)]",
                  )}
                >
                  {task.title}
                </span>
              )}
              {task.description && (
                <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-[var(--cf-text-dim)]">
                  {task.description}
                </p>
              )}
            </div>

            {/* Right-side badges + menu */}
            <div className="flex shrink-0 items-center gap-2">
              {/* Priority badge */}
              {currentPriorityConfig && !isChecked && (
                <span
                  className={cn(
                    "hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    currentPriorityConfig.color,
                  )}
                >
                  {currentPriorityConfig.label}
                </span>
              )}
              {/* Due date */}
              {task.dueDate && !isChecked && (
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-[var(--cf-text-muted)]">
                  <Clock className="h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}

              {/* More menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {task.url && (
                    <DropdownMenuItem asChild>
                      <a href={task.url} target="_blank" rel="noreferrer" className="flex cursor-pointer items-center">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in {currentSourceConfig.name}
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      setTaskToSchedule(task)
                      const now = new Date()
                      const nextHour = new Date(now.getTime() + 60 * 60 * 1000)
                      nextHour.setMinutes(0, 0, 0)
                      setFocusDate(now.toISOString().split("T")[0])
                      setFocusHour(nextHour.getHours().toString().padStart(2, "0"))
                      setFocusMinute("00")
                      setFocusTimeDialogOpen(true)
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule focus time
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/30"
                    onClick={() => {
                      setTaskToDelete(task.id)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* Source badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                currentSourceConfig.color,
              )}
            >
              <currentSourceConfig.icon className="h-2.5 w-2.5" />
              {task.source === "EMAIL_AI" ? "Mail AI" : currentSourceConfig.name}
            </span>

            {/* Status pill */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--cf-text-muted)]">
              <span className={cn("h-1.5 w-1.5 rounded-full", statusDotColor)} />
              {task.status}
            </span>

            {/* Project tag */}
            {projectName && (
              <span className="cf-tag">{projectName}</span>
            )}

            {/* Mobile: priority + due date */}
            {currentPriorityConfig && !isChecked && (
              <span
                className={cn(
                  "sm:hidden inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  currentPriorityConfig.color,
                )}
              >
                {currentPriorityConfig.label}
              </span>
            )}
            {task.dueDate && !isChecked && (
              <span className="md:hidden inline-flex items-center gap-1 cf-tag">
                <Clock className="h-2.5 w-2.5" />
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cf-page-shell">
      <div className="cf-page-inner space-y-6">
        {/* ── Header ── */}
        <PageHeader
          eyebrow="Tasks"
          title="Task board"
          subtitle="Unified view from Jira, email AI, Teams, and more"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={cn("mr-1.5 h-4 w-4", isSyncing && "animate-spin")} />
                Sync Jira
              </Button>
              <Button size="sm" className="cf-btn-primary gap-1.5" onClick={() => setShowQuickAdd(true)}>
                <Plus className="h-4 w-4" />
                Add task
              </Button>
            </div>
          }
        />

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Total */}
          <div className="cf-stat-card flex items-start justify-between gap-2">
            <div>
              <p className="cf-stat-card-label">Total tasks</p>
              <p className="cf-stat-card-value">{stats.total}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cf-bg-soft)] text-[var(--cf-text-muted)]">
              <ListChecks className="h-4 w-4" />
            </div>
          </div>
          {/* To do */}
          <div className="cf-stat-card flex items-start justify-between gap-2">
            <div>
              <p className="cf-stat-card-label">To do</p>
              <p className="cf-stat-card-value">{openCount}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <ListTodo className="h-4 w-4" />
            </div>
          </div>
          {/* Completed */}
          <div className="cf-stat-card flex items-start justify-between gap-2">
            <div>
              <p className="cf-stat-card-label">Completed</p>
              <p className="cf-stat-card-value">{stats.completed}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          {/* Progress */}
          <div className="cf-stat-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="cf-stat-card-label">Progress</p>
                <p className="cf-stat-card-value">{completionPct}%</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(var(--cf-accent-rgb),0.12)] text-[rgba(var(--cf-accent-rgb),1)]">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <Progress value={completionPct} className="mt-3 h-1.5" />
          </div>
        </div>

        {/* ── Main task panel ── */}
        <div className="cf-data-panel">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-[var(--cf-border)] px-4 py-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--cf-text-dim)]" />
              <Input
                placeholder="Search tasks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>

            {/* Filters + actions row */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-[var(--cf-text-muted)]" />
                    <SelectValue placeholder="All sources" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {uniqueSources.map((s) => {
                    const cfg = sourceConfig[s] || sourceConfig.MANUAL
                    return (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <cfg.icon className="h-3.5 w-3.5" />
                          <span>{cfg.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <div className="flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-[var(--cf-text-muted)]" />
                    <SelectValue placeholder="All statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {uniqueStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Divider */}
              <div className="hidden h-5 w-px bg-[var(--cf-border)] sm:block" />

              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExtractFromEmails} disabled={isExtractingTasks}>
                {isExtractingTasks ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Extract from email
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExtractFromTeams} disabled={isExtractingFromTeams}>
                {isExtractingFromTeams ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                Teams AI
              </Button>
            </div>
          </div>

          {/* Quick-add input */}
          {showQuickAdd && (
            <div className="border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-4">
              <div className="space-y-3">
                <div>
                  <Input
                    placeholder='e.g., "Review design mockups tomorrow #high"'
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleQuickAddTask()
                      } else if (e.key === "Escape") {
                        setShowQuickAdd(false)
                        setQuickTaskTitle("")
                        setQuickTaskDescription("")
                        setParsedTaskPreview(null)
                      }
                    }}
                    className="text-sm font-medium"
                    autoFocus
                  />

                  {parsedTaskPreview && parsedTaskPreview.title !== quickTaskTitle && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-[rgba(var(--cf-accent-rgb),0.25)] bg-[rgba(var(--cf-accent-rgb),0.06)] p-2.5">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[rgba(var(--cf-accent-rgb),1)]" />
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[rgba(var(--cf-accent-rgb),0.8)]">Smart parse</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[var(--cf-text)]">{parsedTaskPreview.title}</span>
                          {parsedTaskPreview.dueDateText && (
                            <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[11px]">
                              <Calendar className="h-2.5 w-2.5" />
                              {parsedTaskPreview.dueDateText}
                            </Badge>
                          )}
                          {parsedTaskPreview.priority !== "Medium" && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
                              {parsedTaskPreview.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  placeholder="Description (optional)"
                  value={quickTaskDescription}
                  onChange={(e) => setQuickTaskDescription(e.target.value)}
                  className="text-sm"
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--cf-text-dim)]">
                    Tip: type &quot;tomorrow&quot;, &quot;monday&quot;, or &quot;#high&quot; to auto-parse
                  </p>
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
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="cf-btn-primary h-8 gap-1.5 text-xs"
                      onClick={handleQuickAddTask}
                      disabled={isCreatingTask || !quickTaskTitle.trim()}
                    >
                      {isCreatingTask ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          Add task
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Task list */}
          <div className="cf-panel-body-flush">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="mb-3 h-7 w-7 animate-spin text-[var(--cf-text-dim)]" />
                <p className="text-sm text-[var(--cf-text-muted)]">Loading tasks…</p>
              </div>
            )}

            {!loading && filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--cf-border)] bg-[var(--cf-bg-soft)]">
                  <ListTodo className="h-6 w-6 text-[var(--cf-text-dim)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--cf-text)]">No tasks found</h3>
                <p className="mt-1 max-w-xs text-center text-xs text-[var(--cf-text-muted)]">
                  {tasks.length === 0
                    ? "Sync with Jira, extract from emails, or add a task manually to get started."
                    : "Try adjusting your search or filters."}
                </p>
                {tasks.length === 0 && (
                  <Button size="sm" className="cf-btn-primary mt-4 gap-1.5" onClick={() => setShowQuickAdd(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add your first task
                  </Button>
                )}
              </div>
            )}

            {!loading && activeTasks.length > 0 && (
              <>
                {/* Section header: active */}
                <div className="flex items-center gap-2 border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--cf-text-muted)]">
                    Open
                  </span>
                  <span className="flex h-4 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--cf-border-strong)] px-1 text-[10px] font-bold text-[var(--cf-text-muted)]">
                    {activeTasks.length}
                  </span>
                </div>
                {activeTasks.map(renderTaskRow)}
              </>
            )}

            {!loading && completedTasks.length > 0 && (
              <>
                {/* Section header: completed */}
                <div className="flex items-center gap-2 border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--cf-text-muted)]">
                    Completed
                  </span>
                  <span className="flex h-4 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500/15 px-1 text-[10px] font-bold text-emerald-600">
                    {completedTasks.length}
                  </span>
                </div>
                {completedTasks.map(renderTaskRow)}
              </>
            )}
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
    </div>
  )
}
