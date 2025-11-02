import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.redirect(new URL("/login", req.url))

  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  if (!code) return NextResponse.redirect(new URL("/settings?error=microsoft_no_code", req.url))

  const clientId = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/microsoft/callback`

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("Microsoft env missing", { hasId: !!clientId, hasSecret: !!clientSecret, hasRedirect: !!redirectUri })
    return NextResponse.redirect(new URL("/settings?error=microsoft_env", req.url))
  }

  try {
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "openid email profile offline_access User.Read Calendars.Read Calendars.Read.Shared Calendars.ReadWrite Calendars.ReadWrite.Shared OnlineMeetings.Read OnlineMeetings.ReadWrite Mail.Read Mail.Send MailboxSettings.Read Chat.Read ChatMessage.Read ChannelMessage.Read.All",
      }),
    })
    
    if (!tokenRes.ok) {
      const t = await tokenRes.text().catch(() => "")
      console.error("Microsoft token exchange failed:", tokenRes.status, t)
      return NextResponse.redirect(new URL("/settings?error=microsoft_token", req.url))
    }
    
    const tokens = await tokenRes.json()
    if (!tokens?.access_token) {
      console.error("Microsoft token payload missing access_token", tokens)
      return NextResponse.redirect(new URL("/settings?error=microsoft_payload", req.url))
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.error("Microsoft user not found for email", email)
      return NextResponse.redirect(new URL("/settings?error=microsoft_user", req.url))
    }

    const expiresAt: Date | null = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null

    // Fetch the AAD account ID from Microsoft Graph (/me)
    let accountId: string | null = null
    try {
      const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (meRes.ok) {
        const me = await meRes.json()
        accountId = me?.id ?? null
      } else {
        const t = await meRes.text().catch(() => '')
        console.warn('Microsoft Graph /me failed:', meRes.status, t)
      }
    } catch (e) {
      console.warn('Microsoft Graph /me error', e)
    }

    // Use delegate if available; otherwise fallback to raw SQL upsert
    const hasDelegate = (prisma as any).integration && typeof (prisma as any).integration.upsert === "function"
    if (hasDelegate) {
      await (prisma as any).integration.upsert({
        where: { userId_provider: { userId: user.id, provider: "MICROSOFT" } },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          scope: tokens.scope,
          expiresAt,
          accountId: accountId,
          data: tokens,
        },
        create: {
          id: randomUUID(),
          userId: user.id,
          provider: "MICROSOFT",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          scope: tokens.scope,
          expiresAt,
          accountId: accountId,
          data: tokens,
        },
      })
    } else {
      // Raw UPSERT using Postgres ON CONFLICT (userId, provider)
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Integration" ("id","userId","provider","accessToken","refreshToken","scope","expiresAt","accountId","data","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW(),NOW())
         ON CONFLICT ("userId","provider") DO UPDATE SET
           "accessToken"=EXCLUDED."accessToken",
           "refreshToken"=EXCLUDED."refreshToken",
           "scope"=EXCLUDED."scope",
           "expiresAt"=EXCLUDED."expiresAt",
           "accountId"=EXCLUDED."accountId",
           "data"=EXCLUDED."data",
           "updatedAt"=NOW()`,
        randomUUID(),
        user.id,
        "MICROSOFT",
        tokens.access_token,
        tokens.refresh_token ?? null,
        tokens.scope ?? null,
        expiresAt,
        accountId,
        JSON.stringify(tokens),
      )
    }

    // Log for observability when connecting from Settings
    try {
      console.log(`✓ Microsoft connected via Settings: user=${email} accountId=${accountId ?? 'null'}`)
    } catch {}

    return NextResponse.redirect(new URL("/settings?connected=microsoft", req.url))
  } catch (e) {
    console.error("Microsoft callback error", e)
    return NextResponse.redirect(new URL("/settings?error=microsoft", req.url))
  }
}
