import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.JIRA_CLIENT_ID
  const redirectUri = process.env.JIRA_REDIRECT_URI
  const scope = encodeURIComponent([
    "read:jira-user",
    "read:jira-work",
    "read:me",
    "offline_access",
  ].join(" "))

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Missing JIRA env" }, { status: 500 })
  }

  const url = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${encodeURIComponent(clientId)}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&prompt=consent`;

  return NextResponse.redirect(url)
}
