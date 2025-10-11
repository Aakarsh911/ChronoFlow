import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

const prisma = new PrismaClient()

// Helper function to get Microsoft Graph client
function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done: any) => {
      done(null, accessToken)
    },
  })
}

// Helper function to refresh Microsoft token
async function refreshMicrosoftToken(refreshToken: string, integrationId: string): Promise<string | null> {
  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'openid email profile offline_access User.Read Calendars.Read Calendars.Read.Shared OnlineMeetings.Read Mail.Read Mail.Send MailboxSettings.Read Team.ReadBasic.All TeamMember.Read.All',
      }),
    })

    if (!response.ok) {
      console.error('Failed to refresh Microsoft token:', await response.text())
      return null
    }

    const data = await response.json()
    
    // Update tokens in database
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      },
    })

    return data.access_token
  } catch (error) {
    console.error('Error refreshing Microsoft token:', error)
    return null
  }
}

// Helper function to find common free slots manually
function findCommonFreeSlots(
  allEvents: any[],
  startTime: Date,
  endTime: Date,
  durationMinutes: number
): any[] {
  const suggestions: any[] = []
  const slotDuration = durationMinutes * 60 * 1000 // Convert to milliseconds

  // Business hours: 9 AM to 5 PM
  const businessStart = 9
  const businessEnd = 17

  // Iterate through each day
  const currentDate = new Date(startTime)
  
  while (currentDate < endTime && suggestions.length < 10) {
    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1)
      continue
    }

    // Check each hour in business hours
    for (let hour = businessStart; hour < businessEnd; hour++) {
      const slotStart = new Date(currentDate)
      slotStart.setHours(hour, 0, 0, 0)
      
      const slotEnd = new Date(slotStart.getTime() + slotDuration)

      // Check if slot end is within business hours
      if (slotEnd.getHours() >= businessEnd) {
        continue
      }

      // Check if all attendees are free during this slot
      let allFree = true
      
      for (const attendeeData of allEvents) {
        const events = attendeeData.events || []
        
        for (const event of events) {
          const eventStart = new Date(event.start.dateTime + 'Z')
          const eventEnd = new Date(event.end.dateTime + 'Z')
          
          // Check if event overlaps with slot
          const overlaps = eventStart < slotEnd && eventEnd > slotStart
          
          // Only consider busy events
          const isBusy = event.showAs === 'busy' || event.showAs === 'tentative' || event.showAs === 'oof'
          
          if (overlaps && isBusy) {
            allFree = false
            break
          }
        }
        
        if (!allFree) break
      }

      if (allFree && slotStart > new Date()) {
        const dayLabel = slotStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        const timeLabel = slotStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        
        suggestions.push({
          label: `${dayLabel} at ${timeLabel}`,
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          duration: durationMinutes,
          confidence: 90,
          score: 'ManualAnalysis'
        })
        
        if (suggestions.length >= 10) break
      }
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return suggestions
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get member data from request body
    const body = await req.json()
    const { members } = body

    if (!members || !Array.isArray(members) || members.length < 2) {
      return NextResponse.json({ error: 'At least 2 members are required' }, { status: 400 })
    }

    console.log('Finding best meeting times for members:', members.length)

    // Get the current user's Microsoft integration (organizer)
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          where: { provider: 'MICROSOFT' },
        },
      },
    })

    if (!currentUser || currentUser.integrations.length === 0) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 400 })
    }

    const organizerIntegration = currentUser.integrations[0]
    let accessToken = organizerIntegration.accessToken

    // Check if token is expired and refresh if needed
    if (organizerIntegration.expiresAt && new Date() >= organizerIntegration.expiresAt) {
      if (organizerIntegration.refreshToken) {
        accessToken = await refreshMicrosoftToken(organizerIntegration.refreshToken, organizerIntegration.id)
        if (!accessToken) {
          return NextResponse.json({ error: 'Failed to refresh access token' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Access token expired' }, { status: 401 })
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 400 })
    }

    // Build attendees list for findMeetingTimes API
    const attendees = []
    
    for (const member of members) {
      // Find integration for each member
      const integration = await prisma.integration.findFirst({
        where: {
          provider: 'MICROSOFT',
          accountId: member.id,
        },
        include: {
          user: true,
        },
      })

      if (integration && integration.user.email) {
        attendees.push({
          type: 'required',
          emailAddress: {
            address: integration.user.email,
            name: member.displayName || integration.user.name
          }
        })
      }
    }

    if (attendees.length < 2) {
      return NextResponse.json({ 
        error: 'Not enough members have connected their Microsoft accounts',
        connectedCount: attendees.length
      }, { status: 400 })
    }

    // Initialize Graph client with organizer's token
    const client = getGraphClient(accessToken)

    // Get meeting duration from request or default to 60 minutes
    const { searchParams } = new URL(req.url)
    const durationMinutes = parseInt(searchParams.get('duration') || '60')
    const selectedDateStr = searchParams.get('date')
    const daysAhead = parseInt(searchParams.get('days') || '14')
    
    // Set time constraints
    const now = new Date()
    let startTime: Date
    let endTime: Date

    if (selectedDateStr) {
      // User selected a specific date - search only that day in their timezone
      // selectedDateStr format: "2025-10-14" (YYYY-MM-DD)
      const [year, month, day] = selectedDateStr.split('-').map(Number)
      
      // Create date in UTC at start of selected day (8 AM UTC as placeholder)
      // We'll adjust this based on user's timezone offset
      startTime = new Date(Date.UTC(year, month - 1, day, 8, 0, 0, 0))
      
      // End at 6 PM on the selected date (18:00)
      endTime = new Date(Date.UTC(year, month - 1, day, 18, 0, 0, 0))
      
      console.log(`Searching for meetings on ${selectedDateStr} from ${startTime.toISOString()} to ${endTime.toISOString()}`)
    } else {
      // No specific date - search next N days
      startTime = new Date(now)
      // Start from next available hour
      startTime.setMinutes(0, 0, 0)
      startTime.setHours(startTime.getHours() + 1)

      endTime = new Date(startTime)
      endTime.setDate(endTime.getDate() + daysAhead)
    }

    // Format duration as ISO 8601 duration
    const meetingDuration = `PT${durationMinutes}M`

    // Call Microsoft Graph findMeetingTimes API
    const requestBody = {
      attendees: attendees,
      timeConstraint: {
        activityDomain: 'work', // Only business hours
        timeslots: [
          {
            start: {
              dateTime: startTime.toISOString().replace('.000Z', ''),
              timeZone: 'UTC'
            },
            end: {
              dateTime: endTime.toISOString().replace('.000Z', ''),
              timeZone: 'UTC'
            }
          }
        ]
      },
      meetingDuration: meetingDuration,
      returnSuggestionReasons: true,
      minimumAttendeePercentage: 100, // All attendees must be available
      maxCandidates: 20,
      isOrganizerOptional: false
    }

    console.log('Calling findMeetingTimes with:', JSON.stringify(requestBody, null, 2))

    const response = await client
      .api('/me/findMeetingTimes')
      .post(requestBody)

    console.log('findMeetingTimes response:', JSON.stringify(response, null, 2))

    const meetingTimeSuggestions = response.meetingTimeSuggestions || []
    const emptySuggestionsReason = response.emptySuggestionsReason

    // If no suggestions from API, try to find common free slots manually
    if (meetingTimeSuggestions.length === 0) {
      console.log('No suggestions from API, reason:', emptySuggestionsReason)
      
      // Fetch calendar events for all attendees to manually find free slots
      const allEvents: any[] = []
      
      for (const attendee of attendees) {
        try {
          // Get events for each attendee
          const attendeeIntegration = await prisma.integration.findFirst({
            where: {
              provider: 'MICROSOFT',
              user: {
                email: attendee.emailAddress.address
              }
            }
          })

          if (attendeeIntegration?.accessToken) {
            const attendeeClient = getGraphClient(attendeeIntegration.accessToken)
            const eventsResponse = await attendeeClient
              .api('/me/calendar/calendarView')
              .query({
                startDateTime: startTime.toISOString(),
                endDateTime: endTime.toISOString()
              })
              .select('subject,start,end,showAs')
              .top(250)
              .get()

            allEvents.push({
              attendeeEmail: attendee.emailAddress.address,
              events: eventsResponse.value || []
            })
          }
        } catch (error) {
          console.error(`Failed to get events for ${attendee.emailAddress.address}:`, error)
        }
      }

      // Find common free time slots
      const manualSuggestions = findCommonFreeSlots(allEvents, startTime, endTime, durationMinutes)
      
      if (manualSuggestions.length > 0) {
        return NextResponse.json({ 
          bestTimes: manualSuggestions,
          attendeesIncluded: attendees.length,
          searchedFrom: startTime.toISOString(),
          searchedUntil: endTime.toISOString(),
          method: 'manual',
          note: 'Times found by analyzing individual calendars'
        })
      }

      return NextResponse.json({ 
        bestTimes: [],
        attendeesIncluded: attendees.length,
        searchedFrom: startTime.toISOString(),
        searchedUntil: endTime.toISOString(),
        emptySuggestionsReason: emptySuggestionsReason || 'No common free time found',
        note: 'Try extending the search range or reducing meeting duration'
      })
    }

    // Format the best times from API
    const bestTimes = meetingTimeSuggestions.map((suggestion: any, index: number) => {
      const start = new Date(suggestion.meetingTimeSlot.start.dateTime + 'Z')
      const end = new Date(suggestion.meetingTimeSlot.end.dateTime + 'Z')
      const duration = (end.getTime() - start.getTime()) / (1000 * 60) // minutes

      // Generate a friendly label
      const dayLabel = start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      const timeLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      
      return {
        label: `${dayLabel} at ${timeLabel}`,
        start: start.toISOString(),
        end: end.toISOString(),
        duration: duration,
        confidence: suggestion.confidence,
        score: suggestion.suggestionReason,
        attendeeAvailability: suggestion.attendeeAvailability
      }
    })

    console.log(`✓ Found ${bestTimes.length} meeting time suggestions`)

    return NextResponse.json({ 
      bestTimes,
      attendeesIncluded: attendees.length,
      searchedFrom: startTime.toISOString(),
      searchedUntil: endTime.toISOString(),
      method: 'api'
    })
  } catch (error: any) {
    console.error('FreeBusy API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 })
  }
}
