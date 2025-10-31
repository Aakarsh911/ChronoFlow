import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient, Provider } from '@prisma/client'
import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'
import { cache, cacheTTL } from '@/lib/redis'

const prisma = new PrismaClient()

// Cache key helper
const cacheKeyForUser = (userId: string) => `teams:members:${userId}`

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user and Microsoft integration
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { integrations: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const msIntegration = user.integrations.find((i: any) => i.provider === Provider.MICROSOFT)
    if (!msIntegration?.accessToken) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 400 })
    }

    // Check cache first
    const { searchParams } = new URL(req.url)
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    if (!forceRefresh) {
      const cached = await cache.get<any>(cacheKeyForUser(user.id))
      if (cached) {
        return NextResponse.json({ ...cached, cached: true })
      }
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
          scope: 'openid email profile offline_access User.Read Calendars.Read Calendars.Read.Shared OnlineMeetings.Read Mail.Read Mail.Send MailboxSettings.Read Team.ReadBasic.All TeamMember.Read.All',
        }),
      })

      if (!resp.ok) {
        const txt = await resp.text()
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

    // Graph client
    const client = Client.init({
      authProvider: (done: any) => done(null, accessToken),
    })

    // Get teams joined by the user
    let teams: any[] = []
    try {
      const teamsResp = await client.api('/me/joinedTeams').select('id,displayName').get()
      teams = teamsResp.value || []
    } catch (e: any) {
      // If missing scope, return clear guidance
      if (e?.statusCode === 403) {
        return NextResponse.json({
          error: 'Insufficient permissions to read Teams.',
          requiredScopes: ['Team.ReadBasic.All', 'TeamMember.Read.All'],
          action: 'Ask your Microsoft 365 admin to grant these app permissions and re-connect Microsoft.',
        }, { status: 403 })
      }
      throw e
    }

    // Fetch members for each team (limit to first 5 teams to keep costs low)
    const seen: Record<string, boolean> = {}
    const members: Array<{ id: string; displayName: string; email?: string; jobTitle?: string; teamIds: string[] }> = []

    const teamsToProcess = teams.slice(0, 5)
    for (const t of teamsToProcess) {
      try {
        const memResp = await client.api(`/teams/${t.id}/members`).get()
        const convMembers = memResp.value || []

        // For each member, enrich with user details
        for (const m of convMembers) {
          const userId = m.userId || m?.user?.id
          const displayName = m.displayName || m?.user?.displayName || 'Unknown'
          if (!userId) continue

          if (!seen[userId]) {
            seen[userId] = true
            let email: string | undefined
            let jobTitle: string | undefined
            
            // Try to get email from member object first (fallback)
            const memberEmail = m.email || m?.user?.email || m?.user?.mail || m?.user?.userPrincipalName
            
            try {
              const userObj = await client.api(`/users/${userId}`).select('id,displayName,mail,userPrincipalName,jobTitle').get()
              email = userObj.mail || userObj.userPrincipalName || memberEmail
              jobTitle = userObj.jobTitle || undefined
              console.log(`✓ Fetched user details for ${displayName}: email=${email}`)
            } catch (err: any) {
              console.warn(`⚠️  Failed to fetch user details for ${displayName} (${userId}):`, err?.message || 'Unknown error')
              // Fallback to member email if user lookup fails
              email = memberEmail
              if (email) {
                console.log(`  ↳ Using fallback email from member object: ${email}`)
              }
            }

            members.push({ id: userId, displayName, email, jobTitle, teamIds: [t.id] })
          } else {
            // Append team membership
            const existing = members.find(mm => mm.id === userId)
            if (existing && !existing.teamIds.includes(t.id)) existing.teamIds.push(t.id)
          }
        }
      } catch (err: any) {
        // Skip team on error but continue others
        if (err?.statusCode === 403) {
          // Member read needs TeamMember.Read.All
          return NextResponse.json({
            error: 'Insufficient permissions to read Team members.',
            requiredScopes: ['TeamMember.Read.All'],
            action: 'Ask your Microsoft 365 admin to grant this app permission and re-connect Microsoft.',
          }, { status: 403 })
        }
        console.error('Failed to fetch members for team', t?.id, err?.message || err)
      }
    }

    const payload = {
      teams: teamsToProcess.map(t => ({ id: t.id, displayName: t.displayName })),
      members,
      cached: false,
    }

    await cache.set(cacheKeyForUser(user.id), payload, cacheTTL.integrations || 600)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Teams members API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
