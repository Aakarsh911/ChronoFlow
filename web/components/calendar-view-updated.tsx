"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Users, Zap, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, getDate } from "date-fns"

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

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  source: 'google' | 'microsoft'
  sourceIcon: string
  calendarName?: string
  calendarColor?: string
  status?: string
  attendees?: any[]
}

interface CalendarStats {
  google: {
    events: number
    calendars: number
    connected: boolean
  }
  microsoft: {
    events: number
    calendars: number
    connected: boolean
  }
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [stats, setStats] = useState<CalendarStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date>(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Fetch calendar events
  useEffect(() => {
    fetchCalendarEvents()
  }, [currentDate])

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)
      
      const response = await fetch(
        `/api/calendar?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events')
      }
      
      const data = await response.json()
      setEvents(data.events || [])
      setStats(data.stats || null)
      setLastSync(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching calendar events:', err)
    } finally {
      setLoading(false)
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  const getDayEvents = (day: number) => {
    const date = new Date(year, month, day)
    return events.filter((event) => {
      const eventDate = parseISO(event.start.dateTime || event.start.date || '')
      return isSameDay(eventDate, date)
    })
  }

  const formatEventTime = (event: CalendarEvent) => {
    if (!event.start.dateTime) return 'All day'
    try {
      const date = parseISO(event.start.dateTime)
      return format(date, 'h:mm a')
    } catch {
      return ''
    }
  }

  const calculateDuration = (event: CalendarEvent) => {
    if (!event.start.dateTime || !event.end.dateTime) return null
    try {
      const start = parseISO(event.start.dateTime)
      const end = parseISO(event.end.dateTime)
      const diffMs = end.getTime() - start.getTime()
      return Math.round(diffMs / 60000) // Convert to minutes
    } catch {
      return null
    }
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case "google":
        return "bg-primary/20 border-primary/40 text-primary"
      case "microsoft":
        return "bg-accent/20 border-accent/40 text-accent"
      default:
        return "bg-muted border-border text-muted-foreground"
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
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  stats?.google.connected ? "bg-primary" : "bg-muted-foreground"
                )}></div>
                <span className="font-medium text-sm">Google Calendar</span>
              </div>
              <Badge variant={stats?.google.connected ? "secondary" : "outline"} className="text-xs">
                {stats?.google.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {stats?.google.events || 0} events • Synced {format(lastSync, 'p')}
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  stats?.microsoft.connected ? "bg-accent" : "bg-muted-foreground"
                )}></div>
                <span className="font-medium text-sm">Microsoft/Outlook</span>
              </div>
              <Badge variant={stats?.microsoft.connected ? "secondary" : "outline"} className="text-xs">
                {stats?.microsoft.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {stats?.microsoft.events || 0} events • Synced {format(lastSync, 'p')}
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20 bg-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span className="font-medium text-sm">Teams Meetings</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                Via Outlook
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Integrated via Microsoft Calendar
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted-foreground/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Sync</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchCalendarEvents}
              disabled={loading}
              className="text-xs"
            >
              {loading ? "Syncing..." : "Refresh"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

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
                  <CardDescription>Your integrated calendar from Google and Microsoft</CardDescription>
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
                  const dayDate = new Date(year, month, day)
                  const isSelected = isSameDay(dayDate, selectedDate)
                  const isToday = isSameDay(dayDate, new Date())

                  return (
                    <div
                      key={day}
                      className={cn(
                        "p-2 h-24 border border-border rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                        isSelected && "bg-primary/10 border-primary/30",
                        isToday && "bg-accent/10 border-accent/30",
                      )}
                      onClick={() => setSelectedDate(dayDate)}
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
                              getSourceColor(event.source),
                            )}
                          >
                            {event.sourceIcon} {event.summary}
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
                {format(selectedDate, 'MMMM d, yyyy')}
              </CardTitle>
              <CardDescription>
                {getDayEvents(getDate(selectedDate)).length} events scheduled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {getDayEvents(getDate(selectedDate)).map((event) => {
                const duration = calculateDuration(event)
                return (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        event.source === "google" ? "bg-primary" : "bg-accent"
                      )}
                    ></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{event.summary}</h4>
                        <span className="text-xs text-muted-foreground">
                          {formatEventTime(event)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {duration && (
                          <Badge variant="outline" className="text-xs">
                            {duration}min
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs capitalize">
                          {event.source}
                        </Badge>
                        {event.location && (
                          <span className="text-xs text-muted-foreground truncate">
                            📍 {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {getDayEvents(getDate(selectedDate)).length === 0 && (
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
              <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                <ExternalLink className="w-4 h-4" />
                Open Outlook Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
