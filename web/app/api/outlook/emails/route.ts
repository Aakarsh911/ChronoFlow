import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const prisma = new PrismaClient()

interface MicrosoftTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
}

async function refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftTokenResponse | null> {
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error("Missing Microsoft credentials")
    return null
  }

  try {
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "openid email profile offline_access User.Read Calendars.Read Mail.Read",
      }),
    })

    if (!tokenRes.ok) {
      console.error("Token refresh failed:", tokenRes.status)
      return null
    }

    return await tokenRes.json()
  } catch (error) {
    console.error("Error refreshing token:", error)
    return null
  }
}

async function getMicrosoftAccessToken(userId: string): Promise<string | null> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: "MICROSOFT" } },
  })

  if (!integration || !integration.accessToken) {
    return null
  }

  // Check if token is expired
  if (integration.expiresAt && integration.expiresAt < new Date()) {
    if (!integration.refreshToken) {
      return null
    }

    // Refresh the token
    const newTokens = await refreshMicrosoftToken(integration.refreshToken)
    if (!newTokens) {
      return null
    }

    // Update the integration with new tokens
    const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000)
    await prisma.integration.update({
      where: { userId_provider: { userId, provider: "MICROSOFT" } },
      data: {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || integration.refreshToken,
        expiresAt,
      },
    })

    return newTokens.access_token
  }

  return integration.accessToken
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = (session as any)?.user?.email as string | undefined

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const accessToken = await getMicrosoftAccessToken(user.id)
    if (!accessToken) {
      return NextResponse.json({ 
        error: "Microsoft integration not found or expired",
        needsAuth: true 
      }, { status: 401 })
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Fetch emails from Microsoft Graph API
    const graphUrl = `https://graph.microsoft.com/v1.0/me/messages?$filter=receivedDateTime ge ${today.toISOString()} and receivedDateTime lt ${tomorrow.toISOString()}&$orderby=receivedDateTime desc&$top=50&$select=id,subject,bodyPreview,from,receivedDateTime,isRead,hasAttachments,importance,flag`

    const response = await fetch(graphUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Microsoft Graph API error:", response.status, errorText)
      return NextResponse.json({ 
        error: "Failed to fetch emails",
        details: errorText 
      }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json({
      emails: data.value || [],
      count: data.value?.length || 0,
    })
  } catch (error) {
    console.error("Error fetching Outlook emails:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
