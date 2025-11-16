import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { google } from 'googleapis'
import { Client } from '@microsoft/microsoft-graph-client'
import { prisma } from '@/lib/prisma'
import { markEventSynced, markEventSyncFailed, getEventsToPush } from '@/lib/calendar-sync'

/**
 * Push locally modified events back to external calendars (Google/Microsoft)
 * This endpoint should be called periodically or triggered after event modifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get events that need to be pushed
    const eventsToPush = await getEventsToPush(user.id)

    if (eventsToPush.length === 0) {
      return NextResponse.json({
        message: 'No events to sync',
        synced: 0,
        failed: 0,
      })
    }

    console.log(`📤 Pushing ${eventsToPush.length} events to external calendars...`)

    const googleIntegration = user.integrations.find((i: any) => i.provider === 'GOOGLE')
    const microsoftIntegration = user.integrations.find((i: any) => i.provider === 'MICROSOFT')

    let synced = 0
    let failed = 0
    const errors: any[] = []

    for (const event of eventsToPush) {
      try {
        if (event.source === 'GOOGLE' && googleIntegration?.accessToken) {
          await pushToGoogleCalendar(event, googleIntegration)
          await markEventSynced(event.id)
          synced++
        } else if (event.source === 'MICROSOFT' && microsoftIntegration?.accessToken) {
          await pushToMicrosoftCalendar(event, microsoftIntegration)
          await markEventSynced(event.id)
          synced++
        } else {
          const errorMsg = `No integration available for ${event.source}`
          await markEventSyncFailed(event.id, errorMsg)
          errors.push({ eventId: event.id, error: errorMsg })
          failed++
        }
      } catch (error: any) {
        console.error(`Failed to push event ${event.id}:`, error)
        const errorMsg = error.message || 'Unknown error'
        await markEventSyncFailed(event.id, errorMsg)
        errors.push({ eventId: event.id, error: errorMsg })
        failed++
      }
    }

    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`)

    return NextResponse.json({
      message: `Synced ${synced} event(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      synced,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in sync-push:', error)
    return NextResponse.json(
      { error: 'Failed to sync events' },
      { status: 500 }
    )
  }
}

/**
 * Push event to Google Calendar
 */
async function pushToGoogleCalendar(event: any, integration: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Prepare event data for Google Calendar
  const googleEvent: any = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.isAllDay
      ? { date: event.startTime.toISOString().split('T')[0] }
      : { dateTime: event.startTime.toISOString(), timeZone: event.timeZone || 'UTC' },
    end: event.isAllDay
      ? { date: event.endTime.toISOString().split('T')[0] }
      : { dateTime: event.endTime.toISOString(), timeZone: event.timeZone || 'UTC' },
  }

  // Add attendees if present
  if (event.attendees && Array.isArray(event.attendees)) {
    googleEvent.attendees = event.attendees.map((a: any) => ({
      email: a.email,
      displayName: a.name,
    }))
  }

  if (event.sourceId) {
    // Update existing event
    await calendar.events.update({
      calendarId: event.sourceCalendarId || 'primary',
      eventId: event.sourceId,
      requestBody: googleEvent,
    })
    console.log(`✓ Updated Google Calendar event: ${event.sourceId}`)
  } else {
    // Create new event
    const response = await calendar.events.insert({
      calendarId: event.sourceCalendarId || 'primary',
      requestBody: googleEvent,
    })
    
    // Update event with sourceId
    await prisma.calendarEvent.update({
      where: { id: event.id },
      data: { sourceId: response.data.id },
    })
    console.log(`✓ Created Google Calendar event: ${response.data.id}`)
  }
}

/**
 * Push event to Microsoft Calendar
 */
async function pushToMicrosoftCalendar(event: any, integration: any) {
  const client = Client.init({
    authProvider: (done: any) => {
      done(null, integration.accessToken)
    },
  })

  // Prepare event data for Microsoft Graph
  const microsoftEvent: any = {
    subject: event.title,
    body: {
      contentType: 'text',
      content: event.description || '',
    },
    location: {
      displayName: event.location || '',
    },
    isAllDay: event.isAllDay,
  }

  if (event.isAllDay) {
    microsoftEvent.start = {
      dateTime: event.startTime.toISOString().split('T')[0],
      timeZone: event.timeZone || 'UTC',
    }
    microsoftEvent.end = {
      dateTime: event.endTime.toISOString().split('T')[0],
      timeZone: event.timeZone || 'UTC',
    }
  } else {
    microsoftEvent.start = {
      dateTime: event.startTime.toISOString().split('.')[0],
      timeZone: event.timeZone || 'UTC',
    }
    microsoftEvent.end = {
      dateTime: event.endTime.toISOString().split('.')[0],
      timeZone: event.timeZone || 'UTC',
    }
  }

  // Add attendees if present
  if (event.attendees && Array.isArray(event.attendees)) {
    microsoftEvent.attendees = event.attendees.map((a: any) => ({
      emailAddress: {
        address: a.email,
        name: a.name,
      },
      type: 'required',
    }))
  }

  if (event.sourceId) {
    // Update existing event
    await client
      .api(`/me/events/${event.sourceId}`)
      .update(microsoftEvent)
    console.log(`✓ Updated Microsoft Calendar event: ${event.sourceId}`)
  } else {
    // Create new event
    const response = await client
      .api('/me/events')
      .post(microsoftEvent)
    
    // Update event with sourceId
    await prisma.calendarEvent.update({
      where: { id: event.id },
      data: { sourceId: response.id },
    })
    console.log(`✓ Created Microsoft Calendar event: ${response.id}`)
  }
}
