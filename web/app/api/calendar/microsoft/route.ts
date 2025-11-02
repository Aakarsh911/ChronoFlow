import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Client } from '@microsoft/microsoft-graph-client'
import { Provider } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Microsoft Outlook color palette mapping
// Reference: https://learn.microsoft.com/en-us/graph/api/resources/outlookcategory
const OUTLOOK_COLORS: Record<string, string> = {
  'preset0': '#e74856',  // Red
  'preset1': '#ff8c00',  // Orange
  'preset2': '#f7b24d',  // Peach
  'preset3': '#fff100',  // Yellow
  'preset4': '#16c60c',  // Green
  'preset5': '#00b7c3',  // Teal
  'preset6': '#00b0f0',  // Olive
  'preset7': '#0078d7',  // Blue
  'preset8': '#7719aa',  // Purple
  'preset9': '#8764b8',  // Cranberry
  'preset10': '#ed1478', // Steel
  'preset11': '#647c64', // DarkSteel
  'preset12': '#f0ad4e', // Gray
  'preset13': '#5b9bd5', // DarkGray
  'preset14': '#a5a5a5', // Black
  'preset15': '#d4d4d4', // DarkRed
  'preset16': '#b96e6e', // DarkOrange
  'preset17': '#c48a51', // DarkPeach
  'preset18': '#c4a84e', // DarkYellow
  'preset19': '#6ba76b', // DarkGreen
  'preset20': '#5ba5a6', // DarkTeal
  'preset21': '#5b86a5', // DarkOlive
  'preset22': '#5b70a5', // DarkBlue
  'preset23': '#6b5ba5', // DarkPurple
  'preset24': '#a65ba5', // DarkCranberry
  'auto': '#0078d7',     // Default Microsoft blue
  'lightBlue': '#00b7c3',
  'lightGreen': '#16c60c',
  'lightOrange': '#ff8c00',
  'lightGray': '#a5a5a5',
  'lightYellow': '#fff100',
  'lightTeal': '#00b7c3',
  'lightPink': '#ed1478',
  'lightBrown': '#8c6d4f',
  'lightRed': '#e74856',
  'maxColor': '#5b9bd5',
}

function getOutlookColor(colorName?: string): string {
  if (!colorName) return '#0078d7' // Default Microsoft blue
  
  // Try exact match first
  if (OUTLOOK_COLORS[colorName]) {
    return OUTLOOK_COLORS[colorName]
  }
  
  // Try lowercase match
  const lowerColor = colorName.toLowerCase()
  if (OUTLOOK_COLORS[lowerColor]) {
    return OUTLOOK_COLORS[lowerColor]
  }
  
  // If it's already a hex color, return it
  if (colorName.startsWith('#')) {
    return colorName
  }
  
  // Default to Microsoft blue
  return '#0078d7'
}

// Helper function to get Microsoft Graph client
function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done: any) => {
      done(null, accessToken)
    },
  })
}

