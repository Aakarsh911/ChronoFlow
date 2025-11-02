import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Provider } from '@prisma/client'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'
import { prisma } from '@/lib/prisma'

type Body = {
  accountIds: string[]
  startDateTime?: string
  endDateTime?: string
  availabilityViewInterval?: number
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as Body | null
    if (!body || !Array.isArray(body.accountIds) || body.accountIds.length === 0) {
      return NextResponse.json({ error: 'accountIds required' }, { status: 400 })
    }

    const start = body.startDateTime || new Date().toISOString()
    const end = body.endDateTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const interval = Math.min(Math.max(body.availabilityViewInterval || 30, 5), 60)

    // Current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { integrations: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Caller must have Microsoft connected
    const msIntegration = user.integrations.find((i: any) => i.provider === Provider.MICROSOFT)
    if (!msIntegration?.accessToken) {
      return NextResponse.json({ error: 'Connect Microsoft to fetch schedules' }, { status: 400 })
    }

    // Filter to only accountIds that belong to known app users (Integration rows)
    const integrations = await prisma.integration.findMany({
      where: {
        provider: Provider.MICROSOFT,
        accountId: { in: body.accountIds },
      },
      select: { accountId: true },
    })
    const allowedIds = new Set(integrations.map(i => i.accountId!).filter(Boolean))
    const targetIds = body.accountIds.filter(id => allowedIds.has(id))

    if (targetIds.length === 0) {
      return NextResponse.json({
        error: 'No matching Microsoft accounts found in app',
        requested: body.accountIds,
      }, { status: 404 })
    }

    // Refresh token if expired
    let accessToken = msIntegration.accessToken
    if (msIntegration.expiresAt && new Date() >= msIntegration.expiresAt) {
      if (!msIntegration.refreshToken) {
        return NextResponse.json({ error: 'Microsoft token expired and cannot be refreshed. Please reconnect.' }, { status: 401 })
      }
      const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.AZURE_AD_CLIENT_ID || '',
          client_secret: process.env.AZURE_AD_CLIENT_SECRET || '',
          refresh_token: msIntegration.refreshToken,
          grant_type: 'refresh_token',
          scope: 'openid email profile offline_access User.Read Calendars.Read Calendars.Read.Shared Calendars.ReadWrite Calendars.ReadWrite.Shared OnlineMeetings.Read OnlineMeetings.ReadWrite Mail.Read Mail.Send MailboxSettings.Read Chat.Read ChatMessage.Read ChannelMessage.Read.All Team.ReadBasic.All TeamMember.Read.All',
        }),
      })
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        return NextResponse.json({ error: 'Failed to refresh Microsoft token', details: txt }, { status: 401 })
      }
      const tokenData = await resp.json()
      accessToken = tokenData.access_token
      await prisma.integration.update({
        where: { id: msIntegration.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || msIntegration.refreshToken,
          expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
        },
      })
    }

    const client = Client.init({ authProvider: (done: any) => done(null, accessToken) })

    // Convert AAD ids to SMTP addresses (required by getSchedule)
    const emails: string[] = []
    for (const id of targetIds) {
      try {
        const u = await client.api(`/users/${id}`).select('mail,userPrincipalName').get()
        const email = (u.mail || u.userPrincipalName || '').toString().trim()
        if (email) emails.push(email)
      } catch (e) {
        // skip if user lookup fails
      }
    }

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No emails resolved for given accountIds' }, { status: 404 })
    }

    // Call getSchedule for free/busy
    const scheduleRes = await client.api('/me/calendar/getSchedule').post({
      schedules: emails,
      startTime: { dateTime: start, timeZone: 'UTC' },
      endTime: { dateTime: end, timeZone: 'UTC' },
      availabilityViewInterval: interval,
    })

    // Log a concise confirmation
    try {
      console.log(`✓ getSchedule fetched for ${emails.length} member(s). Window ${start} -> ${end}`)
    } catch {}

    return NextResponse.json({
      fetched: true,
      count: emails.length,
      range: { start, end },
      schedules: scheduleRes?.value || scheduleRes?.schedules || scheduleRes,
    })
  } catch (error) {
    console.error('Team schedule API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
