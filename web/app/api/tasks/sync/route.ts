import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { deleteCache, deleteCachePattern } from "@/lib/redis"
import { prisma } from "@/lib/prisma"

// Helper function to extract plain text from Jira's Atlassian Document Format (ADF)
function extractTextFromADF(adf: any): string {
  if (!adf) return ""
  let text = ""
  
  function traverse(node: any) {
    if (!node) return
    if (node.text) text += node.text
    if (Array.isArray(node.content)) {
      node.content.forEach((child: any) => {
        traverse(child)
        if (child.type === "paragraph" || child.type === "heading") text += " "
      })
    }
  }
  
  traverse(adf)
  return text.trim()
}

async function getJiraSiteDetails(accessToken: string, integration: any): Promise<{ cloudId: string; siteUrl: string } | null> {
    const existing = integration?.data as any
    if (existing?.cloudId && existing?.siteUrl) {
      return { cloudId: existing.cloudId as string, siteUrl: existing.siteUrl as string }
    }
    const r = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    })
    if (!r.ok) return null
    const arr = await r.json()
    const first = Array.isArray(arr) ? arr.find((x: any) => x?.id && (x?.scopes?.includes?.("read:jira-work") || true)) : null
    if (first?.id && first?.url) {
      await prisma.integration.update({
        where: { userId_provider: { userId: integration.userId, provider: "JIRA" } },
        data: { data: { ...(integration.data as any), cloudId: first.id, siteUrl: first.url } },
      })
      return { cloudId: first.id, siteUrl: first.url }
    }
    return null
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
    await prisma.integration.update({
      where: { userId_provider: { userId: integration.userId, provider: "JIRA" } },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? integration.refreshToken,
        expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      },
    })
    return { accessToken: tokens.access_token }
}

export async function POST() {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: user.id, provider: "JIRA" } },
  })
  if (!integration?.accessToken) return NextResponse.json({ error: "Jira not integrated" }, { status: 400 })

  let accessToken = integration.accessToken
  if (integration.expiresAt && new Date() > integration.expiresAt) {
      const refreshed = await refreshJiraToken(integration)
      if (!refreshed) return NextResponse.json({ error: "Failed to refresh Jira token" }, { status: 500 })
      accessToken = refreshed.accessToken
  }

  const site = await getJiraSiteDetails(accessToken, integration)
  if (!site) return NextResponse.json({ error: "Failed to get Jira site details" }, { status: 500 })

  const base = `https://api.atlassian.com/ex/jira/${site.cloudId}/rest/api/3`
  const jql = encodeURIComponent("assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC")
  const url = `${base}/search/jql?jql=${jql}&maxResults=50&fields=summary,description,status,priority,assignee,duedate,project,timeoriginalestimate,timespent`

  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } })
  if (!resp.ok) {
      console.error("Failed to fetch from Jira:", await resp.text())
      return NextResponse.json({ error: "Failed to fetch issues from Jira" }, { status: 500 })
  }
  const data = await resp.json()

  const issues = data.issues || []
  let upsertedCount = 0
  const syncedSourceIds = new Set<string>()

  for (const issue of issues) {
    const f = issue.fields || {}
    const descriptionText = f.description ? extractTextFromADF(f.description) : ""

    syncedSourceIds.add(issue.key)

    // Check if task already exists
    const existingTask = await prisma.task.findUnique({
      where: { userId_source_sourceId: { userId: user.id, source: "JIRA", sourceId: issue.key } },
    })

    const jiraStatus = f.status?.name?.toLowerCase().includes("done") 
      ? "Done" 
      : f.status?.name?.toLowerCase().includes("progress") 
      ? "In Progress" 
      : "To Do"

    const taskData = {
      userId: user.id,
      title: f.summary,
      description: descriptionText,
      // Preserve local status if it exists and user has marked it done, otherwise use Jira status
      status: existingTask?.status === "Done" ? "Done" : jiraStatus,
      source: "JIRA",
      sourceId: issue.key,
      sourceData: issue,
      url: `${site.siteUrl}/browse/${issue.key}`,
      priority: f.priority?.name,
      dueDate: f.duedate ? new Date(f.duedate) : null,
      // Preserve existing completedAt if task was marked done locally
      completedAt: existingTask?.completedAt || (f.status?.name?.toLowerCase().includes("done") ? new Date(f.resolutiondate) : null),
    }

    await prisma.task.upsert({
      where: { userId_source_sourceId: { userId: user.id, source: "JIRA", sourceId: issue.key } },
      update: taskData,
      create: taskData,
    })
    upsertedCount++
  }

  // Delete tasks that are no longer in Jira (unassigned, resolved, or deleted)
  const deletedCount = await prisma.task.deleteMany({
    where: {
      userId: user.id,
      source: "JIRA",
      sourceId: {
        notIn: Array.from(syncedSourceIds),
      },
    },
  })

  // Invalidate tasks and jira cache after sync
  await deleteCache(`tasks:${user.id}`)
  await deleteCache(`jira:issues:${user.id}`)
  console.log('✓ Invalidated tasks and jira cache after sync')

  return NextResponse.json({ 
    message: `Synced ${upsertedCount} tasks from Jira.${deletedCount.count > 0 ? ` Removed ${deletedCount.count} tasks no longer assigned to you.` : ''}` 
  })
}
