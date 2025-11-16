/**
 * Example Rescheduling Algorithm
 * 
 * This demonstrates how to use the calendar sync system
 * to reschedule manageable events (tasks, focus time)
 * around fixed events (meetings with others).
 */

interface CalendarEvent {
  id: string
  title: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  isManaged: boolean
  eventType: string
}

interface TimeSlot {
  start: Date
  end: Date
}

/**
 * Simple rescheduling algorithm example
 * 
 * Strategy:
 * 1. Fetch all events (managed + unmanaged)
 * 2. Find free time slots between fixed events
 * 3. Move manageable events to optimal times
 * 4. Push changes back to external calendars
 */
export async function rescheduleEvents(
  startDate: Date,
  endDate: Date,
  workHoursStart: number = 9,  // 9 AM
  workHoursEnd: number = 17,   // 5 PM
): Promise<{ rescheduled: number; errors: string[] }> {
  const errors: string[] = []
  
  try {
    // Step 1: Fetch all calendar events
    console.log('📅 Fetching calendar events...')
    const response = await fetch(`/api/calendar/events?` + new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }))
    
    const { events } = await response.json()
    
    // Step 2: Separate manageable and fixed events
    const manageableEvents = events.filter((e: CalendarEvent) => e.isManaged)
    const fixedEvents = events.filter((e: CalendarEvent) => !e.isManaged)
    
    console.log(`  Found ${manageableEvents.length} manageable events`)
    console.log(`  Found ${fixedEvents.length} fixed events (constraints)`)
    
    if (manageableEvents.length === 0) {
      console.log('  No events to reschedule')
      return { rescheduled: 0, errors: [] }
    }
    
    // Step 3: Find free time slots
    const freeSlots = findFreeTimeSlots(
      fixedEvents,
      startDate,
      endDate,
      workHoursStart,
      workHoursEnd
    )
    
    console.log(`  Found ${freeSlots.length} free time slots`)
    
    // Step 4: Assign manageable events to free slots
    const assignments = assignEventsToSlots(manageableEvents, freeSlots)
    
    console.log(`  Assigned ${assignments.length} events to optimal slots`)
    
    // Step 5: Update events in database
    let rescheduled = 0
    for (const assignment of assignments) {
      try {
        const updateResponse = await fetch(`/api/calendar/events/${assignment.eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: assignment.newStart.toISOString(),
            endTime: assignment.newEnd.toISOString(),
          }),
        })
        
        if (updateResponse.ok) {
          rescheduled++
          console.log(`  ✅ Rescheduled: ${assignment.title}`)
        } else {
          const error = await updateResponse.json()
          errors.push(`Failed to reschedule ${assignment.title}: ${error.error}`)
          console.log(`  ❌ Failed: ${assignment.title}`)
        }
      } catch (error: any) {
        errors.push(`Error rescheduling ${assignment.title}: ${error.message}`)
      }
    }
    
    // Step 6: Trigger push sync to external calendars
    console.log('\n📤 Pushing changes to external calendars...')
    await fetch('/api/calendar/sync-push', { method: 'POST' })
    
    console.log(`\n✅ Rescheduling complete: ${rescheduled} events updated`)
    
    return { rescheduled, errors }
    
  } catch (error: any) {
    console.error('Error in rescheduling algorithm:', error)
    errors.push(error.message)
    return { rescheduled: 0, errors }
  }
}

/**
 * Find free time slots between fixed events
 */
function findFreeTimeSlots(
  fixedEvents: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  workHoursStart: number,
  workHoursEnd: number
): TimeSlot[] {
  const freeSlots: TimeSlot[] = []
  
  // Convert fixed events to time blocks
  const busyBlocks = fixedEvents
    .map(event => ({
      start: new Date(event.start.dateTime || event.start.date || ''),
      end: new Date(event.end.dateTime || event.end.date || ''),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  
  // Iterate through each day in the range
  let currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    // Skip weekends (optional)
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1)
      continue
    }
    
    // Define work hours for this day
    const dayStart = new Date(currentDate)
    dayStart.setHours(workHoursStart, 0, 0, 0)
    
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(workHoursEnd, 0, 0, 0)
    
    // Find free slots within this day
    let slotStart = dayStart
    
    for (const busyBlock of busyBlocks) {
      // Check if busy block is on this day
      if (busyBlock.start >= dayEnd || busyBlock.end <= dayStart) {
        continue
      }
      
      // If there's a gap before this busy block
      if (slotStart < busyBlock.start) {
        const gapEnd = busyBlock.start < dayEnd ? busyBlock.start : dayEnd
        
        // Only add if gap is at least 30 minutes
        if ((gapEnd.getTime() - slotStart.getTime()) >= 30 * 60 * 1000) {
          freeSlots.push({
            start: new Date(slotStart),
            end: new Date(gapEnd),
          })
        }
      }
      
      // Move slot start to end of busy block
      if (busyBlock.end > slotStart) {
        slotStart = new Date(busyBlock.end)
      }
    }
    
    // Check if there's time left at end of day
    if (slotStart < dayEnd) {
      if ((dayEnd.getTime() - slotStart.getTime()) >= 30 * 60 * 1000) {
        freeSlots.push({
          start: new Date(slotStart),
          end: new Date(dayEnd),
        })
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return freeSlots
}

/**
 * Assign manageable events to free time slots
 * 
 * Strategy: First-fit algorithm
 * TODO: Implement more sophisticated algorithms (e.g., priority-based, deadline-aware)
 */
function assignEventsToSlots(
  events: CalendarEvent[],
  freeSlots: TimeSlot[]
): Array<{
  eventId: string
  title: string
  newStart: Date
  newEnd: Date
  originalStart: Date
  originalEnd: Date
}> {
  const assignments: any[] = []
  
  // Sort events by priority (you can customize this)
  // For now, sort by original start time
  const sortedEvents = [...events].sort((a, b) => {
    const aStart = new Date(a.start.dateTime || a.start.date || '').getTime()
    const bStart = new Date(b.start.dateTime || b.start.date || '').getTime()
    return aStart - bStart
  })
  
  // Track which slots are already used
  const usedSlots: Array<{ start: Date; end: Date }> = []
  
  for (const event of sortedEvents) {
    const originalStart = new Date(event.start.dateTime || event.start.date || '')
    const originalEnd = new Date(event.end.dateTime || event.end.date || '')
    const duration = originalEnd.getTime() - originalStart.getTime()
    
    // Find first available slot that fits this event
    for (const slot of freeSlots) {
      const availableStart = getNextAvailableTime(slot.start, usedSlots)
      const availableEnd = new Date(availableStart.getTime() + duration)
      
      // Check if event fits in this slot
      if (availableEnd <= slot.end) {
        // Check if this slot is not already used
        const overlaps = usedSlots.some(used => 
          (availableStart < used.end && availableEnd > used.start)
        )
        
        if (!overlaps) {
          // Assign event to this slot
          assignments.push({
            eventId: event.id,
            title: event.title,
            newStart: availableStart,
            newEnd: availableEnd,
            originalStart,
            originalEnd,
          })
          
          // Mark this time as used
          usedSlots.push({
            start: availableStart,
            end: availableEnd,
          })
          
          break
        }
      }
    }
  }
  
  return assignments
}

/**
 * Get next available time within a slot, considering already used times
 */
function getNextAvailableTime(
  slotStart: Date,
  usedSlots: Array<{ start: Date; end: Date }>
): Date {
  let availableTime = new Date(slotStart)
  
  // Check if this time overlaps with any used slot
  for (const used of usedSlots) {
    if (availableTime >= used.start && availableTime < used.end) {
      availableTime = new Date(used.end)
    }
  }
  
  return availableTime
}

/**
 * Example usage:
 */
export async function exampleUsage() {
  console.log('🚀 Starting automatic rescheduling...\n')
  
  // Reschedule events for the next 7 days
  const startDate = new Date()
  const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  
  const result = await rescheduleEvents(
    startDate,
    endDate,
    9,  // Work hours: 9 AM
    17  // to 5 PM
  )
  
  console.log(`\n📊 Results:`)
  console.log(`  - Rescheduled: ${result.rescheduled} events`)
  console.log(`  - Errors: ${result.errors.length}`)
  
  if (result.errors.length > 0) {
    console.log(`\n❌ Errors:`)
    result.errors.forEach(error => console.log(`  - ${error}`))
  }
  
  return result
}