// Helper function to refresh Microsoft token
async function refreshMicrosoftToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date } | null> {
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
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  } catch (error) {
    console.error('Error refreshing Microsoft token:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 Microsoft Calendar API - Start')
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      console.log('🔵 Microsoft Calendar API - No session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔵 Microsoft Calendar API - Session found:', session.user.email)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: { where: { provider: Provider.MICROSOFT } },
      },
    })

    console.log('🔵 Microsoft Calendar API - User found:', { 
      userId: user?.id, 
      hasIntegrations: user?.integrations?.length || 0 
    })

    if (!user) {
      console.log('🔵 Microsoft Calendar API - User not found in DB')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const microsoftIntegration = user.integrations.find((i: any) => i.provider === Provider.MICROSOFT)

    if (!microsoftIntegration) {
      console.log('🔵 Microsoft Calendar API - No Microsoft integration found')
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 400 })
    }

    console.log('🔵 Microsoft Calendar API - Integration found:', { 
      hasAccessToken: !!microsoftIntegration.accessToken,
      hasRefreshToken: !!microsoftIntegration.refreshToken,
      expiresAt: microsoftIntegration.expiresAt
    })

    let accessToken = microsoftIntegration.accessToken

    // Check if token is expired and refresh if needed
    if (microsoftIntegration.expiresAt && new Date() >= microsoftIntegration.expiresAt) {
      if (microsoftIntegration.refreshToken) {
        const refreshed = await refreshMicrosoftToken(microsoftIntegration.refreshToken)
        
        if (refreshed) {
          accessToken = refreshed.accessToken
          
          // Update tokens in database
          await prisma.integration.update({
            where: { id: microsoftIntegration.id },
            data: {
              accessToken: refreshed.accessToken,
              expiresAt: refreshed.expiresAt,
            },
          })
        } else {
          return NextResponse.json({ 
            error: 'Microsoft Calendar access expired. Please sign in again to refresh permissions.' 
          }, { status: 401 })
        }
      } else {
        return NextResponse.json({ 
          error: 'Microsoft Calendar access expired. Please sign in again.' 
        }, { status: 401 })
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Microsoft Calendar access not granted' }, { status: 400 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString()
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Initialize Graph client
    const client = getGraphClient(accessToken)

    // Fetch calendars
    const calendarsResponse = await client
      .api('/me/calendars')
      .select('id,name,color,canEdit,canShare,canViewPrivateItems,owner')
      .get()

    const calendars = calendarsResponse.value || []

    // Fetch events from all calendars
    const allEvents = []
    
    for (const calendar of calendars) {
      try {
        const eventsResponse = await client
          .api(`/me/calendars/${calendar.id}/calendarView`)
          .header('Prefer', 'outlook.timezone="UTC"')
          .query({
            startDateTime: startDate,
            endDateTime: endDate,
            $select: 'subject,bodyPreview,start,end,location,attendees,organizer,isAllDay,isCancelled,importance,sensitivity,showAs,webLink,onlineMeeting',
            $orderby: 'start/dateTime',
            $top: 250,
          })
          .get()

        const events = eventsResponse.value?.map((event: any) => {
          // Microsoft Graph returns datetime in UTC format (without Z suffix)
          // We need to append Z to make it a proper ISO 8601 UTC string
          let startDateTime = event.start.dateTime
          let endDateTime = event.end.dateTime
          
          if (!event.isAllDay && startDateTime && !startDateTime.endsWith('Z')) {
            startDateTime = startDateTime + 'Z'
          }
          if (!event.isAllDay && endDateTime && !endDateTime.endsWith('Z')) {
            endDateTime = endDateTime + 'Z'
          }
          
          return {
            id: event.id,
            summary: event.subject,
            description: event.bodyPreview,
            start: {
              dateTime: event.isAllDay ? undefined : startDateTime,
              date: event.isAllDay ? event.start.dateTime.split('T')[0] : undefined,
              timeZone: event.start.timeZone,
            },
            end: {
              dateTime: event.isAllDay ? undefined : endDateTime,
              date: event.isAllDay ? event.end.dateTime.split('T')[0] : undefined,
              timeZone: event.end.timeZone,
            },
            location: event.location?.displayName,
            attendees: event.attendees?.map((a: any) => ({
              email: a.emailAddress?.address,
              name: a.emailAddress?.name,
              responseStatus: a.status?.response,
            })),
            organizer: {
              email: event.organizer?.emailAddress?.address,
              name: event.organizer?.emailAddress?.name,
            },
            calendarId: calendar.id,
            calendarName: calendar.name,
            calendarColor: getOutlookColor(calendar.color),
            isAllDay: event.isAllDay,
            status: event.isCancelled ? 'cancelled' : 'confirmed',
            importance: event.importance,
            showAs: event.showAs,
            htmlLink: event.webLink, // Add htmlLink to match Google Calendar format
            webLink: event.webLink,
            onlineMeeting: event.onlineMeeting,
          }
        }) || []

        allEvents.push(...events)
      } catch (error) {
        console.error(`Error fetching events from calendar ${calendar.id}:`, error)
      }
    }

    return NextResponse.json({
      calendars: calendars.map((cal: any) => ({
        id: cal.id,
        summary: cal.name, // Use 'summary' to match Google Calendar format
        name: cal.name,
        backgroundColor: getOutlookColor(cal.color),
        color: getOutlookColor(cal.color),
        canEdit: cal.canEdit,
        canShare: cal.canShare,
        canViewPrivateItems: cal.canViewPrivateItems,
        owner: cal.owner,
        accessRole: 'owner',
      })),
      events: allEvents,
    })

  } catch (error) {
    console.error('Error fetching Microsoft Calendar data:', error)
    
    // If it's an auth error, provide helpful message
    if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
      return NextResponse.json({ 
        error: 'Microsoft Calendar access expired. Please sign in again to refresh permissions.' 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch Microsoft Calendar data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
