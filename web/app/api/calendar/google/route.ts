import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { google } from 'googleapis'
import type { Credentials } from 'google-auth-library'
import { Provider } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🟢 Google Calendar API - Start')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('🟢 Google Calendar API - No session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🟢 Google Calendar API - Session found:', session.user.email)

    // Get user + Google integration from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          where: { provider: Provider.GOOGLE },
        },
      },
    })

    console.log('🟢 Google Calendar API - User found:', { 
      userId: user?.id, 
      hasIntegrations: user?.integrations?.length || 0 
    })

    if (!user) {
      console.log('🟢 Google Calendar API - User not found in DB')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const googleIntegration = user.integrations[0]
    if (!googleIntegration) {
      console.log('🟢 Google Calendar API - No Google integration found')
      return NextResponse.json({ error: 'Google account not connected' }, { status: 400 })
    }

    console.log('🟢 Google Calendar API - Integration found:', { 
      hasAccessToken: !!googleIntegration.accessToken,
      hasRefreshToken: !!googleIntegration.refreshToken 
    })

    if (!googleIntegration?.accessToken) {
      console.log('🟢 Google Calendar API - No access token')
      return NextResponse.json({ error: 'Google Calendar access not granted. Please sign in again.' }, { status: 400 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString()
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Check if token is expired and refresh proactively
    let accessToken = googleIntegration.accessToken
    let refreshToken = googleIntegration.refreshToken
    
    if (googleIntegration.expiresAt && new Date() >= new Date(googleIntegration.expiresAt)) {
      console.log('🔄 Google token expired, refreshing...')
      
      if (!googleIntegration.refreshToken) {
        console.error('❌ No refresh token available for Google')
        return NextResponse.json({ 
          error: 'Token expired. Please reconnect your Google account.',
          needsReauth: true 
        }, { status: 401 })
      }

      const oauth2ClientRefresh = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )
      
      oauth2ClientRefresh.setCredentials({
        refresh_token: googleIntegration.refreshToken,
      })

      try {
        const { credentials } = await oauth2ClientRefresh.refreshAccessToken()
        accessToken = credentials.access_token || googleIntegration.accessToken
        refreshToken = credentials.refresh_token || googleIntegration.refreshToken
        
        // Update tokens in database
        await prisma.integration.update({
          where: { id: googleIntegration.id },
          data: {
            accessToken: credentials.access_token || googleIntegration.accessToken,
            refreshToken: credentials.refresh_token || googleIntegration.refreshToken,
            expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          },
        })
        
        console.log('✅ Google token refreshed successfully')
      } catch (refreshError) {
        console.error('❌ Failed to refresh Google token:', refreshError)
        return NextResponse.json({ 
          error: 'Failed to refresh token. Please reconnect your Google account.',
          needsReauth: true 
        }, { status: 401 })
      }
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    // Set credentials using stored tokens
    oauth2Client.setCredentials({
      access_token: accessToken || undefined,
      refresh_token: refreshToken || undefined,
    })

    // Handle token refresh if needed
    oauth2Client.on('tokens', (tokens: Credentials) => {
      // Listener type expects a void-returning handler; run async work in a fire-and-forget IIFE
      void (async () => {
        try {
          const access = tokens.access_token ?? undefined
          const refresh = tokens.refresh_token ?? undefined
          const expiry = tokens.expiry_date ?? undefined

          // Only update if we received any new token info
          if (access || refresh || expiry) {
            await prisma.integration.update({
              where: { id: googleIntegration.id },
              data: {
                accessToken: access ?? googleIntegration.accessToken,
                refreshToken: refresh ?? googleIntegration.refreshToken,
                expiresAt: expiry ? new Date(expiry) : googleIntegration.expiresAt,
              },
            })
          }
        } catch (e) {
          console.error('Failed to persist refreshed Google tokens', e)
        }
      })()
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Fetch calendar list with error handling
    let calendarListResponse
    try {
      calendarListResponse = await calendar.calendarList.list()
    } catch (error: any) {
      console.error('❌ Error fetching calendar list:', error)
      
      // Check if it's an invalid_grant error
      if (error.code === 400 || error.message?.includes('invalid_grant')) {
        return NextResponse.json({ 
          error: 'Your Google Calendar access has expired. Please reconnect your account.',
          needsReauth: true,
          details: 'Token has been revoked or expired beyond refresh capability.'
        }, { status: 401 })
      }
      
      throw error
    }
    
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

          const events = eventsResponse.data.items?.map((event: any) => ({
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
  calendars: calendars.map((cal: any) => ({
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
    console.error('🟢 Google Calendar API - Error:', error)
    
    // If it's an auth error, provide helpful message
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.json({ 
        error: 'Google Calendar access expired. Please sign in again to refresh permissions.' 
      }, { status: 401 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch calendar data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
