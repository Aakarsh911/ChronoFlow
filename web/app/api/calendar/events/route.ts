import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/calendar/events
 * Fetch calendar events from the database
 * This is the main endpoint that the frontend should use
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!)
      : new Date()
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    const includeManaged = searchParams.get('includeManaged') !== 'false'
    const includeUnmanaged = searchParams.get('includeUnmanaged') !== 'false'

    console.log(`📅 Fetching calendar events from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build where clause for filtering
    const where: any = {
      userId: user.id,
      AND: [
        { startTime: { lte: endDate } },
        { endTime: { gte: startDate } },
      ],
    }

    // Apply managed/unmanaged filter
    if (includeManaged && !includeUnmanaged) {
      where.isManaged = true
    } else if (!includeManaged && includeUnmanaged) {
      where.isManaged = false
    }

    // Fetch events from database
    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: {
        startTime: 'asc',
      },
    })

    // Get sync status separately
    const calendarSyncs = await prisma.calendarSync.findMany({
      where: { userId: user.id },
    })
    
    const googleSync = calendarSyncs.find((s: any) => s.source === 'GOOGLE')
    const microsoftSync = calendarSyncs.find((s: any) => s.source === 'MICROSOFT')
    
    const googleIntegration = user.integrations.find((i: any) => i.provider === 'GOOGLE')
    const microsoftIntegration = user.integrations.find((i: any) => i.provider === 'MICROSOFT')

    // Format events for frontend (similar to old format)
    const formattedEvents = events.map(event => ({
      id: event.id,
      summary: event.title,
      title: event.title,
      description: event.description,
      start: {
        dateTime: event.isAllDay ? undefined : event.startTime.toISOString(),
        date: event.isAllDay ? event.startTime.toISOString().split('T')[0] : undefined,
        timeZone: event.timeZone,
      },
      end: {
        dateTime: event.isAllDay ? undefined : event.endTime.toISOString(),
        date: event.isAllDay ? event.endTime.toISOString().split('T')[0] : undefined,
        timeZone: event.timeZone,
      },
      location: event.location,
      attendees: event.attendees,
      htmlLink: event.htmlLink,
      source: event.source.toLowerCase(),
      sourceIcon: event.source === 'GOOGLE' ? '🟢' : event.source === 'MICROSOFT' ? '🔵' : '⚪',
      eventType: event.eventType,
      isManaged: event.isManaged,
      modifiedLocally: event.modifiedLocally,
      syncStatus: event.syncStatus,
      calendarId: event.sourceCalendarId,
    }))

    // Calculate stats
    const stats = {
      google: {
        events: events.filter(e => e.source === 'GOOGLE').length,
        connected: !!googleIntegration,
        lastSynced: googleSync?.lastSuccessfulSync,
        syncError: googleSync?.lastSyncError,
      },
      microsoft: {
        events: events.filter(e => e.source === 'MICROSOFT').length,
        connected: !!microsoftIntegration,
        lastSynced: microsoftSync?.lastSuccessfulSync,
        syncError: microsoftSync?.lastSyncError,
      },
      total: events.length,
      managed: events.filter(e => e.isManaged).length,
      unmanaged: events.filter(e => !e.isManaged).length,
    }

    // Check if we need to trigger a sync
    const needsSync = shouldTriggerSync(googleSync, microsoftSync)

    return NextResponse.json({
      events: formattedEvents,
      stats,
      needsSync,
      message: needsSync ? 'Calendar data may be stale. Consider refreshing.' : undefined,
    })
  } catch (error) {
    console.error('Error fetching calendar events from database:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch calendar events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Check if we should trigger a background sync
 */
function shouldTriggerSync(googleSync: any, microsoftSync: any): boolean {
  const SYNC_THRESHOLD = 5 * 60 * 1000 // 5 minutes

  const now = Date.now()
  
  const googleNeedsSync = googleSync 
    ? (now - new Date(googleSync.lastSyncedAt || 0).getTime()) > SYNC_THRESHOLD
    : true

  const microsoftNeedsSync = microsoftSync
    ? (now - new Date(microsoftSync.lastSyncedAt || 0).getTime()) > SYNC_THRESHOLD
    : true

  return googleNeedsSync || microsoftNeedsSync
}
