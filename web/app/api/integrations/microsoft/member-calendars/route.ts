import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient, Provider } from '@prisma/client'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

const prisma = new PrismaClient()

type Body = {
  accountIds: string[]
  startDateTime?: string
  endDateTime?: string
}

async function withRefreshedToken(integration: any) {
  // Returns a valid access token, refreshing if needed, and persists updates
  let accessToken = integration.accessToken as string | null
  const expired = integration.expiresAt && new Date() >= new Date(integration.expiresAt)
  if (!accessToken || expired) {
    if (!integration.refreshToken) return null
    const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID || '',
        client_secret: process.env.AZURE_AD_CLIENT_SECRET || '',
        refresh_token: integration.refreshToken,
        grant_type: 'refresh_token',
        scope: 'openid email profile offline_access User.Read Calendars.Read Calendars.Read.Shared OnlineMeetings.Read Mail.Read Mail.Send MailboxSettings.Read',
      }),
    })
    if (!resp.ok) return null
    const data = await resp.json()
    accessToken = data.access_token
    try {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || integration.refreshToken,
          expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
        },
      })
    } catch {}
  }
  return accessToken
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

    // Map accountIds -> Integration -> per-user token
    const integrations = await prisma.integration.findMany({
      where: { provider: Provider.MICROSOFT, accountId: { in: body.accountIds } },
      select: { id: true, userId: true, accountId: true, accessToken: true, refreshToken: true, expiresAt: true },
    })

    const results: Array<{ accountId: string; appUserId?: string; ok: boolean; error?: string; events?: any[] }> = []

    await Promise.all(
      body.accountIds.map(async (accId) => {
        const integ = integrations.find(i => i.accountId === accId)
        if (!integ) {
          results.push({ accountId: accId, ok: false, error: 'No Integration found for this accountId' })
          return
        }

        const token = await withRefreshedToken(integ)
        if (!token) {
          results.push({ accountId: accId, appUserId: integ.userId, ok: false, error: 'Unable to get a valid token' })
          return
        }

        const client = Client.init({ authProvider: (done: any) => done(null, token) })
        try {
          const resp = await client
            .api('/me/calendarView')
            .header('Prefer', 'outlook.timezone="UTC"')
            .query({
              startDateTime: start,
              endDateTime: end,
              $select: 'subject,bodyPreview,start,end,isAllDay,webLink,location,organizer',
              $orderby: 'start/dateTime',
              $top: 100,
            })
            .get()
          const events = (resp?.value || []).map((e: any) => ({
            id: e.id,
            subject: e.subject,
            start: e.start,
            end: e.end,
            isAllDay: e.isAllDay,
            webLink: e.webLink,
            location: e.location?.displayName,
            organizer: e.organizer?.emailAddress?.address,
          }))
          results.push({ accountId: accId, appUserId: integ.userId, ok: true, events })
        } catch (e: any) {
          results.push({ accountId: accId, appUserId: integ.userId, ok: false, error: e?.message || 'Graph error' })
        }
      })
    )

    try {
      const okCount = results.filter(r => r.ok).length
      console.log(`✓ member-calendars fetched: ${okCount}/${results.length} succeeded for window ${start} -> ${end}`)
    } catch {}

    return NextResponse.json({
      fetched: true,
      window: { start, end },
      results,
    })
  } catch (error) {
    console.error('member-calendars API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
