"use client"

import { useState, useEffect } from "react"
import { Bell, X, Clock, Calendar, Target, Users, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "info" | "success" | "warning" | "error"
  title: string
  message: string
  timestamp: Date
  category: "focus" | "meeting" | "task" | "team" | "system"
  actionable?: boolean
  actions?: Array<{
    label: string
    action: () => void
    variant?: "default" | "outline" | "destructive"
  }>
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "warning",
    title: "Focus Block Interrupted",
    message: "Your deep work session was interrupted by 3 Slack messages. Consider enabling Do Not Disturb.",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    category: "focus",
    actionable: true,
    actions: [
      { label: "Enable DND", action: () => console.log("Enable DND"), variant: "default" },
      { label: "Dismiss", action: () => console.log("Dismiss"), variant: "outline" },
    ],
  },
  {
    id: "2",
    type: "info",
    title: "Meeting Starting Soon",
    message: "Team Standup starts in 15 minutes. Join link has been copied to clipboard.",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    category: "meeting",
    actionable: true,
    actions: [
      { label: "Join Now", action: () => console.log("Join meeting"), variant: "default" },
      { label: "Snooze 5min", action: () => console.log("Snooze"), variant: "outline" },
    ],
  },
  {
    id: "3",
    type: "success",
    title: "Task Completed",
    message: 'Great job! You completed "Review API documentation" 30 minutes ahead of schedule.',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    category: "task",
  },
  {
    id: "4",
    type: "info",
    title: "Schedule Optimization",
    message: "AI suggests moving your 3 PM meeting to tomorrow to create a 4-hour focus block.",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    category: "system",
    actionable: true,
    actions: [
      { label: "Accept", action: () => console.log("Accept suggestion"), variant: "default" },
      { label: "Decline", action: () => console.log("Decline"), variant: "outline" },
    ],
  },
  {
    id: "5",
    type: "warning",
    title: "Team Member Unavailable",
    message: "Sarah marked herself as unavailable for the rest of the day. Consider rescheduling your 4 PM sync.",
    timestamp: new Date(Date.now() - 20 * 60 * 1000),
    category: "team",
    actionable: true,
    actions: [{ label: "Reschedule", action: () => console.log("Reschedule"), variant: "default" }],
  },
]

export function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Simulate real-time notifications
    const interval = setInterval(() => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: Math.random() > 0.5 ? "info" : "warning",
        title: "New Update",
        message: "This is a simulated real-time notification.",
        timestamp: new Date(),
        category: "system",
      }

      setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]) // Keep only 10 notifications
      setUnreadCount((prev) => prev + 1)
    }, 30000) // New notification every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getNotificationIcon = (category: string) => {
    switch (category) {
      case "focus":
        return <Clock className="w-4 h-4" />
      case "meeting":
        return <Calendar className="w-4 h-4" />
      case "task":
        return <Target className="w-4 h-4" />
      case "team":
        return <Users className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-accent"
      case "warning":
        return "text-yellow-500"
      case "error":
        return "text-red-500"
      default:
        return "text-primary"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-accent" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Info className="w-4 h-4 text-primary" />
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    return timestamp.toLocaleDateString()
  }

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleNotificationClick = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setUnreadCount(0)
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={handleNotificationClick} className="relative">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <Card key={notification.id} className="m-2 border-l-4 border-l-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5", getNotificationColor(notification.category))}>
                          {getNotificationIcon(notification.category)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(notification.type)}
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => dismissNotification(notification.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{notification.message}</p>

                          {notification.actionable && notification.actions && (
                            <div className="flex gap-2 mt-3">
                              {notification.actions.map((action, index) => (
                                <Button
                                  key={index}
                                  variant={action.variant || "outline"}
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={action.action}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              View All Notifications
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
