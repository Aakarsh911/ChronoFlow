import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { cache, cacheKeys } from '@/lib/redis'

// GET - Fetch a single calendar event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar event' },
      { status: 500 }
    )
  }
}

// PATCH - Update a calendar event (used by rescheduling algorithm)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if event exists and belongs to user
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event can be modified
    if (!existingEvent.isManaged) {
      return NextResponse.json(
        { error: 'This event cannot be rescheduled (it has external attendees or is marked as non-manageable)' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { startTime, endTime, title, description, location } = body

    // Prepare update data
    const updateData: any = {
      modifiedLocally: true,
      syncStatus: 'PENDING' as any,
      updatedAt: new Date(),
    }

    if (startTime) {
      updateData.startTime = new Date(startTime)
    }
    if (endTime) {
      updateData.endTime = new Date(endTime)
    }
    if (title !== undefined) {
      updateData.title = title
    }
    if (description !== undefined) {
      updateData.description = description
    }
    if (location !== undefined) {
      updateData.location = location
    }

    // Validate start time is before end time
    const finalStartTime = updateData.startTime || existingEvent.startTime
    const finalEndTime = updateData.endTime || existingEvent.endTime
    
    if (finalStartTime >= finalEndTime) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      )
    }

    // Update the event
    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: params.id },
      data: updateData,
    })

    // Invalidate calendar cache
    await cache.delPattern(cacheKeys.calendarUser(user.id))

    return NextResponse.json({
      event: updatedEvent,
      message: 'Event updated successfully. Changes will be synced to your calendar shortly.',
    })
  } catch (error) {
    console.error('Error updating calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a calendar event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if event exists and belongs to user
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event can be deleted
    if (!existingEvent.isManaged) {
      return NextResponse.json(
        { error: 'This event cannot be deleted (it has external attendees or is marked as non-manageable)' },
        { status: 403 }
      )
    }

    // Delete the event
    await prisma.calendarEvent.delete({
      where: { id: params.id },
    })

    // Invalidate calendar cache
    await cache.delPattern(cacheKeys.calendarUser(user.id))

    // TODO: Also delete from external calendar (Google/Microsoft)
    // This should be handled by the sync-push service

    return NextResponse.json({
      message: 'Event deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    )
  }
}
