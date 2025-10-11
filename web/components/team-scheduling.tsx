"use client"

import { useEffect, useState } from "react"
import { Users, RefreshCw, Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
                                    className={cn(
                                      "p-3 rounded cursor-pointer hover:opacity-80 transition-all hover:scale-105",
                                      getAvailabilityColor(available, total),
                                      total === 0 && "bg-gray-100 cursor-not-allowed"
                                    )}
                                    title={total > 0 ? `${available}/${total} available at ${displayHour}:00 ${ampm}` : 'No data'}
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
    </div>
  )
}
