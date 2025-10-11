import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { google } from 'googleapis'
import { Client } from '@microsoft/microsoft-graph-client'
import { PrismaClient } from '@prisma/client'
import { cache, cacheKeys, cacheTTL } from '@/lib/redis'

const prisma = new PrismaClient()

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString()
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const forceRefresh = searchParams.get('forceRefresh') === 'true'

    console.log(`📅 Calendar API called - forceRefresh: ${forceRefresh}`)

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

    // Check cache first (unless force refresh is requested)
    const cacheKey = cacheKeys.calendar(user.id, startDate, endDate)
    
    if (forceRefresh) {
      // Invalidate cache when force refresh is requested
      await cache.del(cacheKey)
      console.log('✓ Cache invalidated due to forceRefresh')
    } else {
      const cachedData = await cache.get(cacheKey)
      if (cachedData) {
        console.log('✓ Returning cached calendar data')
        return NextResponse.json({
          ...cachedData,
          cached: true,
        })
      }
    }

    const googleIntegration = user.integrations.find((i: any) => i.provider === 'GOOGLE')
    const microsoftIntegration = user.integrations.find((i: any) => i.provider === 'MICROSOFT')

    const allEvents: any[] = []
    const allCalendars: any[] = []
    const errors: any[] = []

    // Fetch Google Calendar
    if (googleIntegration?.accessToken) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        )
        
        oauth2Client.setCredentials({
          access_token: googleIntegration.accessToken,
          refresh_token: googleIntegration.refreshToken || undefined,
        })

        // Handle token refresh automatically
        oauth2Client.on('tokens', (tokens: any) => {
          void (async () => {
            try {
              if (tokens.access_token || tokens.refresh_token || tokens.expiry_date) {
                await prisma.integration.update({
                  where: { id: googleIntegration.id },
                  data: {
                    accessToken: tokens.access_token ?? googleIntegration.accessToken,
                    refreshToken: tokens.refresh_token ?? googleIntegration.refreshToken,
                    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : googleIntegration.expiresAt,
                  },
                })
              }
            } catch (e) {
              console.error('Failed to persist refreshed Google tokens', e)
            }
          })()
        })

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
        const calendarListResponse = await calendar.calendarList.list()
        const calendars = calendarListResponse.data.items || []

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
                calendarId: cal.id,
                calendarName: cal.summary,
                calendarColor: cal.backgroundColor || cal.colorId,
                htmlLink: event.htmlLink,
                source: 'google',
                sourceIcon: '🟢',
              })) || []

              allEvents.push(...events)
            } catch (error) {
              console.error(`Error fetching events from Google calendar ${cal.id}:`, error)
            }
          }
        }

        allCalendars.push(...calendars.map((cal: any) => ({
          id: cal.id,
          summary: cal.summary,
          backgroundColor: cal.backgroundColor,
          foregroundColor: cal.foregroundColor,
          colorId: cal.colorId,
          primary: cal.primary,
          accessRole: cal.accessRole,
          source: 'google',
        })))
      } catch (error) {
        console.error('Error fetching Google Calendar:', error)
        errors.push({ source: 'google', error: 'Failed to fetch Google Calendar' })
      }
    } else {
      errors.push({ source: 'google', error: 'Google account not connected' })
    }

    // Fetch Microsoft Calendar
    if (microsoftIntegration?.accessToken) {
      try {
        // Check if token is expired and refresh if needed
        let accessToken = microsoftIntegration.accessToken
        if (microsoftIntegration.expiresAt && new Date() >= microsoftIntegration.expiresAt) {
          if (microsoftIntegration.refreshToken) {
            // Refresh the token
            const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: process.env.AZURE_AD_CLIENT_ID!,
                client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
                refresh_token: microsoftIntegration.refreshToken,
                grant_type: 'refresh_token',
                scope: 'openid email profile offline_access User.Read Calendars.Read Calendars.Read.Shared OnlineMeetings.Read Mail.Read Mail.Send MailboxSettings.Read',
              }),
            })

            if (response.ok) {
              const data = await response.json()
              accessToken = data.access_token
              
              // Update tokens in database
              await prisma.integration.update({
                where: { id: microsoftIntegration.id },
                data: {
                  accessToken: data.access_token,
                  refreshToken: data.refresh_token || microsoftIntegration.refreshToken,
                  expiresAt: new Date(Date.now() + data.expires_in * 1000),
                },
              })
            } else {
              const errorData = await response.text()
              console.error('Failed to refresh Microsoft token:', response.status, errorData)
              throw new Error(`Failed to refresh Microsoft token: ${response.status}`)
            }
          } else {
            console.error('Microsoft token expired and no refresh token available')
            throw new Error('Microsoft token expired and no refresh token available')
          }
        }

        const client = Client.init({
          authProvider: (done: any) => {
            done(null, accessToken)
          },
        })

        const calendarsResponse = await client
          .api('/me/calendars')
          .select('id,name,color,canEdit,canShare,canViewPrivateItems,owner')
          .get()

        const calendars = calendarsResponse.value || []

        for (const cal of calendars) {
          try {
            const eventsResponse = await client
              .api(`/me/calendars/${cal.id}/calendarView`)
              .header('Prefer', 'outlook.timezone="UTC"')
              .query({
                startDateTime: startDate,
                endDateTime: endDate,
                $select: 'subject,bodyPreview,start,end,location,attendees,organizer,isAllDay,isCancelled,webLink',
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
                summary: event.subject,
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
                calendarId: cal.id,
                calendarName: cal.name,
                calendarColor: getOutlookColor(cal.color),
                htmlLink: event.webLink,
                source: 'microsoft',
                sourceIcon: '🔵',
              }
            }) || []

            allEvents.push(...events)
          } catch (error) {
            console.error(`Error fetching events from Microsoft calendar ${cal.id}:`, error)
          }
        }

        allCalendars.push(...calendars.map((cal: any) => ({
          id: cal.id,
          summary: cal.name,
          name: cal.name,
          backgroundColor: getOutlookColor(cal.color),
          color: getOutlookColor(cal.color),
          canEdit: cal.canEdit,
          accessRole: 'owner',
          source: 'microsoft',
        })))
      } catch (error: any) {
        console.error('Error fetching Microsoft Calendar:', error?.message || error)
        const errorMessage = error?.message?.includes('token expired') 
          ? 'Microsoft token expired. Please reconnect your Microsoft account in Settings.'
          : 'Failed to fetch Microsoft Calendar'
        errors.push({ source: 'microsoft', error: errorMessage })
      }
    } else {
      errors.push({ source: 'microsoft', error: 'Microsoft account not connected' })
    }

    // Sort events by start time
    allEvents.sort((a, b) => {
      const aStart = new Date(a.start.dateTime || a.start.date).getTime()
      const bStart = new Date(b.start.dateTime || b.start.date).getTime()
      return aStart - bStart
    })

    const responseData = {
      events: allEvents,
      calendars: allCalendars,
      errors: errors.length > 0 ? errors : undefined,
      stats: {
        google: {
          events: allEvents.filter(e => e.source === 'google').length,
          calendars: allCalendars.filter(c => c.source === 'google').length,
          connected: !errors.find(e => e.source === 'google'),
        },
        microsoft: {
          events: allEvents.filter(e => e.source === 'microsoft').length,
          calendars: allCalendars.filter(c => c.source === 'microsoft').length,
          connected: !errors.find(e => e.source === 'microsoft'),
        },
      },
      cached: false,
      forceRefreshed: forceRefresh,
    }

    // Cache the response (only if not a force refresh)
    if (!forceRefresh) {
      await cache.set(cacheKey, responseData, cacheTTL.calendar)
      console.log('✓ Cached calendar data')
    } else {
      console.log('⚡ Fresh data returned (force refresh)')
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Error fetching calendar data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch calendar data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
