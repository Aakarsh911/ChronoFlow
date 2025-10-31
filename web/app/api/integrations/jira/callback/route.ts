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
  if (!code) return NextResponse.redirect(new URL("/settings?error=jira_no_code", req.url))

  const clientId = process.env.JIRA_CLIENT_ID
  const clientSecret = process.env.JIRA_CLIENT_SECRET
  const redirectUri = process.env.JIRA_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("Jira env missing", { hasId: !!clientId, hasSecret: !!clientSecret, hasRedirect: !!redirectUri })
    return NextResponse.redirect(new URL("/settings?error=jira_env", req.url))
  }

  try {
    const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })
    if (!tokenRes.ok) {
      const t = await tokenRes.text().catch(() => "")
      console.error("Jira token exchange failed:", tokenRes.status, t)
      return NextResponse.redirect(new URL("/settings?error=jira_token", req.url))
    }
    const tokens = await tokenRes.json()
    if (!tokens?.access_token) {
      console.error("Jira token payload missing access_token", tokens)
      return NextResponse.redirect(new URL("/settings?error=jira_payload", req.url))
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.error("Jira user not found for email", email)
      return NextResponse.redirect(new URL("/settings?error=jira_user", req.url))
    }

    const expiresAt: Date | null = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null

    // Use delegate if available; otherwise fallback to raw SQL upsert to avoid Prisma Client mismatch during dev HMR
    const hasDelegate = (prisma as any).integration && typeof (prisma as any).integration.upsert === "function"
    if (hasDelegate) {
      await (prisma as any).integration.upsert({
        where: { userId_provider: { userId: user.id, provider: "JIRA" } },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          scope: tokens.scope,
          expiresAt,
          data: tokens,
        },
        create: {
          id: randomUUID(),
          userId: user.id,
          provider: "JIRA",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          scope: tokens.scope,
          expiresAt,
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
           "data"=EXCLUDED."data",
           "updatedAt"=NOW()`,
        randomUUID(),
        user.id,
        "JIRA",
        tokens.access_token,
        tokens.refresh_token ?? null,
        tokens.scope ?? null,
        expiresAt,
        null,
        JSON.stringify(tokens),
      )
    }

    return NextResponse.redirect(new URL("/settings?connected=jira", req.url))
  } catch (e) {
    console.error("Jira callback error", e)
    return NextResponse.redirect(new URL("/settings?error=jira", req.url))
  }
}
