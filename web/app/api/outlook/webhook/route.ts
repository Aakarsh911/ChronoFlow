import { NextRequest, NextResponse } from "next/server"

// Microsoft Graph webhook validation endpoint
// This endpoint handles webhook notifications from Microsoft Graph for real-time email updates

export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const validationToken = searchParams.get("validationToken")

    // Step 1: Webhook validation - Microsoft sends this on subscription creation
    if (validationToken) {
      // Return the validation token in plain text with 200 status
      return new NextResponse(validationToken, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      })
    }

    // Step 2: Handle actual webhook notifications
    const body = await req.json()
    
    // Process the notification
    // body.value contains an array of notification objects
    console.log("Received Microsoft Graph webhook notification:", body)

    // In a production environment, you would:
    // 1. Validate the notification using clientState
    // 2. Process the notification (e.g., update cache, trigger real-time updates)
    // 3. Return 202 Accepted to acknowledge receipt

    return NextResponse.json({ status: "accepted" }, { status: 202 })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    )
  }
}

// Handle GET requests for webhook validation
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const validationToken = searchParams.get("validationToken")

  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    })
  }

  return NextResponse.json({ status: "ok" }, { status: 200 })
}
