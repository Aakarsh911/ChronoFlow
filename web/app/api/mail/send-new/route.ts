import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Provider } from '@prisma/client'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

/**
 * Send a new email via Gmail or Outlook
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, subject, body, provider } = await request.json()

    if (!to || !subject || !body || !provider || !['gmail', 'outlook'].includes(provider)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user and integration
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          where: { provider: provider === 'gmail' ? Provider.GOOGLE : Provider.MICROSOFT },
        },
      },
    })

    if (!user || !user.integrations.length) {
      return NextResponse.json({ error: `${provider} account not connected` }, { status: 401 })
    }

    const integration = user.integrations[0]

    // Handle token refresh
    let accessToken: string | null = integration.accessToken
    let refreshToken: string | null | undefined = integration.refreshToken

    if (integration.expiresAt && new Date() >= new Date(integration.expiresAt)) {
      if (!integration.refreshToken) {
        return NextResponse.json({ 
          error: 'Token expired. Please reconnect your account.',
          needsReauth: true 
        }, { status: 401 })
      }

      if (provider === 'gmail') {
        const oauth2ClientRefresh = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        )
        
        oauth2ClientRefresh.setCredentials({
          refresh_token: integration.refreshToken,
        })

        try {
          const { credentials } = await oauth2ClientRefresh.refreshAccessToken()
          accessToken = credentials.access_token || integration.accessToken
          
          await prisma.integration.update({
            where: { id: integration.id },
            data: {
              accessToken: credentials.access_token || integration.accessToken,
              refreshToken: credentials.refresh_token || integration.refreshToken,
              expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
            },
          })
        } catch (refreshError) {
          return NextResponse.json({ 
            error: 'Failed to refresh token.',
            needsReauth: true 
          }, { status: 401 })
        }
      } else {
        // Outlook token refresh
        try {
          const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.MICROSOFT_CLIENT_ID!,
              client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
              refresh_token: integration.refreshToken,
              grant_type: 'refresh_token',
            }),
          })

          if (!tokenResponse.ok) {
            return NextResponse.json({ 
              error: 'Failed to refresh token.',
              needsReauth: true 
            }, { status: 401 })
          }

          const tokens = await tokenResponse.json()
          accessToken = tokens.access_token
          
          await prisma.integration.update({
            where: { id: integration.id },
            data: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token || integration.refreshToken,
              expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            },
          })
        } catch (refreshError) {
          return NextResponse.json({ 
            error: 'Failed to refresh token.',
            needsReauth: true 
          }, { status: 401 })
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    if (provider === 'gmail') {
      // Send via Gmail
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXTAUTH_URL + '/api/auth/callback/google'
      )

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
      })

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      // Create email message
      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        body
      ]

      const email = emailLines.join('\r\n')
      const encodedEmail = Buffer.from(email).toString('base64url')

      // Send the email
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
        },
      })

      console.log(`✅ Sent new Gmail email to ${to}`)

      return NextResponse.json({ success: true, provider: 'gmail' })
    } else {
      // Send via Outlook
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/sendMail',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              subject: subject,
              body: {
                contentType: 'Text',
                content: body,
              },
              toRecipients: [
                {
                  emailAddress: {
                    address: to,
                  },
                },
              ],
            },
            saveToSentItems: true,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Failed to send Outlook email:', error)
        return NextResponse.json(
          { error: 'Failed to send email', details: error },
          { status: response.status }
        )
      }

      console.log(`✅ Sent new Outlook email to ${to}`)

      return NextResponse.json({ success: true, provider: 'outlook' })
    }

  } catch (error) {
    console.error('Send new email error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

