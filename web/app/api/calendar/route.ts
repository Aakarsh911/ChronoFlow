import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date().toISOString()
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Build the base URL
    const baseUrl = request.url.split('/api/calendar')[0]

    // Fetch from both sources in parallel
    const [googleResponse, microsoftResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/calendar/google?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        },
      }),
      fetch(`${baseUrl}/api/calendar/microsoft?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        },
      }),
    ])

    const allEvents: any[] = []
    const allCalendars: any[] = []
    const errors: any[] = []

    // Process Google Calendar response
    if (googleResponse.status === 'fulfilled' && googleResponse.value.ok) {
      const googleData = await googleResponse.value.json()
      if (googleData.events) {
        allEvents.push(...googleData.events.map((event: any) => ({
          ...event,
          source: 'google',
          sourceIcon: '🟢',
        })))
      }
      if (googleData.calendars) {
        allCalendars.push(...googleData.calendars.map((cal: any) => ({
          ...cal,
          source: 'google',
        })))
      }
    } else if (googleResponse.status === 'fulfilled') {
      const errorData = await googleResponse.value.json()
      errors.push({ source: 'google', error: errorData.error })
    } else {
      errors.push({ source: 'google', error: 'Failed to fetch Google Calendar' })
    }

    // Process Microsoft Calendar response
    if (microsoftResponse.status === 'fulfilled' && microsoftResponse.value.ok) {
      const microsoftData = await microsoftResponse.value.json()
      if (microsoftData.events) {
        allEvents.push(...microsoftData.events.map((event: any) => ({
          ...event,
          source: 'microsoft',
          sourceIcon: '🔵',
        })))
      }
      if (microsoftData.calendars) {
        allCalendars.push(...microsoftData.calendars.map((cal: any) => ({
          ...cal,
          source: 'microsoft',
        })))
      }
    } else if (microsoftResponse.status === 'fulfilled') {
      const errorData = await microsoftResponse.value.json()
      errors.push({ source: 'microsoft', error: errorData.error })
    } else {
      errors.push({ source: 'microsoft', error: 'Failed to fetch Microsoft Calendar' })
    }

    // Sort events by start time
    allEvents.sort((a, b) => {
      const aStart = new Date(a.start.dateTime || a.start.date).getTime()
      const bStart = new Date(b.start.dateTime || b.start.date).getTime()
      return aStart - bStart
    })

    return NextResponse.json({
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
    })

  } catch (error) {
    console.error('Error fetching calendar data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch calendar data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
