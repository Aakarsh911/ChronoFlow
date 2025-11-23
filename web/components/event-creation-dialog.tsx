"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { Loader2, Calendar, Clock, MapPin, Users, FileText, Zap } from "lucide-react"

interface EventCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  startTime: Date
  endTime: Date
  dayDate: Date
  onEventCreated?: () => void
}

export function EventCreationDialog({
  open,
  onOpenChange,
  startTime,
  endTime,
  dayDate,
  onEventCreated,
}: EventCreationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [eventType, setEventType] = useState<"TASK" | "FOCUS_TIME" | "PERSONAL" | "MEETING">("TASK")
  const [isManaged, setIsManaged] = useState(true)
  const [isAllDay, setIsAllDay] = useState(false)
  
  // Time state
  const [startTimeValue, setStartTimeValue] = useState(format(startTime, "HH:mm"))
  const [endTimeValue, setEndTimeValue] = useState(format(endTime, "HH:mm"))

  // Update times when props change and reset form when dialog opens
  useEffect(() => {
    if (open) {
      const formattedStart = format(startTime, "HH:mm")
      const formattedEnd = format(endTime, "HH:mm")
      console.log('📅 Dialog opened with times:', { 
        startTime: startTime.toISOString(), 
        endTime: endTime.toISOString(),
        formattedStart,
        formattedEnd 
      })
      setStartTimeValue(formattedStart)
      setEndTimeValue(formattedEnd)
      // Reset form
      setTitle("")
      setDescription("")
      setLocation("")
      setEventType("TASK")
      setIsManaged(true)
      setIsAllDay(false)
      setError(null)
    }
  }, [open, startTime, endTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Parse times and combine with date
      const [startHour, startMinute] = startTimeValue.split(':').map(Number)
      const [endHour, endMinute] = endTimeValue.split(':').map(Number)
      
      const eventStart = new Date(dayDate)
      eventStart.setHours(startHour, startMinute, 0, 0)
      
      const eventEnd = new Date(dayDate)
      eventEnd.setHours(endHour, endMinute, 0, 0)

      // Create event
      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          location,
          startTime: eventStart.toISOString(),
          endTime: eventEnd.toISOString(),
          isAllDay,
          eventType,
          isManaged,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create event')
      }

      // Close dialog and refresh calendar (form will be reset when dialog reopens)
      onOpenChange(false)
      onEventCreated?.()
    } catch (err) {
      console.error('Error creating event:', err)
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create Event
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
              autoFocus
            />
          </div>

          {/* Date and Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Date & Time
            </Label>
            <div className="text-sm text-muted-foreground mb-2">
              {format(dayDate, "EEEE, MMMM d, yyyy")}
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={startTimeValue}
                onChange={(e) => setStartTimeValue(e.target.value)}
                disabled={isAllDay}
                className="flex-1"
              />
              <span>to</span>
              <Input
                type="time"
                value={endTimeValue}
                onChange={(e) => setEndTimeValue(e.target.value)}
                disabled={isAllDay}
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="all-day"
                checked={isAllDay}
                onCheckedChange={setIsAllDay}
              />
              <Label htmlFor="all-day" className="cursor-pointer">All day</Label>
            </div>
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select value={eventType} onValueChange={(value: any) => setEventType(value)}>
              <SelectTrigger id="event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TASK">📋 Task</SelectItem>
                <SelectItem value="FOCUS_TIME">🎯 Focus Time</SelectItem>
                <SelectItem value="PERSONAL">🌟 Personal</SelectItem>
                <SelectItem value="MEETING">👥 Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Manageable Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <div>
                <Label htmlFor="managed" className="cursor-pointer font-medium">
                  Manageable Event
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow ChronoFlow to reschedule this event
                </p>
              </div>
            </div>
            <Switch
              id="managed"
              checked={isManaged}
              onCheckedChange={setIsManaged}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

