import { prisma } from '@/lib/prisma'
import { EventType, EventSource, SyncStatus } from '@prisma/client'

// Type definitions for external calendar events
export interface ExternalCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email?: string
    name?: string
    responseStatus?: string
  }>
  organizer?: {
    email?: string
    name?: string
  }
  htmlLink?: string
  hangoutLink?: string
  conferenceData?: any
  calendarId: string
  calendarName?: string
  source: 'google' | 'microsoft'
}

/**
 * Classify event type based on attendees and other metadata
 */
export function classifyEventType(event: ExternalCalendarEvent, userEmail: string): EventType {
  const attendees = event.attendees || []
  const hasExternalAttendees = attendees.length > 0 && 
    attendees.some(a => a.email && a.email.toLowerCase() !== userEmail.toLowerCase())
  
  // If there are external attendees, it's a meeting
  if (hasExternalAttendees) {
    return EventType.MEETING
  }
  
  // Check if event title suggests it's focus time
  const title = event.summary?.toLowerCase() || ''
  const focusKeywords = ['focus', 'deep work', 'coding', 'study', 'concentrate', 'do not disturb']
  if (focusKeywords.some(keyword => title.includes(keyword))) {
    return EventType.FOCUS_TIME
  }
  
  // Check if it's a task-related event
  const taskKeywords = ['task', 'todo', 'work on', 'complete', 'finish']
  if (taskKeywords.some(keyword => title.includes(keyword))) {
    return EventType.TASK
  }
  
  // Default to personal
  return EventType.PERSONAL
}

/**
 * Determine if an event can be managed (rescheduled) by the algorithm
 */
export function isEventManageable(event: ExternalCalendarEvent, userEmail: string, eventType: EventType): boolean {
  // Meetings with external attendees cannot be managed
  if (eventType === EventType.MEETING) {
    const attendees = event.attendees || []
    const hasExternalAttendees = attendees.some(
      a => a.email && a.email.toLowerCase() !== userEmail.toLowerCase()
    )
    if (hasExternalAttendees) {
      return false
    }
  }
  
  // Tasks and focus time can typically be managed
  if (eventType === EventType.TASK || eventType === EventType.FOCUS_TIME) {
    return true
  }
  
  // Personal events with no attendees can be managed
  const attendees = event.attendees || []
  return attendees.length === 0 || 
    (attendees.length === 1 && attendees[0].email?.toLowerCase() === userEmail.toLowerCase())
}

/**
 * Sync external calendar events to the database
 */
export async function syncEventsToDatabase(
  userId: string,
  userEmail: string,
  events: ExternalCalendarEvent[]
): Promise<{
  created: number
  updated: number
  unchanged: number
  errors: number
}> {
  let created = 0
  let updated = 0
  let unchanged = 0
  let errors = 0

  for (const event of events) {
    try {
      const source = event.source === 'google' ? EventSource.GOOGLE : EventSource.MICROSOFT
      
      // Parse start and end times
      const startTime = new Date(event.start.dateTime || event.start.date || '')
      const endTime = new Date(event.end.dateTime || event.end.date || '')
      const isAllDay = !event.start.dateTime
      
      // Classify the event
      const eventType = classifyEventType(event, userEmail)
      const isManaged = isEventManageable(event, userEmail, eventType)
      
      // Prepare attendees data
      const attendeesData = event.attendees?.map(a => ({
        email: a.email,
        name: a.name,
        responseStatus: a.responseStatus,
      })) || []
      
      // Check if event already exists
      const existing = await prisma.calendarEvent.findUnique({
        where: {
          userId_source_sourceId: {
            userId,
            source,
            sourceId: event.id,
          },
        },
      })

      const eventData = {
        userId,
        title: event.summary || '(No title)',
        description: event.description,
        startTime,
        endTime,
        isAllDay,
        location: event.location,
        timeZone: event.start.timeZone || 'UTC',
        attendees: attendeesData.length > 0 ? attendeesData : null,
        organizerEmail: event.organizer?.email,
        meetingUrl: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
        htmlLink: event.htmlLink,
        eventType,
        isManaged,
        source,
        sourceId: event.id,
        sourceCalendarId: event.calendarId,
        sourceData: event as any,
        lastSyncedAt: new Date(),
        syncStatus: SyncStatus.SYNCED,
      }

      if (existing) {
        // Check if we should update (don't overwrite local modifications)
        if (!existing.modifiedLocally) {
          // Check if anything actually changed
          const hasChanges = 
            existing.title !== eventData.title ||
            existing.startTime.getTime() !== eventData.startTime.getTime() ||
            existing.endTime.getTime() !== eventData.endTime.getTime() ||
            existing.location !== eventData.location

          if (hasChanges) {
            await prisma.calendarEvent.update({
              where: { id: existing.id },
              data: eventData,
            })
            updated++
          } else {
            // Just update the lastSyncedAt timestamp
            await prisma.calendarEvent.update({
              where: { id: existing.id },
              data: { lastSyncedAt: new Date() },
            })
            unchanged++
          }
        } else {
          // Event was modified locally, check for conflicts
          const externalModified = 
            existing.startTime.getTime() !== eventData.startTime.getTime() ||
            existing.endTime.getTime() !== eventData.endTime.getTime()
          
          if (externalModified) {
            // Conflict detected - mark it
            await prisma.calendarEvent.update({
              where: { id: existing.id },
              data: {
                syncStatus: SyncStatus.CONFLICT,
                syncError: 'Event was modified both locally and externally',
                lastSyncedAt: new Date(),
              },
            })
          }
          unchanged++
        }
      } else {
        // Create new event
        await prisma.calendarEvent.create({
          data: eventData,
        })
        console.log(`✅ Created event: ${eventData.title} (${eventData.startTime.toISOString()})`)
        created++
      }
    } catch (error) {
      console.error(`Error syncing event ${event.id}:`, error)
      errors++
    }
  }

  return { created, updated, unchanged, errors }
}

