"use client"

import { useEffect, useState } from "react"
import { Users, RefreshCw, Calendar, Clock, MapPin } from "lucide-react"
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

type MemberCalendar = {
  memberId: string
  userName?: string
  userEmail?: string
  timezone?: string
  error?: string
  availability?: Availability
  eventsCount?: number
}

export function TeamScheduling() {
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [msTeamsMembers, setMsTeamsMembers] = useState<TeamsMember[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [memberCalendars, setMemberCalendars] = useState<MemberCalendar[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [findingBestTime, setFindingBestTime] = useState(false)
  const [bestTimes, setBestTimes] = useState<any[]>([])
  const [meetingDuration, setMeetingDuration] = useState<number>(60)
  const [selectedDate, setSelectedDate] = useState<string>('any')
  const [userTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone)

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
        
        // Auto-fetch calendars after loading members
        if (members.length > 0) {
          fetchMemberCalendarsInternal(members)
        }
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

  const fetchMemberCalendarsInternal = async (members: TeamsMember[]) => {
    if (members.length === 0) return

    setLoadingCalendars(true)
    try {
      const response = await fetch('/api/teams/members/calendars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data = await response.json()
      setMemberCalendars(data.memberCalendars || [])
      console.log('Member Calendars:', data.memberCalendars)
    } catch (error: any) {
      console.error('Error fetching member calendars:', error)
      alert('Failed to fetch member calendars: ' + error.message)
    } finally {
      setLoadingCalendars(false)
    }
  }

  const fetchMemberCalendars = async () => {
    if (msTeamsMembers.length === 0) {
      alert('No team members found. Please wait for members to load.')
      return
    }
    await fetchMemberCalendarsInternal(msTeamsMembers)
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

  const findBestMeetingTime = async () => {
    if (selectedMembers.size < 2) {
      alert('Please select at least 2 team members to find meeting times.')
      return
    }

    setFindingBestTime(true)
    setBestTimes([])
    
    try {
      const selectedMemberData = msTeamsMembers.filter(m => selectedMembers.has(m.id))
      
      const params = new URLSearchParams()
      params.append('duration', meetingDuration.toString())
      if (selectedDate && selectedDate !== 'any') {
        params.append('date', selectedDate)
      } else {
        params.append('days', '14')
      }
      
      const response = await fetch(`/api/teams/members/freebusy?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members: selectedMemberData }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data = await response.json()
      setBestTimes(data.bestTimes || [])
      console.log('Best Times:', data)
      
      if (data.bestTimes.length === 0) {
        alert(data.note || 'No common free time found. Try a different date or duration.')
      }
    } catch (error: any) {
      console.error('Error finding best times:', error)
      alert('Failed to find best meeting times: ' + error.message)
    } finally {
      setFindingBestTime(false)
    }
  }

  // Generate date options for next 14 days
  const getDateOptions = () => {
    const options = [{ value: 'any', label: 'Any day (next 14 days)' }]
    const today = new Date()
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      // Format as YYYY-MM-DD in local timezone
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      const label = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
      options.push({ value: dateStr, label: i === 0 ? `Today (${label})` : label })
    }
    return options
  }

  // Format timezone to show abbreviation (e.g., "PST" from "Pacific Standard Time")
  const formatTimezone = (timezone: string) => {
    if (!timezone) return ''
    // Try to extract abbreviation from timezone name
    // "Pacific Standard Time" -> "PST"
    const words = timezone.split(' ')
    if (words.length > 1) {
      return words.map(w => w[0]).join('')
    }
    return timezone
  }

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

                  {/* Meeting Duration Picker */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Meeting Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 90, 120].map((duration) => (
                        <button
                          key={duration}
                          onClick={() => setMeetingDuration(duration)}
                          className={cn(
                            "px-2 py-1.5 text-xs rounded-md border transition-all",
                            meetingDuration === duration
                              ? "bg-blue-600 text-white border-blue-600 font-medium"
                              : "bg-white border-gray-200 hover:border-blue-300"
                          )}
                        >
                          {duration}min
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Picker */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Preferred Date
                    </label>
                    <Select value={selectedDate} onValueChange={setSelectedDate}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Any day (next 14 days)" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDateOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={findBestMeetingTime} 
                      disabled={selectedMembers.size < 2 || findingBestTime}
                      size="sm"
                      className="flex-1 gap-1"
                      variant={selectedMembers.size >= 2 ? "default" : "outline"}
                    >
                      <Calendar className="w-4 h-4" />
                      {findingBestTime ? 'Finding Times...' : 'Find Best Time'}
                    </Button>
                    {selectedMembers.size > 0 && (
                      <Button 
                        onClick={() => {
                          setSelectedMembers(new Set())
                          setBestTimes([])
                        }} 
                        size="sm"
                        variant="ghost"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {selectedMembers.size === 1 && (
                    <p className="text-xs text-amber-600">Select at least one more member</p>
                  )}
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

        {/* Right Panel - Meeting Scheduler */}
        <div className="lg:col-span-8">
          {bestTimes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Best Meeting Times</span>
                  <Button 
                    onClick={() => setBestTimes([])}
                    size="sm"
                    variant="ghost"
                  >
                    Close
                  </Button>
                </CardTitle>
                <CardDescription>
                  Suggested times when all {selectedMembers.size} members are available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bestTimes.map((time, index) => (
                    <div 
                      key={index}
                      className="border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer bg-gradient-to-r from-green-50 to-blue-50 border-green-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-bold text-lg">{time.label || `Option ${index + 1}`}</h4>
                            <Badge className="bg-green-600">All Available</Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium min-w-[60px]">Start:</span>
                              <span>{new Date(time.start).toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium min-w-[60px]">End:</span>
                              <span>{new Date(time.end).toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium min-w-[60px]">Duration:</span>
                              <span>{time.duration} minutes</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{userTimezone}</span>
                            </div>
                          </div>
                        </div>
                        <Button size="lg" className="ml-4">
                          Schedule
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : selectedMembers.size >= 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>Find Meeting Time</CardTitle>
                <CardDescription>
                  {selectedMembers.size} members selected
                </CardDescription>
              </CardHeader>
              <CardContent className="py-16">
                <div className="text-center space-y-4">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground" />
                  <h3 className="text-xl font-semibold">Ready to Find Meeting Times</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    You've selected {selectedMembers.size} team members. 
                    Click "Find Best Time" to discover when everyone is available.
                  </p>
                  <Button 
                    onClick={findBestMeetingTime}
                    size="lg"
                    disabled={findingBestTime}
                    className="mt-4"
                  >
                    {findingBestTime ? 'Analyzing Calendars...' : 'Find Best Time'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Team Meeting Scheduler</CardTitle>
                <CardDescription>Find the perfect time for your team meeting</CardDescription>
              </CardHeader>
              <CardContent className="py-16">
                <div className="text-center space-y-6">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Get Started</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Select at least 2 team members from the left panel to find the best meeting times when everyone is available.
                    </p>
                  </div>
                  <div className="pt-4 space-y-3 max-w-sm mx-auto">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0">1</div>
                      <span className="text-left">Select team members from the list</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0">2</div>
                      <span className="text-left">Choose duration and preferred date</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0">3</div>
                      <span className="text-left">Find and schedule the best time</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
