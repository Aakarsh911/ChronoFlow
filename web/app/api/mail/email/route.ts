import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Provider } from '@prisma/client'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

/**
 * Fetch full email content by ID
 * Supports both Gmail and Outlook
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') as 'gmail' | 'outlook'
    const emailId = searchParams.get('id')

    if (!provider || !['gmail', 'outlook'].includes(provider) || !emailId) {
      return NextResponse.json({ error: 'Invalid provider or email ID' }, { status: 400 })
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

    // Handle token refresh for both providers
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
          refreshToken = credentials.refresh_token || integration.refreshToken
          
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
            error: 'Failed to refresh token. Please reconnect your Google account.',
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
              error: 'Failed to refresh token. Please reconnect your Microsoft account.',
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
            error: 'Failed to refresh token. Please reconnect your Microsoft account.',
            needsReauth: true 
          }, { status: 401 })
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    if (provider === 'gmail') {
      // Fetch full Gmail message
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

      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full',
      })

      const headers = msg.data.payload?.headers || []
      const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)'
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
      const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString()
      const to = headers.find(h => h.name === 'To')?.value || ''
      const cc = headers.find(h => h.name === 'Cc')?.value || ''
      const bcc = headers.find(h => h.name === 'Bcc')?.value || ''
      
      const emailMatch = from.match(/<(.+?)>/)
      const fromEmail = emailMatch ? emailMatch[1] : from
      const fromName = from.replace(/<.+?>/, '').trim() || fromEmail

      // Extract email body
      let bodyText = ''
      let bodyHtml = ''
      
      const extractBody = (part: any): void => {
        if (part.body?.data) {
          const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8')
          if (part.mimeType === 'text/html') {
            bodyHtml = decoded
          } else if (part.mimeType === 'text/plain') {
            bodyText = decoded
          }
        }
        
        if (part.parts) {
          part.parts.forEach(extractBody)
        }
      }
      
      extractBody(msg.data.payload)

      return NextResponse.json({
        id: msg.data.id!,
        subject,
        from: {
          name: fromName,
          address: fromEmail,
        },
        to,
        cc,
        bcc,
        date: new Date(date).toISOString(),
        bodyText,
        bodyHtml,
        isRead: !msg.data.labelIds?.includes('UNREAD'),
        hasAttachments: msg.data.payload?.parts?.some(part => part.filename) || false,
        isStarred: msg.data.labelIds?.includes('STARRED') || false,
        provider: 'gmail' as const,
      })
    } else {
      // Fetch full Outlook message
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${emailId}?$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,body,bodyPreview,isRead,hasAttachments,importance,webLink`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const error = await response.text()
        return NextResponse.json(
          { error: 'Failed to fetch email', details: error },
          { status: response.status }
        )
      }

      const email = await response.json()

      return NextResponse.json({
        id: email.id,
        subject: email.subject,
        from: {
          name: email.from.emailAddress.name,
          address: email.from.emailAddress.address,
        },
        to: email.toRecipients?.map((r: any) => r.emailAddress.address).join(', ') || '',
        cc: email.ccRecipients?.map((r: any) => r.emailAddress.address).join(', ') || '',
        bcc: email.bccRecipients?.map((r: any) => r.emailAddress.address).join(', ') || '',
        date: email.receivedDateTime,
        bodyText: email.body?.contentType === 'text' ? email.body.content : '',
        bodyHtml: email.body?.contentType === 'html' ? email.body.content : email.bodyPreview || '',
        isRead: email.isRead,
        hasAttachments: email.hasAttachments,
        importance: email.importance,
        webLink: email.webLink,
        provider: 'outlook' as const,
      })
    }

  } catch (error) {
    console.error('Email fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

