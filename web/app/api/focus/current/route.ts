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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { integrations: { where: { provider: 'MICROSOFT' } } },
    })

    if (!user || user.integrations.length === 0) {
      return NextResponse.json({ active: false })
    }

    const integration = user.integrations[0]
    let accessToken = integration.accessToken
    if (integration.expiresAt && new Date() >= integration.expiresAt) {
      if (integration.refreshToken) {
        accessToken = await refreshMicrosoftToken(integration.refreshToken, integration.id)
        if (!accessToken) {
          return NextResponse.json({ active: false, error: 'Token refresh failed' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ active: false }, { status: 200 })
      }
    }

    const client = getGraphClient(accessToken!)

    // Look for an ongoing Focus Block in a reasonable window (past 6h to next 8h)
    const now = new Date()
    const startWindow = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    const endWindow = new Date(now.getTime() + 8 * 60 * 60 * 1000)

    const resp = await client
      .api('/me/calendar/calendarView')
      .query({
        startDateTime: startWindow.toISOString(),
        endDateTime: endWindow.toISOString(),
      })
      .select('id,subject,start,end,showAs,categories,webLink,location')
      .top(100)
      .get()

    const events: any[] = resp.value || []
    const current = events.find((e) => {
      const start = new Date(e.start?.dateTime + 'Z')
      const end = new Date(e.end?.dateTime + 'Z')
      const isNow = start <= now && now < end
      const isBusy = e.showAs === 'busy'
      const isFocus = (e.subject?.toLowerCase?.().includes('focus') || (e.categories || []).includes('Focus') || e.location?.displayName === 'Focus Time')
      return isNow && isBusy && isFocus
    })

    if (!current) {
      return NextResponse.json({ active: false })
    }

    const end = new Date(current.end?.dateTime + 'Z')
    const remainingSeconds = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000))
    const durationMinutes = Math.max(1, Math.round((end.getTime() - new Date(current.start?.dateTime + 'Z').getTime()) / 60000))

    return NextResponse.json({
      active: true,
      eventId: current.id,
      subject: current.subject,
      start: current.start,
      end: current.end,
      webLink: current.webLink,
      remainingSeconds,
      durationMinutes,
    })
  } catch (error: any) {
    console.error('Focus current API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
