/**
 * Test script for Calendar Sync Implementation
 * 
 * Run this to verify the calendar sync system is working correctly.
 * Make sure you're logged in and have connected at least one calendar.
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  success: boolean
  message: string
  data?: any
}

const results: TestResult[] = []

async function runTests() {
  console.log('🧪 Starting Calendar Sync Tests...\n')

  // Test 1: Sync from external calendars
  await testSyncFromExternal()

  // Test 2: Fetch events from database
  await testFetchEvents()

  // Test 3: Update an event (if manageable events exist)
  await testUpdateEvent()

  // Test 4: Push changes back to external
  await testPushSync()

  // Print results
  printResults()
}

async function testSyncFromExternal() {
  console.log('📥 Test 1: Syncing from external calendars...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/calendar/sync-from-external`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.ok && data.synced >= 0) {
      results.push({
        name: 'Sync from External',
        success: true,
        message: `Synced ${data.synced} events (${data.created} new, ${data.updated} updated)`,
        data,
      })
      console.log(`  ✅ Success: ${data.message}`)
    } else {
      results.push({
        name: 'Sync from External',
        success: false,
        message: data.error || 'Unknown error',
      })
      console.log(`  ❌ Failed: ${data.error}`)
    }
  } catch (error: any) {
    results.push({
      name: 'Sync from External',
      success: false,
      message: error.message,
    })
    console.log(`  ❌ Error: ${error.message}`)
  }

  console.log('')
}

async function testFetchEvents() {
  console.log('📅 Test 2: Fetching events from database...')
  
  try {
    const startDate = new Date().toISOString()
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const response = await fetch(
      `${BASE_URL}/api/calendar/events?startDate=${startDate}&endDate=${endDate}`
    )

    const data = await response.json()

    if (response.ok && Array.isArray(data.events)) {
      const managed = data.stats?.managed || 0
      const unmanaged = data.stats?.unmanaged || 0
      
      results.push({
        name: 'Fetch Events',
        success: true,
        message: `Found ${data.events.length} events (${managed} manageable, ${unmanaged} fixed)`,
        data,
      })
      console.log(`  ✅ Success: Found ${data.events.length} events`)
      console.log(`     - Manageable (can reschedule): ${managed}`)
      console.log(`     - Fixed (cannot reschedule): ${unmanaged}`)
      
      if (data.stats?.google) {
        console.log(`     - Google: ${data.stats.google.events} events`)
      }
      if (data.stats?.microsoft) {
        console.log(`     - Microsoft: ${data.stats.microsoft.events} events`)
      }
    } else {
      results.push({
        name: 'Fetch Events',
        success: false,
        message: data.error || 'Invalid response format',
      })
      console.log(`  ❌ Failed: ${data.error}`)
    }
  } catch (error: any) {
    results.push({
      name: 'Fetch Events',
      success: false,
      message: error.message,
    })
    console.log(`  ❌ Error: ${error.message}`)
  }

  console.log('')
}

async function testUpdateEvent() {
  console.log('✏️  Test 3: Updating a manageable event...')
  
  try {
    // First, fetch a manageable event
    const fetchResponse = await fetch(`${BASE_URL}/api/calendar/events`)
    const fetchData = await fetchResponse.json()
    
    const manageableEvent = fetchData.events?.find((e: any) => e.isManaged === true)
    
    if (!manageableEvent) {
      results.push({
        name: 'Update Event',
        success: true,
        message: 'Skipped: No manageable events found to test',
      })
      console.log(`  ⚠️  Skipped: No manageable events found`)
      console.log('')
      return
    }

    // Update the event (move it 1 hour later)
    const originalStart = new Date(manageableEvent.start.dateTime || manageableEvent.start.date)
    const newStart = new Date(originalStart.getTime() + 60 * 60 * 1000)
    const newEnd = new Date(newStart.getTime() + (
      new Date(manageableEvent.end.dateTime || manageableEvent.end.date).getTime() - originalStart.getTime()
    ))

    const updateResponse = await fetch(`${BASE_URL}/api/calendar/events/${manageableEvent.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      }),
    })

    const updateData = await updateResponse.json()

    if (updateResponse.ok) {
      results.push({
        name: 'Update Event',
        success: true,
        message: `Updated event "${manageableEvent.title}" - moved 1 hour later`,
        data: updateData,
      })
      console.log(`  ✅ Success: Updated "${manageableEvent.title}"`)
      console.log(`     - Old time: ${originalStart.toLocaleString()}`)
      console.log(`     - New time: ${newStart.toLocaleString()}`)
    } else {
      results.push({
        name: 'Update Event',
        success: false,
        message: updateData.error || 'Failed to update event',
      })
      console.log(`  ❌ Failed: ${updateData.error}`)
    }
  } catch (error: any) {
    results.push({
      name: 'Update Event',
      success: false,
      message: error.message,
    })
    console.log(`  ❌ Error: ${error.message}`)
  }

  console.log('')
}

async function testPushSync() {
  console.log('📤 Test 4: Pushing changes to external calendars...')
  
  try {
    const response = await fetch(`${BASE_URL}/api/calendar/sync-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.ok) {
      results.push({
        name: 'Push Sync',
        success: true,
        message: `${data.message} (${data.synced} synced, ${data.failed} failed)`,
        data,
      })
      console.log(`  ✅ Success: ${data.message}`)
      
      if (data.failed > 0 && data.errors) {
        console.log(`  ⚠️  Errors:`)
        data.errors.forEach((err: any) => {
          console.log(`     - ${err.eventId}: ${err.error}`)
        })
      }
    } else {
      results.push({
        name: 'Push Sync',
        success: false,
        message: data.error || 'Unknown error',
      })
      console.log(`  ❌ Failed: ${data.error}`)
    }
  } catch (error: any) {
    results.push({
      name: 'Push Sync',
      success: false,
      message: error.message,
    })
    console.log(`  ❌ Error: ${error.message}`)
  }

  console.log('')
}

function printResults() {
  console.log('═══════════════════════════════════════')
  console.log('📊 Test Results Summary')
  console.log('═══════════════════════════════════════\n')

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const total = results.length

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${result.name}`)
    console.log(`   ${result.message}\n`)
  })

  console.log('═══════════════════════════════════════')
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`)
  console.log('═══════════════════════════════════════\n')

  if (failed === 0) {
    console.log('🎉 All tests passed! Calendar sync system is working correctly.\n')
    console.log('Next steps:')
    console.log('1. Update your frontend to use /api/calendar/events')
    console.log('2. Set up cron jobs for automatic syncing')
    console.log('3. Build your rescheduling algorithm')
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.\n')
    console.log('Common issues:')
    console.log('- Make sure you are logged in')
    console.log('- Verify calendar integrations are connected')
    console.log('- Check database connection')
    console.log('- Review API logs for detailed errors')
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

export { runTests }
