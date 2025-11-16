import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { google } from 'googleapis'
import { Client } from '@microsoft/microsoft-graph-client'
import { prisma } from '@/lib/prisma'
import {
  syncEventsToDatabase,
  cleanupDeletedEvents,
  updateCalendarSyncState,
  ExternalCalendarEvent,
} from '@/lib/calendar-sync'

// Microsoft Outlook color palette mapping
const OUTLOOK_COLORS: Record<string, string> = {
  'preset0': '#e74856', 'preset1': '#ff8c00', 'preset2': '#f7b24d', 'preset3': '#fff100',
  'preset4': '#16c60c', 'preset5': '#00b7c3', 'preset6': '#00b0f0', 'preset7': '#0078d7',
  'preset8': '#7719aa', 'preset9': '#8764b8', 'preset10': '#ed1478', 'preset11': '#647c64',
  'auto': '#0078d7', 'lightBlue': '#00b7c3', 'lightGreen': '#16c60c', 'lightOrange': '#ff8c00',
}

function getOutlookColor(colorName?: string): string {
  return colorName && OUTLOOK_COLORS[colorName] ? OUTLOOK_COLORS[colorName] : '#0078d7'
}

/**
 * GET /api/calendar/sync-from-external
 * Fetch events from Google/Microsoft and sync to database
 * This should be called periodically or when user requests refresh
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString()
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    console.log(`🔄 Syncing calendar events from external sources...`)

    // Get user with integrations
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const googleIntegration = user.integrations.find((i: any) => i.provider === 'GOOGLE')
    const microsoftIntegration = user.integrations.find((i: any) => i.provider === 'MICROSOFT')

    let totalSynced = 0
    let totalCreated = 0
    let totalUpdated = 0
    const errors: any[] = []

    // Sync Google Calendar
    if (googleIntegration?.accessToken) {
      try {
        console.log('📥 Syncing Google Calendar...')
        const googleEvents = await fetchGoogleCalendarEvents(
          googleIntegration,
          startDate,
          endDate
        )
        
        const externalEventIds = googleEvents.map(e => e.id)
        const syncResult = await syncEventsToDatabase(user.id, user.email, googleEvents)
        const deleted = await cleanupDeletedEvents(user.id, 'GOOGLE' as any, externalEventIds)
        
        totalSynced += googleEvents.length
        totalCreated += syncResult.created
        totalUpdated += syncResult.updated
        
        console.log(`✅ Google: ${syncResult.created} created, ${syncResult.updated} updated, ${deleted} deleted`)
        
        // Update sync state for each calendar
        const calendars = [...new Set(googleEvents.map(e => e.calendarId))]
        for (const calendarId of calendars) {
          await updateCalendarSyncState(
            user.id,
            'GOOGLE' as any,
            calendarId,
            googleEvents.find(e => e.calendarId === calendarId)?.calendarName,
            true
          )
        }
      } catch (error: any) {
        console.error('Error syncing Google Calendar:', error)
        errors.push({ source: 'google', error: error.message })
      }
    }

    // Sync Microsoft Calendar
    if (microsoftIntegration?.accessToken) {
      try {
        console.log('📥 Syncing Microsoft Calendar...')
        const microsoftEvents = await fetchMicrosoftCalendarEvents(
          microsoftIntegration,
          startDate,
          endDate
        )
        
        const externalEventIds = microsoftEvents.map(e => e.id)
        const syncResult = await syncEventsToDatabase(user.id, user.email, microsoftEvents)
        const deleted = await cleanupDeletedEvents(user.id, 'MICROSOFT' as any, externalEventIds)
        
        totalSynced += microsoftEvents.length
        totalCreated += syncResult.created
        totalUpdated += syncResult.updated
        
        console.log(`✅ Microsoft: ${syncResult.created} created, ${syncResult.updated} updated, ${deleted} deleted`)
        
        // Update sync state for each calendar
        const calendars = [...new Set(microsoftEvents.map(e => e.calendarId))]
        for (const calendarId of calendars) {
          await updateCalendarSyncState(
            user.id,
            'MICROSOFT' as any,
            calendarId,
            microsoftEvents.find(e => e.calendarId === calendarId)?.calendarName,
            true
          )
        }
      } catch (error: any) {
        console.error('Error syncing Microsoft Calendar:', error)
        errors.push({ source: 'microsoft', error: error.message })
      }
    }

    return NextResponse.json({
      message: `Synced ${totalSynced} events from external calendars`,
      synced: totalSynced,
      created: totalCreated,
      updated: totalUpdated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error syncing calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to sync calendar events' },
      { status: 500 }
    )
  }
}

/**
 * Fetch events from Google Calendar
 */
