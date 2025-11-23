import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/calendar/debug
 * Debug endpoint to check calendar sync status
 */
export async function GET(request: NextRequest) {
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

    // Get all events
    const allEvents = await prisma.calendarEvent.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        source: true,
        sourceId: true,
        sourceCalendarId: true,
        eventType: true,
        isManaged: true,
        syncStatus: true,
        lastSyncedAt: true,
        createdAt: true,
      },
      orderBy: { startTime: 'desc' },
      take: 20, // Last 20 events
    })

    // Get sync status
    const calendarSyncs = await prisma.calendarSync.findMany({
      where: { userId: user.id },
    })

    // Get integrations
    const integrations = user.integrations.map(i => ({
      provider: i.provider,
      hasAccessToken: !!i.accessToken,
      hasRefreshToken: !!i.refreshToken,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }))

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      integrations,
      calendarSyncs: calendarSyncs.map(s => ({
        source: s.source,
        calendarId: s.calendarId,
        calendarName: s.calendarName,
        lastSyncedAt: s.lastSyncedAt,
        lastSuccessfulSync: s.lastSuccessfulSync,
        syncEnabled: s.syncEnabled,
        lastSyncError: s.lastSyncError,
      })),
      events: {
        total: allEvents.length,
        bySource: {
          google: allEvents.filter(e => e.source === 'GOOGLE').length,
          microsoft: allEvents.filter(e => e.source === 'MICROSOFT').length,
          chronoflow: allEvents.filter(e => e.source === 'CHRONOFLOW').length,
        },
        latest: allEvents,
      },
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch debug info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

