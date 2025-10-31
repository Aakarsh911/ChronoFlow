import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Client } from '@microsoft/microsoft-graph-client'
import { prisma } from '@/lib/prisma'
import 'isomorphic-fetch'

// Helper function to get Microsoft Graph client
function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done: any) => {
      done(null, accessToken)
    },
  })
}

// Helper function to refresh Microsoft token
async function refreshMicrosoftToken(refreshToken: string, integrationId: string): Promise<string | null> {
  try {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'openid email profile offline_access User.Read Calendars.ReadWrite Calendars.ReadWrite.Shared OnlineMeetings.ReadWrite Mail.Send MailboxSettings.Read Team.ReadBasic.All TeamMember.Read.All',
      }),
    })

    if (!response.ok) {
      console.error('Failed to refresh Microsoft token:', await response.text())
      return null
    }

    const data = await response.json()
    
    // Update tokens in database
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      },
    })

    return data.access_token
  } catch (error) {
    console.error('Error refreshing Microsoft token:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get meeting data from request
    const meetingData = await req.json()

    console.log('Creating meeting:', meetingData)

    // Get user's ChronoFlow account
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          where: { provider: 'MICROSOFT' },
        },
      },
    })

    if (!user || !user.integrations.length) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 400 })
    }

    const integration = user.integrations[0]
    let accessToken = integration.accessToken

    // Check if token is expired and refresh if needed
    if (integration.expiresAt && new Date() >= integration.expiresAt) {
      if (integration.refreshToken) {
        accessToken = await refreshMicrosoftToken(integration.refreshToken, integration.id)
        if (!accessToken) {
          return NextResponse.json({ error: 'Failed to refresh access token' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Access token expired and no refresh token available' }, { status: 401 })
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 })
    }

    // Initialize Graph client
    const client = getGraphClient(accessToken)

    // Ensure attendees are properly formatted
    const eventPayload = {
      ...meetingData,
    }

    console.log('Creating event with attendees:', meetingData.attendees?.length || 0)
    console.log('Event payload:', JSON.stringify(eventPayload, null, 2))

    // Create the meeting/event on the organizer's calendar
    // By default, Microsoft Graph sends meeting invitations to all attendees when you create an event
    // No additional flag needed - invitations are sent automatically when attendees are present
    const event = await client
      .api('/me/events')
      .header('Prefer', 'outlook.timezone="UTC"')
      .post(eventPayload)

    console.log('Meeting created successfully:', event.id)
    console.log('Invitations sent to attendees:', event.attendees?.length || 0)
    
    // Log each attendee for debugging
    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach((att: any, index: number) => {
        console.log(`Attendee ${index + 1}:`, att.emailAddress?.address, '- Status:', att.status?.response || 'none')
      })
    }

    return NextResponse.json({ 
      success: true, 
      event: event,
      message: `Meeting created and invitations sent to ${event.attendees?.length || 0} attendee(s)`
    })
  } catch (error: any) {
    console.error('Create meeting API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 })
  }
}
