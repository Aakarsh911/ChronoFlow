"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
} from "lucide-react"
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfWeek,
  subWeeks,
} from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { getCalendarColorFromId } from "@/lib/calendar-colors"
import {
  SANDBOX_CALENDARS,
  type SandboxCalendarEvent,
} from "@/lib/sandbox-data"
import { useSandbox } from "@/components/sandbox/sandbox-context"
import { cn } from "@/lib/utils"

const DAY_COUNT = 7
const GRID_ID = "sandbox-calendar-grid"

export function SandboxCalendarView() {
  const sandbox = useSandbox()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [enabledCalendars, setEnabledCalendars] = useState(
    () => new Set(SANDBOX_CALENDARS.map((c) => c.id)),
  )
  const [scrollbarWidth, setScrollbarWidth] = useState(0)

  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek])
  const weekEnd = useMemo(() => endOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek])
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  )
  const events = useMemo(
    () => sandbox?.getCalendarEventsForWeek(currentWeek) ?? [],
    [sandbox, currentWeek],
  )
  const filteredEvents = events.filter((e) => enabledCalendars.has(e.calendarId))

  useEffect(() => {
    const el = document.getElementById(GRID_ID)
    if (!el) return

    const update = () => {
      const hasVScroll = el.scrollHeight > el.clientHeight
      const sbw = hasVScroll ? el.offsetWidth - el.clientWidth : 0
      setScrollbarWidth(sbw > 0 ? sbw : 0)
    }

    update()
    requestAnimationFrame(update)

    const ro = new ResizeObserver(update)
    ro.observe(el)

    const mo = new MutationObserver(update)
    mo.observe(el, { childList: true, subtree: true })

    window.addEventListener("resize", update)

    return () => {
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [events, enabledCalendars])

  if (!sandbox) return null

  const getEventsForDay = (day: Date) =>
    filteredEvents.filter((event) => {
      const eventDate = event.start.dateTime
        ? new Date(event.start.dateTime)
        : event.start.date
          ? new Date(`${event.start.date}T00:00:00`)
          : null
      return eventDate && isSameDay(eventDate, day)
    })

  const getAllDayEventsForDay = (day: Date) =>
    filteredEvents.filter((event) => {
      if (event.start.date && !event.start.dateTime) {
        return isSameDay(new Date(`${event.start.date}T00:00:00`), day)
      }
      return false
    })

  const getTimedEventsForDay = (day: Date) =>
    filteredEvents.filter(
      (event) => event.start.dateTime && isSameDay(new Date(event.start.dateTime), day),
    )

  const getEventTime = (event: SandboxCalendarEvent) => {
    if (event.start.dateTime && event.end.dateTime) {
      return {
        start: format(new Date(event.start.dateTime), "HH:mm"),
        end: format(new Date(event.end.dateTime), "HH:mm"),
        isAllDay: false,
      }
    }
    return { start: "", end: "", isAllDay: true }
  }

  const getEventPosition = (event: SandboxCalendarEvent) => {
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

  const getCalendarColor = (calendarId: string) =>
    getCalendarColorFromId(calendarId, SANDBOX_CALENDARS)

  const toggleCalendar = (calendarId: string) => {
    setEnabledCalendars((prev) => {
      const next = new Set(prev)
      if (next.has(calendarId)) next.delete(calendarId)
      else next.add(calendarId)
      return next
    })
  }

  const now = new Date()
  const currentTimeTop = (now.getHours() * 60 + now.getMinutes()) / 60 * 60
  const todayIndex = weekDays.findIndex((day) => isToday(day))
  const gridCols = `50px repeat(${DAY_COUNT}, 1fr)`
  const gridWidth = `calc(100% - ${scrollbarWidth}px)`

  return (
    <div className="cf-page-shell">
      <div className="cf-page-inner space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {filteredEvents.length} sample events · mirrors the real calendar view
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Calendars ({enabledCalendars.size})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="border-b p-4">
                  <h4 className="text-sm font-semibold">Calendar sources</h4>
                </div>
                <ScrollArea className="max-h-48">
                  <div className="space-y-3 p-4">
                    {SANDBOX_CALENDARS.map((calendar) => (
                      <div key={calendar.id} className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: calendar.backgroundColor }}
                        />
                        <Label htmlFor={`sb-cal-${calendar.id}`} className="flex-1 cursor-pointer text-sm">
                          {calendar.summary}
                        </Label>
                        <Switch
                          id={`sb-cal-${calendar.id}`}
                          checked={enabledCalendars.has(calendar.id)}
                          onCheckedChange={() => toggleCalendar(calendar.id)}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())} className="px-4">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden pt-0">
          <CardContent className="p-0">
            <div
              className="grid border-b"
              style={{ gridTemplateColumns: gridCols, width: gridWidth }}
            >
              <div className="flex items-center justify-center border-r p-2">
                <span className="text-xs font-medium text-muted-foreground">Time</span>
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r p-4 text-center last:border-r-0 transition-colors duration-200",
                    isToday(day) && "bg-primary/5",
                  )}
                >
                  <div className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</div>
                  <div className={cn("mt-1 text-lg font-semibold", isToday(day) && "text-primary")}>
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="grid border-b bg-muted/10"
              style={{ gridTemplateColumns: gridCols, width: gridWidth }}
            >
              <div className="flex items-center justify-center border-r p-1">
                <span className="text-[10px] font-medium text-muted-foreground">All day</span>
              </div>
              {weekDays.map((day) => (
                <div
                  key={`allday-${day.toISOString()}`}
                  className={cn(
                    "min-h-[60px] space-y-1 overflow-hidden border-r p-1 last:border-r-0",
                    isToday(day) && "bg-primary/5",
                  )}
                >
                  {getAllDayEventsForDay(day).map((event) => (
                    <div
                      key={event.id}
                      className="truncate rounded border-l-4 bg-background p-1 text-xs shadow-sm"
                      style={{ borderLeftColor: getCalendarColor(event.calendarId) }}
                    >
                      {event.summary}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="relative">
              <div className="relative h-96 overflow-y-auto scroll-smooth" id={GRID_ID}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    className="relative grid border-b last:border-b-0"
                    style={{ gridTemplateColumns: gridCols, height: "60px" }}
                  >
                    <div className="relative z-40 border-r">
                      <span className="absolute -top-2 right-1 bg-background px-1 text-[10px] text-muted-foreground">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    </div>
                    {weekDays.map((day) => (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={cn(
                          "relative border-r last:border-r-0",
                          isToday(day) && "bg-primary/5",
                        )}
                      />
                    ))}
                  </div>
                ))}

                {weekDays.map((day, dayIndex) =>
                  getTimedEventsForDay(day).map((event) => {
                    const position = getEventPosition(event)
                    const timeInfo = getEventTime(event)
                    const calendarColor = getCalendarColor(event.calendarId)
                    return (
                      <div
                        key={event.id}
                        className="absolute z-10"
                        style={{
                          left: `calc(50px + ${dayIndex} * (100% - 50px) / ${DAY_COUNT})`,
                          width: `calc((100% - 50px) / ${DAY_COUNT})`,
                          top: `${position.top}px`,
                          height: `${position.height}px`,
                        }}
                      >
                        <div
                          className="mx-0.5 h-full cursor-default overflow-hidden rounded-md border-l-4 bg-background p-1.5 shadow-sm"
                          style={{ borderLeftColor: calendarColor }}
                        >
                          <div className="line-clamp-2 text-xs font-medium">{event.summary}</div>
                          {!timeInfo.isAllDay && (
                            <div className="text-xs text-muted-foreground">
                              {timeInfo.start} – {timeInfo.end}
                            </div>
                          )}
                          {event.location && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }),
                )}

                {todayIndex !== -1 && (
                  <div
                    className="pointer-events-none absolute z-30 flex items-center"
                    style={{ left: "50px", right: 0, top: `${currentTimeTop}px` }}
                  >
                    <div style={{ width: `${todayIndex * (100 / DAY_COUNT)}%` }} />
                    <div className="relative flex items-center" style={{ width: `${100 / DAY_COUNT}%` }}>
                      <div
                        className="absolute -left-1.5 h-3 w-3 rounded-full border-2 border-background bg-red-500 shadow-sm"
                        style={{ top: "-6px" }}
                      />
                      <div className="h-0.5 w-full bg-red-500 shadow-sm" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getEventsForDay(new Date()).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No events today in the demo week.</p>
            ) : (
              <div className="space-y-3">
                {getEventsForDay(new Date()).map((event) => {
                  const timeInfo = getEventTime(event)
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                    >
                      <div
                        className="h-12 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: getCalendarColor(event.calendarId) }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="truncate text-sm font-medium">{event.summary}</h4>
                          {!timeInfo.isAllDay && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {timeInfo.start} – {timeInfo.end}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{event.calendarName}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
