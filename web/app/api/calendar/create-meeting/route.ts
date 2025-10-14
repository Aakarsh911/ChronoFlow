import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

const prisma = new PrismaClient()

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

    // Create the meeting/event
    const event = await client
      .api('/me/calendar/events')
      .post(meetingData)

    console.log('Meeting created successfully:', event.id)

    return NextResponse.json({ 
      success: true, 
      event: event,
      message: 'Meeting created and invitations sent successfully'
    })
  } catch (error: any) {
    console.error('Create meeting API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 })
  }
}
