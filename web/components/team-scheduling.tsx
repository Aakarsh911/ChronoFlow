"use client"

import { useEffect, useState } from "react"
import { Users, RefreshCw, Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Video, MapPinned, Bell, Repeat } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// No dummy data — we render real Microsoft Teams members only

type TeamsMember = {
  id: string
  displayName: string
  email?: string
  jobTitle?: string
  teamIds: string[]
}

type Availability = {
  status: 'available' | 'busy'
  nextAvailable: string
  currentEventEnd?: string
  busyUntil?: string | null
  nextBusyAt?: string | null
}

type CalendarEvent = {
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  isAllDay: boolean
  showAs: string
}

type MemberCalendar = {
  memberId: string
  userName?: string
  userEmail?: string
  timezone?: string
  error?: string
  availability?: Availability
  eventsCount?: number
  events?: CalendarEvent[]
}

export function TeamScheduling() {
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [msTeamsMembers, setMsTeamsMembers] = useState<TeamsMember[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [memberCalendars, setMemberCalendars] = useState<MemberCalendar[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0) // 0 = current week, 1 = next week, etc.
  const [userTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone)
  
  // Meeting creation dialog state
  const [showMeetingDialog, setShowMeetingDialog] = useState(false)
  const [creatingMeeting, setCreatingMeeting] = useState(false)
  const [meetingForm, setMeetingForm] = useState({
    subject: '',
    body: '',
    startTime: '',
    endTime: '',
    location: '',
    isOnlineMeeting: true,
    meetingType: 'online' as 'online' | 'in-person' | 'hybrid',
    allowNewTimeProposals: true,
    isAllDay: false,
    showAs: 'busy' as 'free' | 'tentative' | 'busy' | 'oof',
    importance: 'normal' as 'low' | 'normal' | 'high',
    sensitivity: 'normal' as 'normal' | 'personal' | 'private' | 'confidential',
    reminderMinutesBeforeStart: 15,
    isReminderOn: true,
  })

  // Fetch team members
  useEffect(() => {
    let mounted = true
    setLoadingTeams(true)
    fetch('/api/integrations/teams/members')
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((data) => {
        if (!mounted) return
        const members = data?.members || []
        setMsTeamsMembers(members)
        setTeamsError(null)
      })
      .catch((err) => {
        if (!mounted) return
        const message = (() => {
          try {
            const j = JSON.parse(err.message)
            return j?.error || err.message
          } catch {
            return err.message
          }
        })()
        setTeamsError(message)
      })
      .finally(() => mounted && setLoadingTeams(false))
    return () => { mounted = false }
  }, [])

  // Get week dates based on offset
  const getWeekDates = () => {
    const dates: Date[] = []
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (currentWeekOffset * 7)) // Monday
    
    for (let i = 0; i < 5; i++) { // Mon-Fri
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  // Fetch calendars for specific week
  const fetchMemberCalendarsForWeek = async (weekOffset: number) => {
    if (msTeamsMembers.length === 0) return

    setLoadingCalendars(true)
    try {
      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7)) // Monday
      
      const weekDates: Date[] = []
      for (let i = 0; i < 5; i++) {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        weekDates.push(date)
      }

      const startDate = weekDates[0]
      const endDate = new Date(weekDates[4])
      endDate.setHours(23, 59, 59, 999)

      const params = new URLSearchParams()
      params.append('startDate', startDate.toISOString())
      params.append('endDate', endDate.toISOString())

      const response = await fetch(`/api/teams/members/calendars?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members: msTeamsMembers }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data = await response.json()
      setMemberCalendars(data.memberCalendars || [])
      console.log('Member Calendars for week:', data.memberCalendars)
    } catch (error: any) {
      console.error('Error fetching member calendars:', error)
    } finally {
      setLoadingCalendars(false)
    }
  }

  // Auto-fetch calendars when members are loaded
  useEffect(() => {
    if (msTeamsMembers.length > 0) {
      fetchMemberCalendarsForWeek(currentWeekOffset)
    }
  }, [msTeamsMembers.length])

  const fetchMemberCalendars = async () => {
    if (msTeamsMembers.length === 0) {
      alert('No team members found. Please wait for members to load.')
      return
    }
    await fetchMemberCalendarsForWeek(currentWeekOffset)
  }

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memberId)) {
        newSet.delete(memberId)
      } else {
        newSet.add(memberId)
      }
      return newSet
    })
  }

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekOffset(prev => direction === 'next' ? prev + 1 : prev - 1)
    // Refetch calendars for the new week
    if (msTeamsMembers.length > 0) {
      fetchMemberCalendarsForWeek(currentWeekOffset + (direction === 'next' ? 1 : -1))
    }
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Calculate availability for a specific time slot
  const getAvailabilityAtTime = (date: Date, hour: number): { available: number; total: number } => {
    const targetMembers = selectedMembers.size > 0 
      ? memberCalendars.filter(cal => selectedMembers.has(cal.memberId))
      : memberCalendars

    if (targetMembers.length === 0) {
      return { available: 0, total: 0 }
    }

    // Create time slot boundaries
    const slotStart = new Date(date)
    slotStart.setHours(hour, 0, 0, 0)
    const slotEnd = new Date(slotStart)
    slotEnd.setHours(hour + 1, 0, 0, 0)

    let availableCount = 0

    targetMembers.forEach(memberCal => {
      if (memberCal.error || !memberCal.events) {
        return // Skip members without calendar access
      }

      // Check if member is free during this hour
      const isBusy = memberCal.events.some(event => {
        const eventStart = new Date(event.start.dateTime + 'Z') // Ensure UTC
        const eventEnd = new Date(event.end.dateTime + 'Z')
        
        // Check if event overlaps with our time slot
        return (eventStart < slotEnd && eventEnd > slotStart) && 
               (event.showAs === 'busy' || event.showAs === 'oof' || event.showAs === 'tentative')
      })

      if (!isBusy) {
        availableCount++
      }
    })

    return { available: availableCount, total: targetMembers.length }
  }

  // Get color based on availability percentage
  const getAvailabilityColor = (available: number, total: number) => {
    if (total === 0) return 'bg-gray-200'
    const percentage = available / total
    if (percentage >= 0.8) return 'bg-green-500'
    if (percentage >= 0.5) return 'bg-yellow-500'
    if (percentage >= 0.2) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // Format timezone to show abbreviation (e.g., "PST" from "Pacific Standard Time")
  const formatTimezone = (timezone: string) => {
    if (!timezone) return ''
    // Try to extract abbreviation from timezone name
    const words = timezone.split(' ')
    if (words.length > 1) {
      return words.map(w => w[0]).join('')
    }
    return timezone
  }

  // Get week label
  const getWeekLabel = () => {
    if (currentWeekOffset === 0) return 'This Week'
    if (currentWeekOffset === 1) return 'Next Week'
    if (currentWeekOffset === -1) return 'Last Week'
    return `${Math.abs(currentWeekOffset)} weeks ${currentWeekOffset > 0 ? 'ahead' : 'ago'}`
  }

  // Handle time slot click to open meeting dialog
  const handleTimeSlotClick = (date: Date, hour: number) => {
    const startTime = new Date(date)
    startTime.setHours(hour, 0, 0, 0)
    
    const endTime = new Date(startTime)
    endTime.setHours(hour + 1, 0, 0, 0)

    // Format for datetime-local input (YYYY-MM-DDTHH:MM) without timezone conversion
    const formatDateTimeLocal = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    setMeetingForm({
      ...meetingForm,
      startTime: formatDateTimeLocal(startTime),
      endTime: formatDateTimeLocal(endTime),
    })
    setShowMeetingDialog(true)
  }

  // Create meeting via Microsoft Graph API
  const createMeeting = async () => {
    if (!meetingForm.subject.trim()) {
      alert('Please enter a meeting subject')
      return
    }

    if (selectedMembers.size === 0) {
      alert('Please select at least one team member to invite')
      return
    }

    setCreatingMeeting(true)
    try {
      // Get selected member details
      const attendees = msTeamsMembers
        .filter(m => selectedMembers.has(m.id))
        .map(m => ({
          emailAddress: {
            address: m.email,
            name: m.displayName
          },
          type: 'required'
        }))

      // Prepare meeting body
      const meetingData = {
        subject: meetingForm.subject,
        body: {
          contentType: 'HTML',
          content: meetingForm.body || ''
        },
        start: {
          dateTime: new Date(meetingForm.startTime).toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: new Date(meetingForm.endTime).toISOString(),
          timeZone: 'UTC'
        },
        location: meetingForm.meetingType !== 'online' ? {
          displayName: meetingForm.location || (meetingForm.meetingType === 'in-person' ? 'Office' : 'Hybrid Meeting')
        } : undefined,
        attendees: attendees,
        isOnlineMeeting: meetingForm.isOnlineMeeting,
        onlineMeetingProvider: meetingForm.isOnlineMeeting ? 'teamsForBusiness' : undefined,
        allowNewTimeProposals: meetingForm.allowNewTimeProposals,
        isAllDay: meetingForm.isAllDay,
        showAs: meetingForm.showAs,
        importance: meetingForm.importance,
        sensitivity: meetingForm.sensitivity,
        isReminderOn: meetingForm.isReminderOn,
        reminderMinutesBeforeStart: meetingForm.isReminderOn ? meetingForm.reminderMinutesBeforeStart : undefined,
      }

      const response = await fetch('/api/calendar/create-meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      const data = await response.json()
      console.log('Meeting created:', data)
      
      alert('Meeting created successfully and invitations sent!')
      setShowMeetingDialog(false)
      
      // Reset form
      setMeetingForm({
        subject: '',
        body: '',
        startTime: '',
        endTime: '',
        location: '',
        isOnlineMeeting: true,
        meetingType: 'online',
        allowNewTimeProposals: true,
        isAllDay: false,
        showAs: 'busy',
        importance: 'normal',
        sensitivity: 'normal',
        reminderMinutesBeforeStart: 15,
        isReminderOn: true,
      })
      
      // Refresh calendars to show new meeting
      await fetchMemberCalendarsForWeek(currentWeekOffset)
    } catch (error: any) {
      console.error('Error creating meeting:', error)
      alert('Failed to create meeting: ' + error.message)
    } finally {
      setCreatingMeeting(false)
    }
  }

  // Time slots for the day (9 AM to 5 PM in user's timezone)
  const timeSlots = [9, 10, 11, 12, 13, 14, 15, 16, 17]

  return (
    <div className="space-y-6">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Team Members (Narrower) */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5" />
                    Team Members
                  </CardTitle>
                  <CardDescription className="mt-1">Click to select for meeting</CardDescription>
                </div>
                {selectedMembers.size > 0 && (
                  <Badge variant="default" className="bg-blue-600">
                    {selectedMembers.size} selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingTeams && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Loading team members...
                </div>
              )}
              {teamsError && (
                <div className="text-xs text-red-600 border border-red-200 rounded p-3 bg-red-50">
                  {teamsError}
                </div>
              )}
              {!teamsError && !loadingTeams && msTeamsMembers.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No members found or Microsoft not connected.
                </div>
              )}
              
              {/* Action Buttons */}
              {!teamsError && msTeamsMembers.length > 0 && (
                <div className="space-y-3 pb-3 border-b">
                  {/* Timezone Display */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gray-50 rounded p-2">
                    <MapPin className="w-3 h-3" />
                    <span className="font-medium">{userTimezone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={fetchMemberCalendars} 
                      disabled={loadingCalendars}
                      size="sm"
                      className="flex-1 gap-1"
                      variant="outline"
                    >
                      <RefreshCw className={cn("w-4 h-4", loadingCalendars && "animate-spin")} />
                      {loadingCalendars ? 'Refreshing...' : 'Refresh Calendars'}
                    </Button>
                    {selectedMembers.size > 0 && (
                      <Button 
                        onClick={() => setSelectedMembers(new Set())} 
                        size="sm"
                        variant="ghost"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Member List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {msTeamsMembers.map((m) => {
                  const isSelected = selectedMembers.has(m.id)
                  const memberCal = memberCalendars.find(cal => cal.memberId === m.id)
                  const isAvailable = memberCal?.availability?.status === 'available'
                  const isBusy = memberCal?.availability?.status === 'busy'
                  const hasAvailabilityData = memberCal?.availability
                  
                  return (
                    <div 
                      key={m.id} 
                      onClick={() => toggleMemberSelection(m.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        isSelected && "border-blue-500 bg-blue-50 shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                        isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className={cn(isSelected && "bg-blue-100 text-blue-700")}>
                          {(m.displayName || '?')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h4 className="font-medium text-sm truncate">{m.displayName}</h4>
                          {hasAvailabilityData && (
                            <>
                              {isAvailable && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Available
                                </Badge>
                              )}
                              {isBusy && (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                  Busy
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{m.jobTitle || 'Member'}</p>
                        
                        {/* Timezone Display */}
                        {memberCal?.timezone && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 font-medium" title={memberCal.timezone}>
                              {formatTimezone(memberCal.timezone)}
                            </span>
                          </div>
                        )}
                        
                        {/* Loading state */}
                        {!memberCal && loadingCalendars && (
                          <p className="text-xs text-blue-500 mt-1 animate-pulse">Loading availability...</p>
                        )}

                        {/* Availability Information */}
                        {hasAvailabilityData && memberCal.availability && (
                          <div className="mt-1.5 space-y-0.5">
                            {isBusy && memberCal.availability.nextAvailable && memberCal.availability.nextAvailable !== 'now' && (
                              <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Next available: {new Date(memberCal.availability.nextAvailable).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            )}
                            {isAvailable && memberCal.availability.nextBusyAt && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Next meeting: {new Date(memberCal.availability.nextBusyAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Error state */}
                        {memberCal?.error && (
                          <p className="text-xs text-red-500 mt-1">Not connected</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Team Availability Heat Map */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Team Availability
                  </CardTitle>
                  <CardDescription>
                    {selectedMembers.size > 0
                      ? `Showing availability for ${selectedMembers.size} selected member${selectedMembers.size > 1 ? 's' : ''}`
                      : `Showing availability for all ${memberCalendars.length} team member${memberCalendars.length > 1 ? 's' : ''}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateWeek('prev')}
                    disabled={loadingCalendars}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium px-3 min-w-[120px] text-center">
                    {getWeekLabel()}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigateWeek('next')}
                    disabled={loadingCalendars}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCalendars ? (
                <div className="text-center py-16">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Loading availability...</p>
                </div>
              ) : memberCalendars.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Calendar Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Waiting for team members to connect their calendars
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span>High availability (80%+)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span>Medium (50-80%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-orange-500 rounded"></div>
                      <span>Low (20-50%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span>Unavailable (&lt;20%)</span>
                    </div>
                  </div>

                  {/* Availability Grid */}
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                      <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-1">
                        {/* Header row */}
                        <div className="p-2"></div>
                        {getWeekDates().map((date, idx) => (
                          <div key={idx} className="p-2 text-center text-sm font-medium text-muted-foreground">
                            <div>{formatDate(date).split(',')[0]}</div>
                            <div className="text-xs">{formatDate(date).split(',')[1]}</div>
                          </div>
                        ))}

                        {/* Time slots */}
                        {timeSlots.map((hour) => {
                          const displayHour = hour > 12 ? hour - 12 : hour
                          const ampm = hour >= 12 ? 'PM' : 'AM'
                          
                          return (
                            <>
                              <div key={`time-${hour}`} className="p-2 text-xs text-muted-foreground text-right flex items-center justify-end">
                                {displayHour}:00 {ampm}
                              </div>
                              {getWeekDates().map((date, dayIdx) => {
                                const { available, total } = getAvailabilityAtTime(date, hour)
                                return (
                                  <div
                                    key={`${dayIdx}-${hour}`}
                                    onClick={() => total > 0 && handleTimeSlotClick(date, hour)}
                                    className={cn(
                                      "p-3 rounded cursor-pointer hover:opacity-80 transition-all hover:scale-105",
                                      getAvailabilityColor(available, total),
                                      total === 0 && "bg-gray-100 cursor-not-allowed"
                                    )}
                                    title={total > 0 ? `Click to schedule meeting at ${displayHour}:00 ${ampm}` : 'No data'}
                                  >
                                    {total > 0 && (
                                      <div className="text-xs text-white font-bold text-center">
                                        {available}/{total}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Timezone indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <MapPin className="w-3 h-3" />
                    <span>Times shown in your timezone: {userTimezone}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Meeting Creation Dialog */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Team Meeting</DialogTitle>
            <DialogDescription>
              Schedule a meeting with {selectedMembers.size} selected member{selectedMembers.size !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Meeting Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Meeting Subject *</Label>
              <Input
                id="subject"
                placeholder="e.g., Sprint Planning Meeting"
                value={meetingForm.subject}
                onChange={(e) => setMeetingForm({ ...meetingForm, subject: e.target.value })}
              />
            </div>

            {/* Meeting Description */}
            <div className="space-y-2">
              <Label htmlFor="body">Description</Label>
              <Textarea
                id="body"
                placeholder="Add meeting agenda or details..."
                rows={3}
                value={meetingForm.body}
                onChange={(e) => setMeetingForm({ ...meetingForm, body: e.target.value })}
              />
            </div>

            {/* Start and End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={meetingForm.startTime}
                  onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={meetingForm.endTime}
                  onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                />
              </div>
            </div>

            {/* Meeting Type */}
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={meetingForm.meetingType === 'online' ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => setMeetingForm({ ...meetingForm, meetingType: 'online', isOnlineMeeting: true })}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Online
                </Button>
                <Button
                  type="button"
                  variant={meetingForm.meetingType === 'in-person' ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => setMeetingForm({ ...meetingForm, meetingType: 'in-person', isOnlineMeeting: false })}
                >
                  <MapPinned className="w-4 h-4 mr-2" />
                  In-Person
                </Button>
                <Button
                  type="button"
                  variant={meetingForm.meetingType === 'hybrid' ? 'default' : 'outline'}
                  className="w-full"
                  onClick={() => setMeetingForm({ ...meetingForm, meetingType: 'hybrid', isOnlineMeeting: true })}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Hybrid
                </Button>
              </div>
            </div>

            {/* Location (for in-person or hybrid) */}
            {(meetingForm.meetingType === 'in-person' || meetingForm.meetingType === 'hybrid') && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Conference Room A, Building 1"
                  value={meetingForm.location}
                  onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                />
              </div>
            )}

            {/* Advanced Options */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-medium">Additional Options</h4>
              
              {/* Show As */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="showAs">Show As</Label>
                  <Select value={meetingForm.showAs} onValueChange={(value: any) => setMeetingForm({ ...meetingForm, showAs: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="tentative">Tentative</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="oof">Out of Office</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importance">Importance</Label>
                  <Select value={meetingForm.importance} onValueChange={(value: any) => setMeetingForm({ ...meetingForm, importance: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reminder */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reminder" className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Reminder
                  </Label>
                  <p className="text-xs text-muted-foreground">Send reminder before meeting</p>
                </div>
                <Switch
                  id="reminder"
                  checked={meetingForm.isReminderOn}
                  onCheckedChange={(checked) => setMeetingForm({ ...meetingForm, isReminderOn: checked })}
                />
              </div>

              {meetingForm.isReminderOn && (
                <div className="space-y-2">
                  <Label htmlFor="reminderTime">Reminder Time</Label>
                  <Select 
                    value={meetingForm.reminderMinutesBeforeStart.toString()} 
                    onValueChange={(value) => setMeetingForm({ ...meetingForm, reminderMinutesBeforeStart: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">At time of event</SelectItem>
                      <SelectItem value="5">5 minutes before</SelectItem>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="120">2 hours before</SelectItem>
                      <SelectItem value="1440">1 day before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Allow Time Proposals */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="timeProposals" className="flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    Allow New Time Proposals
                  </Label>
                  <p className="text-xs text-muted-foreground">Let attendees suggest alternate times</p>
                </div>
                <Switch
                  id="timeProposals"
                  checked={meetingForm.allowNewTimeProposals}
                  onCheckedChange={(checked) => setMeetingForm({ ...meetingForm, allowNewTimeProposals: checked })}
                />
              </div>

              {/* Sensitivity */}
              <div className="space-y-2">
                <Label htmlFor="sensitivity">Sensitivity</Label>
                <Select value={meetingForm.sensitivity} onValueChange={(value: any) => setMeetingForm({ ...meetingForm, sensitivity: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Attendees */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Attendees ({selectedMembers.size})</Label>
              <div className="flex flex-wrap gap-2">
                {msTeamsMembers
                  .filter(m => selectedMembers.has(m.id))
                  .map(member => (
                    <Badge key={member.id} variant="secondary" className="text-xs">
                      {member.displayName}
                    </Badge>
                  ))}
              </div>
              {selectedMembers.size === 0 && (
                <p className="text-xs text-amber-600">Please select team members from the left panel first</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)} disabled={creatingMeeting}>
              Cancel
            </Button>
            <Button onClick={createMeeting} disabled={creatingMeeting || !meetingForm.subject.trim() || selectedMembers.size === 0}>
              {creatingMeeting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
