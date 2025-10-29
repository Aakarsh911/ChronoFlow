import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/microsoft/callback`
  
  const scope = encodeURIComponent([
    "openid",
    "email",
    "profile",
    "offline_access",
    "User.Read",
    // Calendar permissions: include ReadWrite so we can create focus blocks/events
    "Calendars.Read",
    "Calendars.Read.Shared",
    "Calendars.ReadWrite",
    "Calendars.ReadWrite.Shared",
    // Online meetings
    "OnlineMeetings.Read",
    "OnlineMeetings.ReadWrite",
    "Mail.Read",
    "Mail.Send",
    "MailboxSettings.Read",
  ].join(" "))

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Missing Microsoft env" }, { status: 500 })
  }

  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_mode=query&prompt=consent`

  return NextResponse.redirect(url)
}
