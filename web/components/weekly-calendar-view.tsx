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

// Cache structure for storing calendar data
interface CalendarCache {
  events: CalendarEvent[]
  calendars: CalendarInfo[]
  timestamp: number
  weekStart: string
  weekEnd: string
}

export function WeeklyCalendarView() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [enabledCalendars, setEnabledCalendars] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true) // Start with true for initial load
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const fetchingRef = useRef(false)
  const cacheRef = useRef<Map<string, CalendarCache>>(new Map())
  const preloadingRef = useRef<Set<string>>(new Set())
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const hasLoadedRef = useRef(false) // Track if we've ever loaded data

  useEffect(() => {
    const el = document.getElementById('calendar-grid')
    if (!el) return

    const update = () => {
      const hasVScroll = el.scrollHeight > el.clientHeight
      const sbw = hasVScroll ? (el.offsetWidth - el.clientWidth) : 0
      setScrollbarWidth(sbw > 0 ? sbw : 0)
    }

    // initial + next tick (after layout)
    update()
    requestAnimationFrame(update)

    const ro = new ResizeObserver(update)
    ro.observe(el)

    const mo = new MutationObserver(update)
    mo.observe(el, { childList: true, subtree: true })

    window.addEventListener('resize', update)

    return () => {
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [events, calendars]) // rerun when data changes




  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek])
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek])
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])
  const workDays = useMemo(() => weekDays.slice(0, 5), [weekDays])

  const getCacheKey = useCallback((weekStart: Date, weekEnd: Date) => {
    return `${format(weekStart, 'yyyy-MM-dd')}_${format(weekEnd, 'yyyy-MM-dd')}`
  }, [])

  const getCachedData = useCallback((weekStart: Date, weekEnd: Date) => {
    const key = getCacheKey(weekStart, weekEnd)
    const cached = cacheRef.current.get(key)
    
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000 // 5 minutes expiry
      if (!isExpired) {
        return cached
      } else {
        cacheRef.current.delete(key)
      }
    }
    
    return null
  }, [getCacheKey])

  const setCachedData = useCallback((weekStart: Date, weekEnd: Date, events: CalendarEvent[], calendars: CalendarInfo[]) => {
    const key = getCacheKey(weekStart, weekEnd)
    
    if (cacheRef.current.size >= 50) {
      const entries = Array.from(cacheRef.current.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      for (let i = 0; i < 10 && i < entries.length; i++) {
        cacheRef.current.delete(entries[i][0])
      }
    }
    
    cacheRef.current.set(key, {
      events,
      calendars,
      timestamp: Date.now(),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    })
  }, [getCacheKey])

  const refreshCalendarData = useCallback(() => {
    cacheRef.current.clear()
    preloadingRef.current.clear()
    fetchingRef.current = false
    hasLoadedRef.current = false
    setLoading(true)
    setError(null)
    setCurrentWeek(prev => new Date(prev.getTime()))
  }, [])

  const backgroundFetch = useCallback(async (weekStart: Date, weekEnd: Date) => {
    const key = getCacheKey(weekStart, weekEnd)
    
    if (getCachedData(weekStart, weekEnd) || preloadingRef.current.has(key)) {
      return
    }
    
    preloadingRef.current.add(key)
    
    try {
      const response = await fetch(
        `/api/calendar?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setCachedData(weekStart, weekEnd, data.events || [], data.calendars || [])
      
    } catch (err) {
      console.error('Background fetch failed for:', format(weekStart, 'MMM d'), err)
    } finally {
      preloadingRef.current.delete(key)
    }
  }, [getCacheKey, getCachedData, setCachedData])

  const preloadMultipleWeeks = useCallback(async (centerWeek: Date, weeksAhead = 8, weeksBehind = 4) => {
    const preloadPromises: Promise<void>[] = []
    
    for (let i = 1; i <= weeksBehind; i++) {
      const targetWeek = subWeeks(centerWeek, i)
      const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 })
      preloadPromises.push(backgroundFetch(weekStart, weekEnd))
    }
    
    for (let i = 1; i <= weeksAhead; i++) {
      const targetWeek = addWeeks(centerWeek, i)
      const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 })
      preloadPromises.push(backgroundFetch(weekStart, weekEnd))
    }
    
    for (let i = 0; i < preloadPromises.length; i++) {
      setTimeout(() => {
        preloadPromises[i]
      }, i * 100)
    }
  }, [backgroundFetch])

  useEffect(() => {
    let isCancelled = false
    
    const loadWeekData = async () => {
      const cachedData = getCachedData(weekStart, weekEnd)
      
      if (cachedData) {
        setEvents(cachedData.events)
        setCalendars(cachedData.calendars)
        setError(null)
        setLoading(false)
        hasLoadedRef.current = true
        
        setTimeout(() => {
          preloadMultipleWeeks(weekStart)
        }, 100)
        
        return
      }
      
      if (fetchingRef.current) {
        return
      }
      
      fetchingRef.current = true
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(
          `/api/calendar?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        )
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch calendar data`)
        }
        
        const data = await response.json()
        
        setEvents(data.events || [])
        setCalendars(data.calendars || [])
        
        setCachedData(weekStart, weekEnd, data.events || [], data.calendars || [])
        
        setEnabledCalendars(prevEnabled => {
          if (prevEnabled.size === 0) {
            return new Set((data.calendars || []).map((cal: CalendarInfo) => cal.id))
          }
          const availableCalendarIds = new Set(data.calendars?.map((cal: CalendarInfo) => cal.id) || [])
          return new Set([...prevEnabled].filter(id => availableCalendarIds.has(id)))
        })
        
        hasLoadedRef.current = true
        setLoading(false)
        fetchingRef.current = false
        
        if (!isCancelled) {
          setTimeout(() => {
            preloadMultipleWeeks(weekStart)
          }, 500)
        }
        
      } catch (err) {
        console.error('Calendar fetch error:', err)
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred')
          hasLoadedRef.current = true
          setLoading(false)
          fetchingRef.current = false
        }
      }
    }
    
    loadWeekData()
    
    return () => {
      isCancelled = true
    }
  }, [weekStart, weekEnd, getCachedData, setCachedData, preloadMultipleWeeks])

  useEffect(() => {
    const timer = setTimeout(() => {
      preloadMultipleWeeks(currentWeek, 12, 8)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [preloadMultipleWeeks, currentWeek])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const scrollToCurrentTime = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const calendarGrid = document.getElementById('calendar-grid')
      
      if (calendarGrid) {
        const targetHour = Math.max(0, currentHour - 2)
        const scrollTop = targetHour * 60
        calendarGrid.scrollTop = scrollTop
      }
    }

    const timer = setTimeout(scrollToCurrentTime, 500)
    return () => clearTimeout(timer)
  }, [calendars, events])

  const navigateWeek = useCallback((direction: "prev" | "next") => {
    const newWeek = direction === "next" ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1)
    
    setCurrentWeek(newWeek)
    
    setTimeout(() => {
      if (direction === "next") {
        for (let i = 6; i <= 10; i++) {
          const futureWeek = addWeeks(newWeek, i)
          const weekStart = startOfWeek(futureWeek, { weekStartsOn: 1 })
          const weekEnd = endOfWeek(futureWeek, { weekStartsOn: 1 })
          
          setTimeout(() => {
            backgroundFetch(weekStart, weekEnd)
          }, (i - 6) * 150)
        }
      } else {
        for (let i = 6; i <= 10; i++) {
          const pastWeek = subWeeks(newWeek, i)
          const weekStart = startOfWeek(pastWeek, { weekStartsOn: 1 })
          const weekEnd = endOfWeek(pastWeek, { weekStartsOn: 1 })
          
          setTimeout(() => {
            backgroundFetch(weekStart, weekEnd)
          }, (i - 6) * 150)
        }
      }
    }, 100)
  }, [currentWeek, backgroundFetch])

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
    if (!event.start.dateTime) return { top: 0, height: 60 }
    
    const start = new Date(event.start.dateTime)
    const end = event.end.dateTime ? new Date(event.end.dateTime) : start
    
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
    const duration = endMinutes - startMinutes
    
    return {
      top: (startMinutes / 60) * 60,
      height: Math.max((duration / 60) * 60, 30),
    }
  }

  const getCalendarColor = (calendarId: string) => {
    return getCalendarColorFromId(calendarId, calendars)
  }

  const getCurrentTimePosition = () => {
    const now = currentTime
    const minutes = now.getHours() * 60 + now.getMinutes()
    return (minutes / 60) * 60
  }

  const filteredEvents = events.filter(event => enabledCalendars.has(event.calendarId))
  const enabledCalendarsList = calendars.filter(cal => enabledCalendars.has(cal.id))

  if (loading && !hasLoadedRef.current) {
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

  if (hasLoadedRef.current && calendars.length === 0) {
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
      <Card className="overflow-hidden pt-0">
        <CardContent className="p-0">
          {/* Day headers */}
          <div
            className="grid border-b"
            style={{ gridTemplateColumns: `50px repeat(5, 1fr)`, width: `calc(100% - ${scrollbarWidth}px)`}}
          >
            {/* Time column header */}
            <div className="p-2 border-r flex items-center justify-center">
              <div className="text-xs font-medium text-muted-foreground">Time</div>
            </div>
            
            {/* Day headers (5 cells) */}
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

          {/* All-day row */}
          <div
            className="grid border-b bg-muted/10"
            style={{ gridTemplateColumns: `50px repeat(5, 1fr)`, width: `calc(100% - ${scrollbarWidth}px)` }}
          >
            {/* All-day label */}
            <div className="p-1 border-r flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground font-medium">All day</span>
            </div>
            
            {/* All-day events (5 cells) */}
            {workDays.map((day) => {
              const allDayEvents = getAllDayEventsForDay(day)
              return (
                <div 
                  key={`allday-${day.toISOString()}`}
                  className={cn(
                    "border-r last:border-r-0 p-1 min-h-[60px] space-y-1 overflow-hidden",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  {allDayEvents.map((event) => {
                    const calendarColor = getCalendarColor(event.calendarId)
                    return (
                      <div
                        key={`allday-${event.calendarId}-${event.id}-${event.start.date || event.start.dateTime || ''}`}
                        className="text-xs p-1 rounded border-l-4 bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer truncate whitespace-nowrap overflow-hidden text-ellipsis"
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
                  <div key={hour} className="grid border-b last:border-b-0 relative" style={{ gridTemplateColumns: '50px repeat(5, 1fr)', height: '60px' }}>
                    {/* Time label */}
                    <div className="border-r relative z-40">
                      <span className="absolute -top-2 right-1 text-[10px] text-muted-foreground font-normal bg-background px-1">
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
                      key={`timed-${event.calendarId}-${event.id}-${event.start.dateTime || event.start.date || ''}`}
                      className="absolute z-10"
                      style={{
                        left: `calc(50px + ${dayIndex} * (100% - 50px) / 5)`,
                        width: `calc((100% - 50px) / 5)`,
                        top: `${position.top}px`, // Direct positioning within time grid
                        height: `${position.height}px`,
                      }}
                    >
                    <div
                      className="h-full rounded-md border-l-4 bg-background shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer p-1.5 overflow-hidden hover:scale-[1.02] hover:z-20 relative mx-0.5"
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

              {/* Current time indicator - only show on today */}
              {(() => {
                const todayIndex = workDays.findIndex(day => isToday(day))
                if (todayIndex === -1) return null
                
                const currentTimeTop = getCurrentTimePosition()
                
                return (
                  <div
                    key="current-time-indicator"
                    className="absolute z-30 pointer-events-none flex items-center"
                    style={{
                      left: '50px',
                      right: '0',
                      top: `${currentTimeTop}px`,
                    }}
                  >
                    {/* Spacer divs for days before today */}
                    <div style={{ width: `${todayIndex * 20}%` }} />
                    
                    {/* Today's indicator */}
                    <div className="relative flex items-center" style={{ width: '20%' }}>
                      {/* Red circle indicator at the left edge */}
                      <div className="absolute -left-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background shadow-sm" style={{ top: '-6px' }} />
                      
                      {/* Red line */}
                      <div className="h-0.5 bg-red-500 shadow-sm w-full" />
                    </div>
                  </div>
                )
              })()}
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
                    <div key={`today-${event.calendarId}-${event.id}-${event.start.dateTime || event.start.date || ''}`} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
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