async function fetchGoogleCalendarEvents(
  integration: any,
  startDate: string,
  endDate: string
): Promise<ExternalCalendarEvent[]> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const calendarListResponse = await calendar.calendarList.list()
  const calendars = calendarListResponse.data.items || []

  const allEvents: ExternalCalendarEvent[] = []

  for (const cal of calendars) {
    if (cal.id) {
      try {
        const eventsResponse = await calendar.events.list({
          calendarId: cal.id,
          timeMin: startDate,
          timeMax: endDate,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        })

        const events = eventsResponse.data.items?.map((event: any) => ({
          id: event.id!,
          summary: event.summary || '(No title)',
          description: event.description,
          start: event.start!,
          end: event.end!,
          location: event.location,
          attendees: event.attendees,
          organizer: event.organizer,
          htmlLink: event.htmlLink,
          hangoutLink: event.hangoutLink,
          conferenceData: event.conferenceData,
          calendarId: cal.id!,
          calendarName: cal.summary || undefined,
          source: 'google' as const,
        })) || []

        allEvents.push(...events)
      } catch (error) {
        console.error(`Error fetching events from Google calendar ${cal.id}:`, error)
      }
    }
  }

  return allEvents
}

/**
 * Fetch events from Microsoft Calendar
 */
async function fetchMicrosoftCalendarEvents(
  integration: any,
  startDate: string,
  endDate: string
): Promise<ExternalCalendarEvent[]> {
  const client = Client.init({
    authProvider: (done: any) => {
      done(null, integration.accessToken)
    },
  })

  const calendarsResponse = await client
    .api('/me/calendars')
    .select('id,name,color')
    .get()

  const calendars = calendarsResponse.value || []
  const allEvents: ExternalCalendarEvent[] = []

  for (const cal of calendars) {
    try {
      const eventsResponse = await client
        .api(`/me/calendars/${cal.id}/calendarView`)
        .header('Prefer', 'outlook.timezone="UTC"')
        .query({
          startDateTime: startDate,
          endDateTime: endDate,
          $select: 'subject,bodyPreview,start,end,location,attendees,organizer,isAllDay,webLink',
          $orderby: 'start/dateTime',
          $top: 250,
        })
        .get()

      const events = eventsResponse.value?.map((event: any) => {
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
          summary: event.subject || '(No title)',
          description: event.bodyPreview,
          start: {
            dateTime: event.isAllDay ? undefined : startDateTime,
            date: event.isAllDay ? event.start.dateTime.split('T')[0] : undefined,
          },
          end: {
            dateTime: event.isAllDay ? undefined : endDateTime,
            date: event.isAllDay ? event.end.dateTime.split('T')[0] : undefined,
          },
          location: event.location?.displayName,
          attendees: event.attendees?.map((a: any) => ({
            email: a.emailAddress?.address,
            name: a.emailAddress?.name,
          })),
          organizer: {
            email: event.organizer?.emailAddress?.address,
            name: event.organizer?.emailAddress?.name,
          },
          htmlLink: event.webLink,
          calendarId: cal.id,
          calendarName: cal.name,
          source: 'microsoft' as const,
        }
      }) || []

      allEvents.push(...events)
    } catch (error) {
      console.error(`Error fetching events from Microsoft calendar ${cal.id}:`, error)
    }
  }

  return allEvents
}
