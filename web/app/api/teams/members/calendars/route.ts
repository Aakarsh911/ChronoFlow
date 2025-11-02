import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'
import { prisma } from '@/lib/prisma'

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
        scope: 'openid email profile offline_access User.Read Calendars.Read Calendars.Read.Shared Calendars.ReadWrite Calendars.ReadWrite.Shared OnlineMeetings.Read OnlineMeetings.ReadWrite Mail.Read Mail.Send MailboxSettings.Read Chat.Read ChatMessage.Read ChannelMessage.Read.All Team.ReadBasic.All TeamMember.Read.All',
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

// Helper function to calculate availability
function calculateAvailability(events: any[], currentTime: Date) {
  const now = currentTime.getTime()
  
  // Check if currently in a meeting
  const currentEvent = events.find((event: any) => {
    // Microsoft Graph returns dateTime in UTC when we use the Prefer header
    const startStr = event.start?.dateTime || event.start
    const endStr = event.end?.dateTime || event.end
    
    // If dateTime doesn't end with Z, append it to ensure it's treated as UTC
    const startISO = startStr.endsWith('Z') ? startStr : `${startStr}Z`
    const endISO = endStr.endsWith('Z') ? endStr : `${endStr}Z`
    
    const start = new Date(startISO).getTime()
    const end = new Date(endISO).getTime()
    return start <= now && end > now && (event.showAs === 'busy' || event.showAs === 'oof' || event.showAs === 'tentative')
  })

  if (currentEvent) {
    const endStr = currentEvent.end?.dateTime || currentEvent.end
    const endISO = endStr.endsWith('Z') ? endStr : `${endStr}Z`
    const endTime = new Date(endISO)
    return {
      status: 'busy',
      nextAvailable: endTime.toISOString(),
      currentEventEnd: endTime.toISOString(),
    }
  }

  // Find next busy event
  const nextBusyEvent = events.find((event: any) => {
    const startStr = event.start?.dateTime || event.start
    const startISO = startStr.endsWith('Z') ? startStr : `${startStr}Z`
    const start = new Date(startISO).getTime()
    return start > now && (event.showAs === 'busy' || event.showAs === 'oof' || event.showAs === 'tentative')
  })

  if (nextBusyEvent) {
    const startStr = nextBusyEvent.start?.dateTime || nextBusyEvent.start
    const startISO = startStr.endsWith('Z') ? startStr : `${startStr}Z`
    const nextStart = new Date(startISO)
    return {
      status: 'available',
      nextAvailable: 'now',
      busyUntil: null,
      nextBusyAt: nextStart.toISOString(),
    }
  }

  return {
    status: 'available',
    nextAvailable: 'now',
    busyUntil: null,
    nextBusyAt: null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get member data from request body (includes id, displayName, email)
    const body = await req.json()
    const { members } = body

    if (!members || !Array.isArray(members)) {
      return NextResponse.json({ error: 'members array is required' }, { status: 400 })
    }

    console.log('Fetching calendars for members:', members.length)

    // Get date range from query params
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString()
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const memberCalendars: any[] = []

    // For each member, find their integration by accountId (Microsoft user ID)
    for (const member of members) {
      const memberId = member.id
      const memberName = member.displayName
      const memberEmail = member.email

      try {
        // Find integration by Microsoft accountId
        const integration = await prisma.integration.findFirst({
          where: {
            provider: 'MICROSOFT',
            accountId: memberId,
          },
          include: {
            user: true,
          },
        })

        if (!integration) {
          console.log(`No integration found for member ${memberName} (${memberId})`)
          memberCalendars.push({
            memberId,
            userName: memberName,
            userEmail: memberEmail,
            error: 'This member has not connected their Microsoft account to ChronoFlow',
            events: [],
          })
          continue
        }

        let accessToken = integration.accessToken

        // Check if token is expired and refresh if needed
        if (integration.expiresAt && new Date() >= integration.expiresAt) {
          if (integration.refreshToken) {
            accessToken = await refreshMicrosoftToken(integration.refreshToken, integration.id)
            if (!accessToken) {
              memberCalendars.push({
                memberId,
                userName: memberName,
                userEmail: memberEmail,
                error: 'Failed to refresh access token',
                events: [],
              })
              continue
            }
          } else {
            memberCalendars.push({
              memberId,
              userName: memberName,
              userEmail: memberEmail,
              error: 'Access token expired and no refresh token available',
              events: [],
            })
            continue
          }
        }

        if (!accessToken) {
          memberCalendars.push({
            memberId,
            userName: memberName,
            userEmail: memberEmail,
            error: 'No access token available',
            events: [],
          })
          continue
        }

        // Initialize Graph client
        const client = getGraphClient(accessToken)

        // Fetch calendar events for availability calculation
        try {
          // Fetch mailbox settings to get timezone
          let userTimezone = 'UTC'
          try {
            const mailboxSettings = await client
              .api('/me/mailboxSettings')
              .get()
            userTimezone = mailboxSettings.timeZone || 'UTC'
          } catch (tzError) {
            console.log(`Could not fetch timezone for ${memberName}, using UTC`)
          }

          const eventsResponse = await client
            .api('/me/calendar/events')
            .select('subject,start,end,isAllDay,showAs')
            .filter(`start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`)
            .orderby('start/dateTime')
            .top(100)
            .header('Prefer', 'outlook.timezone="UTC"')
            .get()

          const events = eventsResponse.value || []

          // Calculate availability
          const now = new Date()
          const availability = calculateAvailability(events, now)

          memberCalendars.push({
            memberId,
            userName: memberName,
            userEmail: memberEmail,
            timezone: userTimezone,
            availability: availability,
            eventsCount: events.length,
            events: events, // Include events for heat map calculation
          })
          
          console.log(`✓ Fetched ${events.length} events for ${memberName} (${userTimezone})`)
        } catch (error: any) {
          console.error(`Error fetching calendar for member ${memberName}:`, error)
          memberCalendars.push({
            memberId,
            userName: memberName,
            userEmail: memberEmail,
            error: error.message || 'Failed to fetch calendar events',
            events: [],
          })
        }
      } catch (error: any) {
        console.error(`Error processing member ${memberName}:`, error)
        memberCalendars.push({
          memberId,
          userName: memberName,
          userEmail: memberEmail,
          error: error.message || 'Failed to process member',
          events: [],
        })
      }
    }

    return NextResponse.json({ memberCalendars })
  } catch (error: any) {
    console.error('Teams members calendars API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
