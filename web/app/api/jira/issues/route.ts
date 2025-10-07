import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function refreshJiraToken(integration: any) {
  const clientId = process.env.JIRA_CLIENT_ID
  const clientSecret = process.env.JIRA_CLIENT_SECRET
  if (!clientId || !clientSecret || !integration?.refreshToken) return null
  const res = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refreshToken,
    }),
  })
  if (!res.ok) return null
  const tokens = await res.json()
  const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null
  await prisma.integration.update({
    where: { userId_provider: { userId: integration.userId, provider: "JIRA" } },
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

async function getCloudId(accessToken: string, integration: any) {
  const existing = (integration?.data as any)?.cloudId
  if (existing) return existing as string
  const r = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  })
  if (!r.ok) return null
  const arr = await r.json()
  const cloudId = Array.isArray(arr) && arr[0]?.id
  if (cloudId) {
    await prisma.integration.update({
      where: { userId_provider: { userId: integration.userId, provider: "JIRA" } },
      data: { data: { ...(integration.data as any), cloudId } },
    })
  }
  return cloudId ?? null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: user.id, provider: "JIRA" } },
  })
  if (!integration?.accessToken) return NextResponse.json({ issues: [] })

  let accessToken = integration.accessToken
  let cloudId = await getCloudId(accessToken, integration)
  if (!cloudId) {
    // Try refresh token then retry cloudId
    const refreshed = await refreshJiraToken(integration)
    if (!refreshed) return NextResponse.json({ issues: [] })
    accessToken = refreshed.accessToken
    cloudId = await getCloudId(accessToken, integration)
    if (!cloudId) return NextResponse.json({ issues: [] })
  }

  const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`
  const jql = encodeURIComponent("assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC")
  const url = `${base}/search/jql?jql=${jql}&maxResults=25&fields=summary,status,priority,assignee,duedate,project,timeoriginalestimate,timespent`

  let resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } })
  if (resp.status === 401 || resp.status === 403) {
    const refreshed = await refreshJiraToken(integration)
    if (refreshed) {
      accessToken = refreshed.accessToken
      resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } })
    }
  }
  if (!resp.ok) return NextResponse.json({ issues: [] })
  const data = await resp.json()

  const issues = (data.issues || []).map((it: any) => {
    const f = it.fields || {}
    return {
      id: it.id,
      key: it.key,
      summary: f.summary,
      statusName: f.status?.name,
      priorityName: f.priority?.name,
      assignee: f.assignee?.displayName || null,
      dueDate: f.duedate || null,
      timeOriginalEstimate: f.timeoriginalestimate || 0,
      timespent: f.timespent || 0,
      projectName: f.project?.name || null,
      url: `https://id.atlassian.com/login?continue=https://api.atlassian.com/ex/jira/${cloudId}/browse/${it.key}`,
    }
  })

  return NextResponse.json({ issues })
}
