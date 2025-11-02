import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

async function refreshJiraToken(integration: any) {
  const clientId = process.env.JIRA_CLIENT_ID
  const clientSecret = process.env.JIRA_CLIENT_SECRET
  if (!clientId || !clientSecret || !integration?.refreshToken) return null
  
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refreshToken,
    }),
  })
  
  if (!res.ok) return null
  const tokens = await res.json()
  const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
  
  await prisma.integration.update({
    where: { userId_provider: { userId: integration.userId, provider: 'JIRA' } },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? integration.refreshToken,
      scope: tokens.scope ?? integration.scope,
      expiresAt,
      data: { ...(integration.data as any), refreshedAt: new Date().toISOString() },
    },
  })
  
  return { accessToken: tokens.access_token }
}

async function getJiraSiteDetails(
  accessToken: string,
  integration: any,
): Promise<{ cloudId: string; siteUrl: string } | null> {
  const existing = integration?.data as any
  if (existing?.cloudId && existing?.siteUrl) {
    return { cloudId: existing.cloudId as string, siteUrl: existing.siteUrl as string }
  }

  const r = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  
  if (!r.ok) return null
  const arr = await r.json()
  const first = Array.isArray(arr) ? arr.find((x: any) => x?.id) : null
  const cloudId: string | undefined = first?.id
  let siteUrl: string | undefined = first?.url

  if (!siteUrl && cloudId) {
    const serverInfoRes = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/serverInfo`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
    )
    if (serverInfoRes.ok) {
      const info = await serverInfoRes.json().catch(() => null as any)
      siteUrl = info?.baseUrl
    }
  }

  if (cloudId && siteUrl) {
    await prisma.integration.update({
      where: { userId_provider: { userId: integration.userId, provider: 'JIRA' } },
      data: { data: { ...(integration.data as any), cloudId, siteUrl } },
    })
    return { cloudId, siteUrl }
  }

  return null
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'JIRA' } },
    })

    if (!integration?.accessToken) {
      return NextResponse.json({ projects: [] })
    }

    let accessToken = integration.accessToken
    let site = await getJiraSiteDetails(accessToken, integration)
    
    if (!site) {
      const refreshed = await refreshJiraToken(integration)
      if (!refreshed) {
        return NextResponse.json({ projects: [] })
      }
      accessToken = refreshed.accessToken
      site = await getJiraSiteDetails(accessToken, integration)
      if (!site) {
        return NextResponse.json({ projects: [] })
      }
    }

    // Fetch projects
    const projectsUrl = `https://api.atlassian.com/ex/jira/${site.cloudId}/rest/api/3/project`
    const projectsRes = await fetch(projectsUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })

    if (!projectsRes.ok) {
      return NextResponse.json({ projects: [] })
    }

    const projects = await projectsRes.json()
    
    // Return simplified project data
    const simplifiedProjects = projects.map((p: any) => ({
      id: p.id,
      key: p.key,
      name: p.name,
    }))

    return NextResponse.json({ projects: simplifiedProjects })
  } catch (error) {
    console.error('Error fetching Jira projects:', error)
    return NextResponse.json({ projects: [] })
  }
}

