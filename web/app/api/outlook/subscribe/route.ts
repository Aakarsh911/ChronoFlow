import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const prisma = new PrismaClient()

async function getMicrosoftAccessToken(userId: string): Promise<string | null> {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: "MICROSOFT" } },
  })

  if (!integration || !integration.accessToken) {
    return null
  }

  // Check if token is expired and refresh if needed
  if (integration.expiresAt && integration.expiresAt < new Date()) {
    // Token refresh logic would go here
    // For now, just return null if expired
    return null
  }

  return integration.accessToken
}

// Subscribe to email notifications
export async function POST(req: NextRequest) {
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
      return NextResponse.json(
        { error: "Microsoft integration not found or expired" },
        { status: 401 }
      )
    }

    // Create a webhook subscription
    const notificationUrl = `${process.env.NEXTAUTH_URL}/api/outlook/webhook`
    
    // Subscription expires in 3 days (maximum for mail resources)
    const expirationDateTime = new Date()
    expirationDateTime.setDate(expirationDateTime.getDate() + 3)

    const subscription = {
      changeType: "created,updated",
      notificationUrl,
      resource: "me/mailFolders('Inbox')/messages",
      expirationDateTime: expirationDateTime.toISOString(),
      clientState: process.env.WEBHOOK_CLIENT_STATE || "secretClientState",
    }

    const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Failed to create subscription:", response.status, errorText)
      return NextResponse.json(
        { 
          error: "Failed to create email subscription",
          details: errorText 
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Store the subscription ID in the database for later reference
    // You might want to extend your schema to store webhook subscriptions

    return NextResponse.json({
      success: true,
      subscriptionId: data.id,
      expirationDateTime: data.expirationDateTime,
    })
  } catch (error) {
    console.error("Error creating email subscription:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Get current subscription status
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
      return NextResponse.json(
        { error: "Microsoft integration not found or expired" },
        { status: 401 }
      )
    }

    // List all subscriptions
    const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      subscriptions: data.value || [],
    })
  } catch (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
