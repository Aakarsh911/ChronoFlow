"use client"

import { Bell, Check, X, Sparkles, Calendar, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

const notifications = [
  {
    id: 1,
    type: "ai-suggestion",
    title: "Focus Block Suggested",
    description: "AI recommends a 2-hour focus block at 3 PM today",
    time: "5 min ago",
    unread: true,
    icon: Sparkles,
    color: "text-blue-600"
  },
  {
    id: 2,
    type: "meeting",
    title: "Meeting Starting Soon",
    description: "Team Standup in 15 minutes",
    time: "10 min ago",
    unread: true,
    icon: Calendar,
    color: "text-purple-600"
  },
  {
    id: 3,
    type: "task",
    title: "Task Completed",
    description: "Design mockups have been marked as done",
    time: "1 hour ago",
    unread: false,
    icon: Target,
    color: "text-green-600"
  }
]

export function NotificationDropdown() {
  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-accent text-white text-xs flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 elevated-card p-0" 
        align="end" 
        sideOffset={8}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-80">
          <div className="p-2">
            {notifications.map((notification, index) => {
              const Icon = notification.icon
              
              return (
                <div key={notification.id}>
                  <div className={`
                    flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/30
                    ${notification.unread ? 'bg-primary/5' : ''}
                  `}>
                    <div className={`w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center ${notification.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${notification.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{notification.time}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.description}
                      </p>
                      {notification.unread && (
                        <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                  {index < notifications.length - 1 && <DropdownMenuSeparator className="my-1" />}
                </div>
              )
            })}
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full text-sm text-muted-foreground hover:text-foreground">
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
