import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user?.googleId) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 400 })
    }

    if (!user.accessToken) {
      return NextResponse.json({ error: 'Google Calendar access not granted. Please sign in again.' }, { status: 400 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString()
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    // Set credentials using stored tokens
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
    })

    // Handle token refresh if needed
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || user.refreshToken,
          },
        })
      }
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Fetch calendar list
    const calendarListResponse = await calendar.calendarList.list()
    const calendars = calendarListResponse.data.items || []

    // Fetch events from all calendars
    const allEvents = []
    
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

          const events = eventsResponse.data.items?.map(event => ({
            id: event.id,
            summary: event.summary,
            description: event.description,
            start: event.start,
            end: event.end,
            location: event.location,
            attendees: event.attendees,
            creator: event.creator,
            organizer: event.organizer,
            calendarId: cal.id,
            calendarName: cal.summary,
            calendarColor: cal.backgroundColor || cal.colorId,
            recurrence: event.recurrence,
            status: event.status,
            htmlLink: event.htmlLink,
          })) || []

          allEvents.push(...events)
        } catch (error) {
          console.error(`Error fetching events from calendar ${cal.id}:`, error)
        }
      }
    }

    return NextResponse.json({
      calendars: calendars.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        colorId: cal.colorId,
        selected: cal.selected,
        primary: cal.primary,
        accessRole: cal.accessRole,
      })),
      events: allEvents,
    })

  } catch (error) {
    console.error('Error fetching Google Calendar data:', error)
    
    // If it's an auth error, provide helpful message
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.json({ 
        error: 'Google Calendar access expired. Please sign in again to refresh permissions.' 
      }, { status: 401 })
    }
    
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 })
  }
}
