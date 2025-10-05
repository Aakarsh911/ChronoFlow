"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Settings,
  RefreshCw,
  Filter,
  ExternalLink,
  Check,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday, parseISO, addDays } from "date-fns"
import { CalendarLoadingSkeleton } from "./calendar-loading-skeleton"
import { getCalendarColorFromId, getContrastTextColor, getLighterColor } from "@/lib/calendar-colors"

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>
  calendarId: string
  calendarName: string
  calendarColor?: string
  htmlLink: string
}

interface CalendarInfo {
  id: string
  summary: string
  description?: string
  backgroundColor?: string
  foregroundColor?: string
  colorId?: string
  primary?: boolean
  accessRole: string
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return `${hour}:00`
})

const WORK_HOURS = { start: 0, end: 24 }

export function WeeklyCalendarView() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [enabledCalendars, setEnabledCalendars] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const fetchingRef = useRef(false)

  // Debug loading state changes
  useEffect(() => {
    console.log('🔄 Loading state changed:', loading)
  }, [loading])

  // Memoize the week dates to prevent unnecessary recalculations
  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek])
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek])
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])
  
  // Only show work days (Monday to Friday)
  const workDays = useMemo(() => weekDays.slice(0, 5), [weekDays])

  // Manual refresh function
  const refreshCalendarData = useCallback(() => {
    console.log('🔄 Manual calendar refresh triggered')
    // Reset the ref to allow new fetch
    fetchingRef.current = false
    // Reset loading state in case it's stuck
    setLoading(false)
    setError(null)
    
    // Trigger a re-fetch by updating the current week (this will trigger the useEffect)
    setCurrentWeek(prev => new Date(prev.getTime()))
  }, [])

  useEffect(() => {
    let isCancelled = false
    
    const fetchData = async () => {
      // Prevent multiple simultaneous requests
      if (fetchingRef.current) {
        console.log('🚫 Calendar fetch blocked - request already in progress')
        return
      }
      
      console.log('📅 Starting calendar fetch...', {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString()
      })
      
      fetchingRef.current = true
      setLoading(true)
      setError(null)
      
      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        if (fetchingRef.current) {
          console.warn('⚠️ Calendar fetch timeout - forcing cleanup')
          setLoading(false)
          fetchingRef.current = false
          if (!isCancelled) {
            setError('Request timed out')
          }
        }
      }, 30000) // 30 second timeout
      
      try {
        const response = await fetch(
          `/api/calendar/google?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        )
        
        console.log('📡 API Response status:', response.status)
        
        if (isCancelled) {
          console.log('❌ Request cancelled during fetch')
          return
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('❌ API Error:', errorData)
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch calendar data`)
        }
        
        const data = await response.json()
        console.log('✅ Calendar data received:', {
          calendarsCount: data.calendars?.length || 0,
          eventsCount: data.events?.length || 0,
          calendars: data.calendars,
          events: data.events
        })
        
        if (!isCancelled) {
          setCalendars(data.calendars || [])
          setEvents(data.events || [])
          
          // Only set default calendar selection if no calendars are currently enabled
          setEnabledCalendars(prevEnabled => {
            if (prevEnabled.size === 0) {
              // Enable primary calendar by default only on first load
              const primaryCalendars = data.calendars?.filter((cal: CalendarInfo) => cal.primary) || []
              return new Set(primaryCalendars.map((cal: CalendarInfo) => cal.id))
            }
            // Preserve existing selection but ensure selected calendars still exist
            const availableCalendarIds = new Set(data.calendars?.map((cal: CalendarInfo) => cal.id) || [])
            const validSelection = new Set([...prevEnabled].filter(id => availableCalendarIds.has(id)))
            return validSelection
          })
          
          console.log('🎯 State updated with data')
        }
        
      } catch (err) {
        console.error('💥 Calendar fetch error:', err)
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      } finally {
        // Clear the timeout
        clearTimeout(timeout)
        // Always reset loading and fetchingRef, regardless of cancellation
        console.log('🏁 Calendar fetch completed, cleaning up...')
        setLoading(false)
        fetchingRef.current = false
      }
    }
    
    fetchData()
    
    return () => {
      isCancelled = true
    }
  }, [weekStart, weekEnd])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Scroll to current time when calendar loads
  useEffect(() => {
    const scrollToCurrentTime = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const calendarGrid = document.getElementById('calendar-grid')
      
      if (calendarGrid) {
        // Scroll to current hour (minus 2 hours for context)
        const targetHour = Math.max(0, currentHour - 2)
        const scrollTop = targetHour * 40 // 40px per hour
        calendarGrid.scrollTop = scrollTop
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(scrollToCurrentTime, 500)
    return () => clearTimeout(timer)
  }, [calendars, events]) // Re-scroll when data loads

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek(prev => direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1))
  }

  const toggleCalendar = (calendarId: string) => {
    setEnabledCalendars(prev => {
      const newSet = new Set(prev)
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId)
      } else {
        newSet.add(calendarId)
      }
      return newSet
    })
  }

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      if (!enabledCalendars.has(event.calendarId)) return false
      
      const eventDate = event.start.dateTime 
        ? new Date(event.start.dateTime)
        : event.start.date 
        ? new Date(event.start.date + 'T00:00:00') 
        : null
      
      return eventDate && isSameDay(eventDate, day)
    })
  }

  const getAllDayEventsForDay = (day: Date) => {
    return events.filter(event => {
      if (!enabledCalendars.has(event.calendarId)) return false
      
      // All-day events have only a date, not dateTime
      if (event.start.date && !event.start.dateTime) {
        const eventDate = new Date(event.start.date + 'T00:00:00')
        return isSameDay(eventDate, day)
      }
      
      return false
    })
  }

  const getTimedEventsForDay = (day: Date) => {
    return events.filter(event => {
      if (!enabledCalendars.has(event.calendarId)) return false
      
      // Only include events with specific times (not all-day)
      if (event.start.dateTime) {
        const eventDate = new Date(event.start.dateTime)
        return isSameDay(eventDate, day)
      }
      
      return false
    })
  }

  const getEventTime = (event: CalendarEvent) => {
    if (event.start.dateTime && event.end.dateTime) {
      const start = new Date(event.start.dateTime)
      const end = new Date(event.end.dateTime)
      return {
        start: format(start, 'HH:mm'),
        end: format(end, 'HH:mm'),
        isAllDay: false,
      }
    }
    return { start: '', end: '', isAllDay: true }
  }

  const getEventPosition = (event: CalendarEvent) => {
    if (!event.start.dateTime) return { top: 0, height: 40 }
    
    // Parse the datetime strings - Google Calendar API returns RFC3339 format with timezone
    const start = new Date(event.start.dateTime)
    const end = event.end.dateTime ? new Date(event.end.dateTime) : start
    
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
    const duration = endMinutes - startMinutes
    
    return {
      top: (startMinutes / 60) * 40, // 40px per hour, starting from 0:00 (no offset)
      height: Math.max((duration / 60) * 40, 20), // Minimum 20px height
    }
  }

  const getCalendarColor = (calendarId: string) => {
    return getCalendarColorFromId(calendarId, calendars)
  }

  const filteredEvents = events.filter(event => enabledCalendars.has(event.calendarId))
  const enabledCalendarsList = calendars.filter(cal => enabledCalendars.has(cal.id))

  if (loading) {
    return <CalendarLoadingSkeleton />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-semibold mb-2">Failed to load calendar</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshCalendarData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (calendars.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Calendar Connected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Google Calendar to view your events here.
            </p>
            <Button onClick={refreshCalendarData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Connect Calendar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredEvents.length} events across {enabledCalendarsList.length} calendars
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Calendar Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Calendars ({enabledCalendars.size})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end" side="bottom" sideOffset={8}>
              <div className="flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 pb-3 border-b flex-shrink-0">
                  <h4 className="font-semibold text-sm">Calendar Sources</h4>
                  <Badge variant="secondary" className="text-xs">
                    {calendars.length} available
                  </Badge>
                </div>
                
                {/* Scrollable Calendar List */}
                <ScrollArea className="max-h-64 overflow-y-auto">
                  <div className="p-4 space-y-3">
                    {calendars.map((calendar) => (
                      <div key={calendar.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: calendar.backgroundColor || '#3b82f6' }}
                        />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={`cal-${calendar.id}`} className="text-sm font-medium cursor-pointer block">
                            {calendar.summary}
                          </Label>
                          {calendar.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{calendar.description}</p>
                          )}
                          {calendar.primary && (
                            <Badge variant="outline" className="text-xs mt-1">Primary</Badge>
                          )}
                        </div>
                        <Switch
                          id={`cal-${calendar.id}`}
                          checked={enabledCalendars.has(calendar.id)}
                          onCheckedChange={() => toggleCalendar(calendar.id)}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Footer */}
                <div className="flex-shrink-0 border-t">
                  <div className="flex justify-between gap-2 p-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEnabledCalendars(new Set())}
                      className="flex-1"
                    >
                      Hide All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEnabledCalendars(new Set(calendars.map(cal => cal.id)))}
                      className="flex-1"
                    >
                      Show All
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Refresh Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshCalendarData}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Sync
          </Button>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentWeek(new Date())}
              className="px-4"
            >
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-6 border-b">
            {/* Time column header */}
            <div className="p-4 border-r bg-muted/30">
              <div className="text-xs font-medium text-muted-foreground">Time</div>
            </div>
            
            {/* Day headers */}
            {workDays.map((day) => (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "p-4 text-center border-r last:border-r-0 transition-colors duration-200",
                  isToday(day) && "bg-primary/5"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-lg font-semibold mt-1 transition-colors duration-200",
                  isToday(day) && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* All-day events section */}
          <div className="grid grid-cols-6 border-b bg-muted/10">
            {/* All-day label */}
            <div className="p-2 border-r bg-muted/30 flex items-center justify-center">
              <span className="text-xs text-muted-foreground font-medium">All day</span>
            </div>
            
            {/* All-day events for each day */}
            {workDays.map((day) => {
              const allDayEvents = getAllDayEventsForDay(day)
              return (
                <div 
                  key={`allday-${day.toISOString()}`}
                  className={cn(
                    "border-r last:border-r-0 p-1 min-h-[60px] space-y-1",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  {allDayEvents.map((event) => {
                    const calendarColor = getCalendarColor(event.calendarId)
                    return (
                      <div
                        key={`allday-${event.id}`}
                        className="text-xs p-1 rounded border-l-4 bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer truncate"
                        style={{ borderLeftColor: calendarColor }}
                        title={event.summary}
                      >
                        {event.summary}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Time slots and events */}
          <div className="relative">
            {/* Scrollable time grid container */}
            <div className="relative h-96 overflow-y-auto scroll-smooth" id="calendar-grid">
              {/* Time grid */}
              {Array.from({ length: 24 }, (_, i) => {
                const hour = i
                return (
                  <div key={hour} className="grid grid-cols-6 border-b last:border-b-0" style={{ height: '40px' }}>
                    {/* Time label */}
                    <div className="border-r bg-muted/30 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground font-medium">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                    
                    {/* Day columns */}
                    {workDays.map((day) => (
                      <div 
                        key={`${day.toISOString()}-${hour}`}
                        className={cn(
                          "border-r last:border-r-0 relative",
                          isToday(day) && "bg-primary/5"
                        )}
                      />
                    ))}
                  </div>
                )
              })}

              {/* Events overlay - positioned within the scrollable container */}
              {workDays.map((day, dayIndex) => {
                const dayEvents = getTimedEventsForDay(day)
                
                return dayEvents.map((event, eventIndex) => {
                  const position = getEventPosition(event)
                  const timeInfo = getEventTime(event)
                  const calendarColor = getCalendarColor(event.calendarId)
                  
                  return (
                    <div
                      key={`${event.id}-${eventIndex}`}
                      className="absolute z-10 mx-1"
                      style={{
                        left: `${((dayIndex + 1) * (100 / 6))}%`,
                        width: `${(100 / 6) - 0.5}%`,
                        top: `${position.top}px`, // Direct positioning within time grid
                        height: `${position.height}px`,
                      }}
                    >
                    <div
                      className="h-full rounded-md border-l-4 bg-background shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-2 overflow-hidden hover:scale-[1.02] hover:z-20 relative"
                      style={{ borderLeftColor: calendarColor }}
                    >
                      <div className="text-xs font-medium line-clamp-2 mb-1">
                        {event.summary}
                      </div>
                      
                      {!timeInfo.isAllDay && (
                        <div className="text-xs text-muted-foreground mb-1">
                          {timeInfo.start} - {timeInfo.end}
                        </div>
                      )}
                      
                      {event.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Users className="w-3 h-3 flex-shrink-0" />
                          <span>{event.attendees.length} attendees</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Events Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Today's Schedule
            </CardTitle>
            <Badge variant="secondary">
              {getEventsForDay(new Date()).length} events
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {getEventsForDay(new Date()).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No events scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getEventsForDay(new Date())
                .sort((a, b) => {
                  const timeA = a.start.dateTime || a.start.date || ''
                  const timeB = b.start.dateTime || b.start.date || ''
                  return timeA.localeCompare(timeB)
                })
                .map((event) => {
                  const timeInfo = getEventTime(event)
                  const calendarColor = getCalendarColor(event.calendarId)
                  
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                      <div 
                        className="w-1 h-12 rounded-full flex-shrink-0"
                        style={{ backgroundColor: calendarColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">{event.summary}</h4>
                          {!timeInfo.isAllDay && (
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {timeInfo.start} - {timeInfo.end}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="truncate">{event.calendarName}</span>
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {event.location}
                            </span>
                          )}
                          {event.attendees && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <Users className="w-3 h-3" />
                              {event.attendees.length}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={event.htmlLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-shrink-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
