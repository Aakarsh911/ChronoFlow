"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Users, Zap, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

// Mock data for calendar events
const mockEvents = [
  { id: 1, title: "Team Standup", time: "9:00 AM", type: "meeting", source: "google", date: 15, duration: 30 },
  { id: 2, title: "Deep Work Session", time: "10:00 AM", type: "focus", source: "ai", date: 15, duration: 120 },
  { id: 3, title: "Client Review", time: "2:00 PM", type: "meeting", source: "outlook", date: 15, duration: 60 },
  { id: 4, title: "Code Review", time: "11:00 AM", type: "focus", source: "ai", date: 16, duration: 90 },
  { id: 5, title: "Sprint Planning", time: "3:00 PM", type: "meeting", source: "google", date: 17, duration: 90 },
]

const integrationStatus = {
  google: { connected: true, events: 12, lastSync: "2 min ago" },
  outlook: { connected: true, events: 8, lastSync: "5 min ago" },
  slack: { connected: true, tasks: 6, lastSync: "1 min ago" },
  jira: { connected: false, tasks: 0, lastSync: "Never" },
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(15)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  const getDayEvents = (day: number) => {
    return mockEvents.filter((event) => event.date === day)
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-chart-4/20 border-chart-4/40 text-chart-4"
      case "focus":
        return "bg-primary/20 border-primary/40 text-primary"
      default:
        return "bg-muted border-border text-muted-foreground"
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "google":
        return "🟢"
      case "outlook":
        return "🔵"
      case "ai":
        return "🤖"
      default:
        return "📅"
    }
  }

  return (
    <div className="space-y-6">
      {/* Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="font-medium text-sm">Google Calendar</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Connected
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {integrationStatus.google.events} events • Synced {integrationStatus.google.lastSync}
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="font-medium text-sm">Outlook</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Connected
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {integrationStatus.outlook.events} events • Synced {integrationStatus.outlook.lastSync}
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 bg-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span className="font-medium text-sm">Slack Tasks</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Connected
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {integrationStatus.slack.tasks} tasks • Synced {integrationStatus.slack.lastSync}
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted-foreground/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                <span className="font-medium text-sm">Jira</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Setup Required
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Not connected •{" "}
              <Button variant="link" className="p-0 h-auto text-xs">
                Connect now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {MONTHS[month]} {year}
                  </CardTitle>
                  <CardDescription>Your integrated calendar with AI-optimized focus blocks</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Event
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {DAYS.map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} className="p-2 h-24"></div>
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const dayEvents = getDayEvents(day)
                  const isSelected = day === selectedDate
                  const isToday = day === 15 // Mock today as 15th

                  return (
                    <div
                      key={day}
                      className={cn(
                        "p-2 h-24 border border-border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                        isSelected && "bg-primary/10 border-primary/30",
                        isToday && "bg-accent/10 border-accent/30",
                      )}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className={cn("text-sm font-medium mb-1", isToday && "text-accent font-semibold")}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "text-xs p-1 rounded border text-center truncate",
                              getEventTypeColor(event.type),
                            )}
                          >
                            {getSourceIcon(event.source)} {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center">+{dayEvents.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day Details & Actions */}
        <div className="space-y-6">
          {/* Selected Day Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {MONTHS[month]} {selectedDate}, {year}
              </CardTitle>
              <CardDescription>{getDayEvents(selectedDate).length} events scheduled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {getDayEvents(selectedDate).map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div
                    className={cn("w-3 h-3 rounded-full", event.type === "meeting" ? "bg-chart-4" : "bg-primary")}
                  ></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <span className="text-xs text-muted-foreground">{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {event.duration}min
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {event.type === "meeting" ? "Meeting" : "Focus Block"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getSourceIcon(event.source)} {event.source}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {getDayEvents(selectedDate).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No events scheduled for this day</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-4 h-4 text-accent" />
                AI Suggestions
              </CardTitle>
              <CardDescription>Optimized scheduling recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Schedule Focus Block</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      You have 2 hours available between meetings. Perfect for deep work.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2 text-xs bg-transparent">
                      Add 2h Focus Block
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-accent mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Team Availability</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      3 team members are free at 4 PM for potential collaboration.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2 text-xs bg-transparent">
                      Schedule Team Time
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                <Plus className="w-4 h-4" />
                Create Focus Block
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                <Calendar className="w-4 h-4" />
                Schedule Meeting
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                <ExternalLink className="w-4 h-4" />
                Open Google Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
