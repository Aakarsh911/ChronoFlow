import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'
import { prisma } from '@/lib/prisma'

function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done: any) => {
      done(null, accessToken)
    },
  })
}

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
        scope: 'openid email profile offline_access User.Read Calendars.ReadWrite Calendars.ReadWrite.Shared OnlineMeetings.ReadWrite MailboxSettings.Read',
      }),
    })

    if (!response.ok) {
      console.error('Failed to refresh Microsoft token:', await response.text())
      return null
    }

    const data = await response.json()

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

    const { durationMinutes = 60, title = 'Focus Block', description = 'Deep work' } = await req.json().catch(() => ({}))

    // Fetch user and Microsoft integration
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          where: { provider: 'MICROSOFT' },
        },
      },
    })

    if (!user || user.integrations.length === 0) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 400 })
    }

    const integration = user.integrations[0]
    let accessToken = integration.accessToken

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

    const client = getGraphClient(accessToken!)

    const start = new Date()
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

    const eventBody = {
      subject: title,
      body: {
        contentType: 'HTML',
        content: description,
      },
      start: {
        dateTime: start.toISOString().replace('Z', ''),
        timeZone: 'UTC',
      },
      end: {
        dateTime: end.toISOString().replace('Z', ''),
        timeZone: 'UTC',
      },
      showAs: 'busy',
      sensitivity: 'normal',
      importance: 'low',
      isReminderOn: false,
      categories: ['Focus'],
      isOnlineMeeting: false,
      location: {
        displayName: 'Focus Time',
      },
    }

    const created = await client.api('/me/calendar/events').post(eventBody)

    return NextResponse.json({
      success: true,
      provider: 'MICROSOFT',
      eventId: created.id,
      webLink: created.webLink,
      start: created.start,
      end: created.end,
      title,
      durationMinutes,
    })
  } catch (error: any) {
    console.error('Focus start API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
