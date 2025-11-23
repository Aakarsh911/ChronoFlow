import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/calendar/create-event
 * Create a new calendar event in the database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      timeZone,
      eventType,
      isManaged,
      isAllDay,
    } = body

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startTime, endTime' },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create event in database
    const event = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isAllDay: isAllDay || false,
        location: location || null,
        timeZone: timeZone || 'UTC',
        eventType: eventType || 'PERSONAL',
        isManaged: isManaged !== undefined ? isManaged : true,
        source: 'CHRONOFLOW',
        syncStatus: 'SYNCED', // ChronoFlow events are always synced locally
      },
    })

    console.log(`✅ Created event: ${event.title} (${event.id})`)

    return NextResponse.json({
      message: 'Event created successfully',
      event: {
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
      },
    })
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
