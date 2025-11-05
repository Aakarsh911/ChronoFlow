import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId, taskTitle, taskDescription, date, time, duration } = await request.json()

    if (!taskTitle || !date || !time || !duration) {
      return NextResponse.json({ 
        error: 'Missing required fields: taskTitle, date, time, duration' 
      }, { status: 400 })
    }

    // Get user with Google integration
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const googleIntegration = user.integrations.find((i: any) => i.provider === 'GOOGLE')

    if (!googleIntegration?.accessToken) {
      return NextResponse.json({ 
        error: 'Google Calendar not connected. Please connect your Google account first.' 
      }, { status: 400 })
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    oauth2Client.setCredentials({
      access_token: googleIntegration.accessToken,
      refresh_token: googleIntegration.refreshToken,
    })

    // Refresh token if needed
    const tokenInfo = await oauth2Client.getAccessToken()
    if (tokenInfo.token && tokenInfo.token !== googleIntegration.accessToken) {
      await prisma.integration.update({
        where: { id: googleIntegration.id },
        data: { accessToken: tokenInfo.token }
      })
    }

    // Create calendar event
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Parse date and time to create start and end times
    const startDateTime = new Date(`${date}T${time}`)
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000) // duration in minutes

    // Get user's timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const event = {
      summary: `🎯 Focus Time: ${taskTitle}`,
      description: taskDescription 
        ? `Focus session for task: ${taskTitle}\n\n${taskDescription}\n\nTask ID: ${taskId || 'N/A'}`
        : `Focus session for task: ${taskTitle}\n\nTask ID: ${taskId || 'N/A'}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: timeZone,
      },
      colorId: '9', // Blue color for focus time events
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
          { method: 'popup', minutes: 5 },
        ],
      },
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    return NextResponse.json({
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
    })

  } catch (error: any) {
    console.error('❌ Error creating calendar event:', error)
    
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return NextResponse.json({ 
        error: 'Google Calendar authorization expired. Please reconnect your Google account.' 
      }, { status: 401 })
    }

    return NextResponse.json({ 
      error: 'Failed to create calendar event',
      details: error.message 
    }, { status: 500 })
  }
}
