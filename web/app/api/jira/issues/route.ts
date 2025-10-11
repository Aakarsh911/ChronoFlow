import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client"
import { getCache, setCache, cacheKeys, cacheTTL } from "@/lib/redis"

const prisma = new PrismaClient()

// Helper function to extract plain text from Jira's Atlassian Document Format (ADF)
function extractTextFromADF(adf: any): string {
  if (!adf) return ""
  let text = ""
  
  function traverse(node: any) {
    if (!node) return
    
    // If node has text content, add it
    if (node.text) {
      text += node.text
    }
    
    // If node has content array, traverse children
    if (Array.isArray(node.content)) {
      node.content.forEach((child: any) => {
        traverse(child)
        // Add space after paragraphs and other block elements
        if (child.type === "paragraph" || child.type === "heading") {
          text += " "
        }
      })
    }
  }
  
  traverse(adf)
  return text.trim()
}

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

// Fetch Jira cloud/site details: cloudId and siteUrl (e.g., https://<site>.atlassian.net)
async function getJiraSiteDetails(
  accessToken: string,
  integration: any,
): Promise<{ cloudId: string; siteUrl: string } | null> {
  const existing = integration?.data as any
  if (existing?.cloudId && existing?.siteUrl) {
    return { cloudId: existing.cloudId as string, siteUrl: existing.siteUrl as string }
  }

  // 1) Try accessible resources (preferred; includes site base URL)
  const r = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  })
  if (!r.ok) return null
  const arr = await r.json()
  const first = Array.isArray(arr) ? arr.find((x: any) => x?.id && (x?.scopes?.includes?.("read:jira-work") || true)) : null
  const cloudId: string | undefined = first?.id
  // In Atlassian docs, `url` is the site base (e.g., https://example.atlassian.net)
  let siteUrl: string | undefined = first?.url

  // 2) If siteUrl missing, query serverInfo via API to discover baseUrl
  if (!siteUrl && cloudId) {
    const serverInfoRes = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/serverInfo`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } },
    )
    if (serverInfoRes.ok) {
      const info = await serverInfoRes.json().catch(() => null as any)
      siteUrl = info?.baseUrl
    }
  }

  if (cloudId && siteUrl) {
    await prisma.integration.update({
      where: { userId_provider: { userId: integration.userId, provider: "JIRA" } },
      data: { data: { ...(integration.data as any), cloudId, siteUrl } },
    })
    return { cloudId, siteUrl }
  }

  return null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cacheKey = cacheKeys.jiraIssues(user.id)

  // Check cache first
  const cachedIssues = await getCache(cacheKey)
  if (cachedIssues) {
    return NextResponse.json(cachedIssues)
  }

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: user.id, provider: "JIRA" } },
  })
  if (!integration?.accessToken) return NextResponse.json({ issues: [] })

  let accessToken = integration.accessToken
  let site = await getJiraSiteDetails(accessToken, integration)
  if (!site) {
    // Try refresh token then retry cloudId
    const refreshed = await refreshJiraToken(integration)
    if (!refreshed) return NextResponse.json({ issues: [] })
    accessToken = refreshed.accessToken
    site = await getJiraSiteDetails(accessToken, integration)
    if (!site) return NextResponse.json({ issues: [] })
  }

  const base = `https://api.atlassian.com/ex/jira/${site.cloudId}/rest/api/3`
  const jql = encodeURIComponent("assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC")
  const url = `${base}/search/jql?jql=${jql}&maxResults=25&fields=summary,description,status,priority,assignee,duedate,project,timeoriginalestimate,timespent`

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
    // Extract plain text from Jira's Atlassian Document Format (ADF) description
    let descriptionText = ""
    if (f.description?.content) {
      descriptionText = extractTextFromADF(f.description)
    }
    return {
      id: it.id,
      key: it.key,
      summary: f.summary,
      description: descriptionText,
      statusName: f.status?.name,
      priorityName: f.priority?.name,
      assignee: f.assignee?.displayName || null,
      dueDate: f.duedate || null,
      timeOriginalEstimate: f.timeoriginalestimate || 0,
      timespent: f.timespent || 0,
      projectName: f.project?.name || null,
  // Build a proper browse URL on the Jira site domain, not the API domain
  url: `${site!.siteUrl}/browse/${it.key}`,
    }
  })

  const result = { issues }

  // Cache for 10 minutes
  await setCache(cacheKey, result, cacheTTL.jiraIssues)

  return NextResponse.json(result)
}
