"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  RefreshCw,
  Filter,
  ExternalLink,
  Loader2,
  Zap,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday, addDays } from "date-fns"
import { CalendarLoadingSkeleton } from "./calendar-loading-skeleton"
import { getCalendarColorFromId, getContrastTextColor } from "@/lib/calendar-colors"

interface CalendarEvent {
  id: string
  title: string
  summary?: string
  description?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  location?: string
  attendees?: any
  calendarId?: string
  calendarName?: string
  calendarColor?: string
  htmlLink?: string
  source: string
  sourceIcon: string
  eventType: string
  isManaged: boolean
  modifiedLocally?: boolean
  syncStatus?: string
}

interface CalendarStats {
  google: {
    events: number
    connected: boolean
    lastSynced?: string
    syncError?: string
  }
  microsoft: {
    events: number
    connected: boolean
    lastSynced?: string
    syncError?: string
  }
  total: number
  managed: number
  unmanaged: number
}

const workHoursStart = 0
const workHoursEnd = 24

interface CalendarInfo {
  id: string
  name: string
  source: string
  primary?: boolean
  backgroundColor?: string
}

export function WeeklyCalendarView() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]) // Store all fetched events
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [enabledCalendars, setEnabledCalendars] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<CalendarStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showManaged, setShowManaged] = useState(true)
  const [showUnmanaged, setShowUnmanaged] = useState(true)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const hasLoadedRef = useRef(false)
  const fetchingRangesRef = useRef<Set<string>>(new Set())

  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek])
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek])
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])
  const workDays = useMemo(() => weekDays.slice(0, 5), [weekDays])
  
  // Filter events for current week from all events
  const events = useMemo(() => {
    return allEvents.filter(event => {
      // Filter by calendar if calendars are loaded
      if (enabledCalendars.size > 0 && event.calendarId && !enabledCalendars.has(event.calendarId)) {
        return false
      }
      
      const eventStart = event.start.dateTime 
        ? new Date(event.start.dateTime)
        : event.start.date 
        ? new Date(event.start.date + 'T00:00:00') 
        : null
      
      if (!eventStart) return false
      
      return eventStart >= weekStart && eventStart <= weekEnd
    })
  }, [allEvents, weekStart, weekEnd, enabledCalendars])

  // Detect scrollbar width
  useEffect(() => {
    const el = document.getElementById('calendar-grid')
    if (!el) return

    const update = () => {
      const hasVScroll = el.scrollHeight > el.clientHeight
      const sbw = hasVScroll ? (el.offsetWidth - el.clientWidth) : 0
      setScrollbarWidth(sbw > 0 ? sbw : 0)
    }

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
  }, [events])

  // Fetch calendar events from database
  const fetchCalendarEvents = useCallback(async (forceSync = false, autoSync = false) => {
    try {
      if (forceSync) {
        setSyncing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Fetch 3 months of events (6 weeks before and 6 weeks after current week)
      const rangeStart = startOfWeek(subWeeks(currentWeek, 6), { weekStartsOn: 1 })
      const rangeEnd = endOfWeek(addWeeks(currentWeek, 6), { weekStartsOn: 1 })

      // If force sync or auto sync, first sync from external calendars
      if (forceSync || autoSync) {
        console.log('🔄 Syncing from external calendars...')
        try {
          const syncResponse = await fetch(
            `/api/calendar/sync-from-external?` + new URLSearchParams({
              startDate: rangeStart.toISOString(),
              endDate: rangeEnd.toISOString(),
            }), 
            {
              method: 'POST',
            }
          )
          
          if (!syncResponse.ok) {
            console.error('Sync from external failed:', syncResponse.statusText)
          } else {
            const syncData = await syncResponse.json()
            console.log('✅ Sync complete:', syncData)
          }
        } catch (syncErr) {
          console.error('Sync error:', syncErr)
          // Continue even if sync fails
        }
      }

      // Fetch events from database with wider range
      const response = await fetch(
        `/api/calendar/events?` + new URLSearchParams({
          startDate: rangeStart.toISOString(),
          endDate: rangeEnd.toISOString(),
          includeManaged: String(showManaged),
          includeUnmanaged: String(showUnmanaged),
        }),
        { cache: 'no-store' }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch calendar events`)
      }

      const data = await response.json()
      console.log('📅 Fetched events for 3 month range:', data.events.length, 'events')

      setAllEvents(data.events || [])
      setCalendars(data.calendars || [])
      setStats(data.stats || null)
      hasLoadedRef.current = true

      // Initialize enabled calendars if not set
      if (enabledCalendars.size === 0 && data.calendars?.length > 0) {
        setEnabledCalendars(new Set(data.calendars.map((cal: CalendarInfo) => cal.id)))
      }

    } catch (err) {
      console.error('Calendar fetch error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [currentWeek, showManaged, showUnmanaged, enabledCalendars.size])

  // Sync and load events when week changes or on initial load
  useEffect(() => {
    const isInitialLoad = !hasLoadedRef.current
    // Sync on initial load and every week change for fresh data
    fetchCalendarEvents(false, isInitialLoad || true) // Always sync for now to ensure fresh data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]) // Only re-run when currentWeek changes, not when filters change
  
  // Re-fetch when filters change (without syncing, just fetch from DB)
  useEffect(() => {
    if (hasLoadedRef.current) {
      fetchCalendarEvents(false, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showManaged, showUnmanaged])

  // Manual refresh with external sync
  const handleRefresh = useCallback(async () => {
    await fetchCalendarEvents(true)
  }, [fetchCalendarEvents])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Scroll to current time on mount
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
  }, [events])

  // Background fetch for additional weeks - syncs from external then fetches from DB
  const backgroundFetch = useCallback(async (rangeStart: Date, rangeEnd: Date, shouldSync = true) => {
    const key = `${rangeStart.toISOString()}_${rangeEnd.toISOString()}`
    
    // Skip if already fetching this range
    if (fetchingRangesRef.current.has(key)) {
      return
    }
    
    fetchingRangesRef.current.add(key)
    
    try {
      // First sync from external calendars for this range
      if (shouldSync) {
        console.log(`🔄 Syncing range: ${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'MMM d')}`)
        try {
          const syncResponse = await fetch(
            `/api/calendar/sync-from-external?` + new URLSearchParams({
              startDate: rangeStart.toISOString(),
              endDate: rangeEnd.toISOString(),
            }), 
            {
              method: 'POST',
            }
          )
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json()
            console.log(`✅ Synced ${syncData.synced} events for range`)
          }
        } catch (syncErr) {
          console.error('Sync error:', syncErr)
          // Continue to fetch from DB even if sync fails
        }
      }
      
      // Then fetch from database
      const response = await fetch(
        `/api/calendar/events?` + new URLSearchParams({
          startDate: rangeStart.toISOString(),
          endDate: rangeEnd.toISOString(),
          includeManaged: String(showManaged),
          includeUnmanaged: String(showUnmanaged),
        }),
        { cache: 'no-store' }
      )
      
      if (response.ok) {
        const data = await response.json()
        // Merge with existing events, avoiding duplicates
        setAllEvents(prevEvents => {
          const existingIds = new Set(prevEvents.map(e => e.id))
          const newEvents = (data.events || []).filter((e: any) => !existingIds.has(e.id))
          return [...prevEvents, ...newEvents]
        })
        console.log(`📅 Background fetched: ${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'MMM d')} (${data.events?.length || 0} events)`)
      }
    } catch (err) {
      console.error('Background fetch error:', err)
    } finally {
      fetchingRangesRef.current.delete(key)
    }
  }, [showManaged, showUnmanaged])

  // Navigate weeks instantly - events are pre-loaded for 3 month range
  // Also trigger background fetch for additional weeks
  const navigateWeek = useCallback((direction: "prev" | "next") => {
    const newWeek = direction === "next" ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1)
    setCurrentWeek(newWeek)
    
    // Immediately trigger sync for additional weeks when navigating
    // This ensures we always have fresh data as user navigates
    setTimeout(() => {
      if (direction === "next") {
        // Sync and fetch 4 weeks ahead (weeks 7-10 from new position)
        const futureStart = startOfWeek(addWeeks(newWeek, 7), { weekStartsOn: 1 })
        const futureEnd = endOfWeek(addWeeks(newWeek, 10), { weekStartsOn: 1 })
        backgroundFetch(futureStart, futureEnd, true)
      } else {
        // Sync and fetch 4 weeks behind (weeks 7-10 before new position)
        const pastStart = startOfWeek(subWeeks(newWeek, 10), { weekStartsOn: 1 })
        const pastEnd = endOfWeek(subWeeks(newWeek, 7), { weekStartsOn: 1 })
        backgroundFetch(pastStart, pastEnd, true)
      }
    }, 100)
  }, [currentWeek, backgroundFetch])

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
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
      if (event.start.date && !event.start.dateTime) {
        const eventDate = new Date(event.start.date + 'T00:00:00')
        return isSameDay(eventDate, day)
      }
      return false
    })
  }

  const getTimedEventsForDay = (day: Date) => {
    return events.filter(event => {
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

  const getEventColor = (event: CalendarEvent) => {
    if (event.calendarColor) return event.calendarColor
    
    // Color based on event type
    const colorMap: Record<string, string> = {
      MEETING: '#ef4444',
      TASK: '#3b82f6',
      FOCUS_TIME: '#8b5cf6',
      PERSONAL: '#10b981',
    }
    
    return colorMap[event.eventType] || '#6b7280'
  }

  const getCurrentTimePosition = () => {
    const now = currentTime
    const minutes = now.getHours() * 60 + now.getMinutes()
    return (minutes / 60) * 60
  }

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
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Always show the calendar grid, even if there are no events

  return (
    <div className="space-y-6">
      {/* Header with Navigation and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {events.length} events • {stats?.managed || 0} manageable • {stats?.unmanaged || 0} fixed
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Event Type Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-3">Event Types</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-managed" className="text-sm cursor-pointer">
                        <span className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-500" />
                          Manageable Events
                        </span>
                      </Label>
                      <Switch
                        id="show-managed"
                        checked={showManaged}
                        onCheckedChange={setShowManaged}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-unmanaged" className="text-sm cursor-pointer">
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-red-500" />
                          Fixed Events
                        </span>
                      </Label>
                      <Switch
                        id="show-unmanaged"
                        checked={showUnmanaged}
                        onCheckedChange={setShowUnmanaged}
                      />
                    </div>
                  </div>
                </div>

                {/* Calendars List */}
                {calendars.length > 0 && (
                  <div className="pt-3 border-t">
                    <h4 className="font-semibold text-sm mb-3">Calendars</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {calendars.map((calendar) => (
                        <div key={calendar.id} className="flex items-center justify-between">
                          <Label 
                            htmlFor={`cal-${calendar.id}`} 
                            className="text-sm cursor-pointer flex items-center gap-2 flex-1 min-w-0"
                          >
                            <div 
                              className="w-3 h-3 rounded-sm flex-shrink-0" 
                              style={{ backgroundColor: calendar.backgroundColor || '#6b7280' }}
                            />
                            <span className="truncate">{calendar.name}</span>
                          </Label>
                          <Switch
                            id={`cal-${calendar.id}`}
                            checked={enabledCalendars.has(calendar.id)}
                            onCheckedChange={() => {
                              setEnabledCalendars(prev => {
                                const newSet = new Set(prev)
                                if (newSet.has(calendar.id)) {
                                  newSet.delete(calendar.id)
                                } else {
                                  newSet.add(calendar.id)
                                }
                                return newSet
                              })
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Google:</span>
                        <span>{stats.google.events} events</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Microsoft:</span>
                        <span>{stats.microsoft.events} events</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Refresh/Sync Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={syncing}
            className="gap-2"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sync
              </>
            )}
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

      {/* Sync Status Alert */}
      {stats && (stats.google.syncError || stats.microsoft.syncError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sync errors detected. {stats.google.syncError || stats.microsoft.syncError}
            <Button variant="link" size="sm" onClick={handleRefresh} className="ml-2 h-auto p-0">
              Retry sync
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Weekly Calendar Grid */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Day headers */}
          <div
            className="grid border-b"
            style={{ gridTemplateColumns: `50px repeat(5, 1fr)`, width: `calc(100% - ${scrollbarWidth}px)`}}
          >
            <div className="p-2 border-r flex items-center justify-center">
              <div className="text-xs font-medium text-muted-foreground">Time</div>
            </div>
            
            {workDays.map((day) => (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "p-4 text-center border-r last:border-r-0",
                  isToday(day) && "bg-primary/5"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-lg font-semibold mt-1",
                  isToday(day) && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* All-day events row */}
          <div
            className="grid border-b bg-muted/10"
            style={{ gridTemplateColumns: `50px repeat(5, 1fr)`, width: `calc(100% - ${scrollbarWidth}px)` }}
          >
            <div className="p-1 border-r flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground font-medium">All day</span>
            </div>
            
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
                    const eventColor = getEventColor(event)
                    return (
                      <div
                        key={`allday-${event.id}`}
                        className="text-xs p-1 rounded border-l-4 bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer truncate"
                        style={{ borderLeftColor: eventColor }}
                        title={event.title || event.summary}
                      >
                        {event.isManaged && <Zap className="w-3 h-3 inline mr-1 text-blue-500" />}
                        {event.title || event.summary}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Time slots and events */}
          <div className="relative">
            <div className="relative h-96 overflow-y-auto scroll-smooth" id="calendar-grid">
              {/* Time grid */}
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="grid border-b last:border-b-0 relative" style={{ gridTemplateColumns: '50px repeat(5, 1fr)', height: '60px' }}>
                  <div className="border-r relative z-40">
                    <span className="absolute -top-2 right-1 text-[10px] text-muted-foreground bg-background px-1">
                      {i.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                  
                  {workDays.map((day) => (
                    <div 
                      key={`${day.toISOString()}-${i}`}
                      className={cn(
                        "border-r last:border-r-0 relative",
                        isToday(day) && "bg-primary/5"
                      )}
                    />
                  ))}
                </div>
              ))}

              {/* Events overlay */}
              {workDays.map((day, dayIndex) => {
                const dayEvents = getTimedEventsForDay(day)
                
                return dayEvents.map((event) => {
                  const position = getEventPosition(event)
                  const timeInfo = getEventTime(event)
                  const eventColor = getEventColor(event)
                  
                  return (
                    <div
                      key={`timed-${event.id}`}
                      className="absolute z-10"
                      style={{
                        left: `calc(50px + ${dayIndex} * (100% - 50px) / 5)`,
                        width: `calc((100% - 50px) / 5)`,
                        top: `${position.top}px`,
                        height: `${position.height}px`,
                      }}
                    >
                      <div
                        className="h-full rounded-md border-l-4 bg-background shadow-sm hover:shadow-md transition-all cursor-pointer p-1.5 overflow-hidden hover:scale-[1.02] hover:z-20 relative mx-0.5"
                        style={{ borderLeftColor: eventColor }}
                      >
                        <div className="text-xs font-medium line-clamp-2 mb-1 flex items-center gap-1">
                          {event.isManaged && <Zap className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                          {event.modifiedLocally && <Badge variant="outline" className="text-[8px] px-1 py-0">Modified</Badge>}
                          <span className="truncate">{event.title || event.summary}</span>
                        </div>
                        
                        {!timeInfo.isAllDay && (
                          <div className="text-[10px] text-muted-foreground mb-1">
                            {timeInfo.start} - {timeInfo.end}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>{event.sourceIcon}</span>
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">
                            {event.eventType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })
              })}

              {/* Current time indicator */}
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
                    <div style={{ width: `${todayIndex * 20}%` }} />
                    <div className="relative flex items-center" style={{ width: '20%' }}>
                      <div className="absolute -left-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-background shadow-sm" style={{ top: '-6px' }} />
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
                  const eventColor = getEventColor(event)
                  
                  return (
                    <div key={`today-${event.id}`} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                      <div 
                        className="w-1 h-12 rounded-full flex-shrink-0"
                        style={{ backgroundColor: eventColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate flex items-center gap-1">
                            {event.isManaged && <Zap className="w-3 h-3 text-blue-500" />}
                            {event.title || event.summary}
                          </h4>
                          {!timeInfo.isAllDay && (
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {timeInfo.start} - {timeInfo.end}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{event.sourceIcon} {event.source}</span>
                          <Badge variant="outline" className="text-xs">
                            {event.eventType}
                          </Badge>
                          {event.modifiedLocally && (
                            <Badge variant="secondary" className="text-xs">Modified</Badge>
                          )}
                        </div>
                      </div>
                      
                      {event.htmlLink && (
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
                      )}
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