/**
 * Delete events that no longer exist in external calendar
 * Only deletes events within the synced date range to avoid deleting events
 * outside the current sync window
 */
export async function cleanupDeletedEvents(
  userId: string,
  source: EventSource,
  externalEventIds: string[],
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  // Build where clause
  const where: any = {
    userId,
    source,
    modifiedLocally: false, // Don't delete locally modified events
  }

  // Only consider events within the synced date range
  // This prevents deleting events outside the current sync window
  if (startDate && endDate) {
    where.AND = [
      { startTime: { gte: startDate } },
      { endTime: { lte: endDate } },
    ]
  }

  // Get events from this source within the date range
  const dbEvents = await prisma.calendarEvent.findMany({
    where,
    select: {
      id: true,
      sourceId: true,
      startTime: true,
      endTime: true,
      title: true,
    },
  })

  // Find events that are in DB but not in external calendar response
  const deletedEvents = dbEvents.filter(
    dbEvent => dbEvent.sourceId && !externalEventIds.includes(dbEvent.sourceId)
  )

  if (deletedEvents.length === 0) {
    return 0
  }

  console.log(`🗑️  Deleting ${deletedEvents.length} events that no longer exist in external calendar:`, 
    deletedEvents.map(e => e.title).slice(0, 5))

  // Delete them
  const result = await prisma.calendarEvent.deleteMany({
    where: {
      id: {
        in: deletedEvents.map(e => e.id),
      },
    },
  })

  return result.count
}

/**
 * Update or create calendar sync state
 */
export async function updateCalendarSyncState(
  userId: string,
  source: EventSource,
  calendarId: string,
  calendarName: string | undefined,
  success: boolean,
  error?: string,
  syncToken?: string,
  deltaLink?: string
): Promise<void> {
  const now = new Date()

  const existing = await prisma.calendarSync.findUnique({
    where: {
      userId_source_calendarId: {
        userId,
        source,
        calendarId,
      },
    },
  })

  const syncData: any = {
    userId,
    source,
    calendarId,
    calendarName,
    lastSyncedAt: now,
    updatedAt: now,
  }

  if (success) {
    syncData.lastSuccessfulSync = now
    syncData.consecutiveErrors = 0
    syncData.lastSyncError = null
    if (syncToken) syncData.syncToken = syncToken
    if (deltaLink) syncData.deltaLink = deltaLink
  } else {
    syncData.lastSyncError = error
    syncData.consecutiveErrors = (existing?.consecutiveErrors || 0) + 1
  }

  await prisma.calendarSync.upsert({
    where: {
      userId_source_calendarId: {
        userId,
        source,
        calendarId,
      },
    },
    update: syncData,
    create: {
      ...syncData,
      createdAt: now,
    },
  })
}

/**
 * Get events that need to be pushed back to external calendars
 */
export async function getEventsToPush(userId: string): Promise<any[]> {
  return prisma.calendarEvent.findMany({
    where: {
      userId,
      modifiedLocally: true,
      syncStatus: {
        in: [SyncStatus.PENDING, SyncStatus.ERROR],
      },
      source: {
        in: [EventSource.GOOGLE, EventSource.MICROSOFT],
      },
    },
    orderBy: {
      updatedAt: 'asc',
    },
  })
}

/**
 * Mark event as successfully synced
 */
export async function markEventSynced(eventId: string): Promise<void> {
  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      modifiedLocally: false,
      syncStatus: SyncStatus.SYNCED,
      syncError: null,
      lastSyncedAt: new Date(),
    },
  })
}

/**
 * Mark event sync as failed
 */
export async function markEventSyncFailed(eventId: string, error: string): Promise<void> {
  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      syncStatus: SyncStatus.ERROR,
      syncError: error,
      lastSyncedAt: new Date(),
    },
  })
}
