import { NextRequest, NextResponse } from 'next/server'
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

  // Get accessible resources
  const r = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  
  if (!r.ok) return null
  const arr = await r.json()
  const first = Array.isArray(arr) ? arr.find((x: any) => x?.id && (x?.scopes?.includes?.('read:jira-work') || true)) : null
  const cloudId: string | undefined = first?.id
  let siteUrl: string | undefined = first?.url

  // If siteUrl missing, query serverInfo
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectKey, title, description, priority, storyPoints } = await request.json()

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    if (!projectKey) {
      return NextResponse.json({ error: 'Project key is required' }, { status: 400 })
    }

    // Get user from database
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
      return NextResponse.json(
        { error: 'Jira integration not found. Please connect Jira first.' },
        { status: 400 }
      )
    }

    let accessToken = integration.accessToken
    let site = await getJiraSiteDetails(accessToken, integration)
    
    if (!site) {
      // Try refresh token then retry cloudId
      const refreshed = await refreshJiraToken(integration)
      if (!refreshed) {
        return NextResponse.json({ error: 'Failed to authenticate with Jira' }, { status: 401 })
      }
      accessToken = refreshed.accessToken
      site = await getJiraSiteDetails(accessToken, integration)
      if (!site) {
        return NextResponse.json({ error: 'Failed to get Jira site details' }, { status: 500 })
      }
    }

    // Create Jira issue using ADF format for description
    // Start with minimal required fields
    const issueData: any = {
      fields: {
        project: {
          key: projectKey,
        },
        summary: title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description,
                },
              ],
            },
          ],
        },
        issuetype: {
          name: 'Task',
        },
      },
    }

    // Try to add priority if provided - it may not be available on all screens
    if (priority) {
      const priorityMap: Record<string, string> = {
        High: 'High',
        Medium: 'Medium',
        Low: 'Low',
      }
      const jiraPriority = priorityMap[priority]
      if (jiraPriority) {
        issueData.fields.priority = { name: jiraPriority }
      }
    }

    // Try to add story points if provided - custom field varies by instance
    // We'll attempt the most common field IDs
    if (storyPoints && storyPoints > 0) {
      // Try common story points field names - we'll include it but Jira will ignore if not available
      issueData.fields['customfield_10016'] = storyPoints // Most common for Scrum
      // Some instances use different field IDs, but we can't know which without querying
    }

    const createUrl = `https://api.atlassian.com/ex/jira/${site.cloudId}/rest/api/3/issue`
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(issueData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Jira API error:', errorText)
      
      // If it's a field error, try again without optional fields
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.errors && (errorData.errors.priority || errorData.errors.customfield_10016)) {
          console.log('Retrying without optional fields (priority/story points)...')
          
          // Create minimal issue without optional fields
          const minimalIssueData = {
            fields: {
              project: { key: projectKey },
              summary: title,
              description: issueData.fields.description,
              issuetype: { name: 'Task' },
            },
          }
          
          const retryResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(minimalIssueData),
          })
          
          if (retryResponse.ok) {
            const result = await retryResponse.json()
            const issueKey = result.key
            const issueUrl = `${site.siteUrl}/browse/${issueKey}`
            
            return NextResponse.json({
              key: issueKey,
              url: issueUrl,
              success: true,
              warning: 'Priority and story points could not be set (not available in project configuration)',
            })
          }
        }
      } catch (e) {
        // If parsing fails, continue with original error
      }
      
      return NextResponse.json(
        { error: 'Failed to create Jira ticket' },
        { status: response.status }
      )
    }

    const result = await response.json()
    const issueKey = result.key
    const issueUrl = `${site.siteUrl}/browse/${issueKey}`

    return NextResponse.json({
      key: issueKey,
      url: issueUrl,
      success: true,
    })
  } catch (error) {
    console.error('Error creating Jira ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

