import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Provider } from '@prisma/client'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

/**
 * Sync Gmail emails using history
 * Only fetches changes since last sync
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const historyId = searchParams.get('historyId')

    if (!historyId) {
      return NextResponse.json({ error: 'Missing historyId' }, { status: 400 })
    }

    // Get user and Google integration from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          where: { provider: Provider.GOOGLE },
        },
      },
    })

    if (!user || !user.integrations.length) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 401 })
    }

    const integration = user.integrations[0]
    
    // Check if token is expired and refresh proactively
    let accessToken: string | null = integration.accessToken
    let refreshToken: string | null | undefined = integration.refreshToken
    
    if (integration.expiresAt && new Date() >= new Date(integration.expiresAt)) {
      console.log('🔄 Gmail sync token expired, refreshing...')
      
      if (!integration.refreshToken) {
        console.error('❌ No refresh token available for Gmail sync')
        return NextResponse.json({ 
          error: 'Token expired. Please reconnect your Google account.',
          needsReauth: true 
        }, { status: 401 })
      }
      
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
        
        // Update tokens in database
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            accessToken: credentials.access_token || integration.accessToken,
            refreshToken: credentials.refresh_token || integration.refreshToken,
            expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          },
        })
        
        console.log('✅ Gmail sync token refreshed successfully')
      } catch (refreshError) {
        console.error('❌ Failed to refresh Gmail sync token:', refreshError)
        return NextResponse.json({ 
          error: 'Failed to refresh token. Please reconnect your Google account.',
          needsReauth: true 
        }, { status: 401 })
      }
    }
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    // Initialize Gmail API with both access and refresh tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
    })

    // Handle token refresh automatically
    oauth2Client.on('tokens', (tokens: any) => {
      void (async () => {
        try {
          if (tokens.access_token || tokens.refresh_token || tokens.expiry_date) {
            await prisma.integration.update({
              where: { id: integration.id },
              data: {
                accessToken: tokens.access_token ?? integration.accessToken,
                refreshToken: tokens.refresh_token ?? integration.refreshToken,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : integration.expiresAt,
              },
            })
          }
        } catch (e) {
          console.error('Failed to persist refreshed Gmail sync tokens', e)
        }
      })()
    })
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Get history since last sync
    const historyResponse = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
    })

    const history = historyResponse.data.history || []
    const newHistoryId = historyResponse.data.historyId

    // Process history changes
    const changedMessageIds = new Set<string>()
    const deletedMessageIds = new Set<string>()

    history.forEach(item => {
      if (item.messagesAdded) {
        item.messagesAdded.forEach(msg => {
          if (msg.message?.id) changedMessageIds.add(msg.message.id)
        })
      }
      if (item.messagesDeleted) {
        item.messagesDeleted.forEach(msg => {
          if (msg.message?.id) deletedMessageIds.add(msg.message.id)
        })
      }
      if (item.labelsAdded || item.labelsRemoved) {
        if (item.labelsAdded) {
          item.labelsAdded.forEach(msg => {
            if (msg.message?.id) changedMessageIds.add(msg.message.id)
          })
        }
        if (item.labelsRemoved) {
          item.labelsRemoved.forEach(msg => {
            if (msg.message?.id) changedMessageIds.add(msg.message.id)
          })
        }
      }
    })

    // Fetch details for changed messages
    const emails = await Promise.all(
      Array.from(changedMessageIds).map(async (messageId) => {
        try {
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
          })

          const headers = msg.data.payload?.headers || []
          const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)'
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
          const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString()
          
          const emailMatch = from.match(/<(.+?)>/)
          const fromEmail = emailMatch ? emailMatch[1] : from
          const fromName = from.replace(/<.+?>/, '').trim() || fromEmail

          return {
            id: msg.data.id!,
            threadId: msg.data.threadId!,
            snippet: msg.data.snippet || '',
            subject,
            from: {
              name: fromName,
              address: fromEmail,
            },
            receivedDateTime: new Date(date).toISOString(),
            bodyPreview: msg.data.snippet || '',
            isRead: !msg.data.labelIds?.includes('UNREAD'),
            hasAttachments: msg.data.payload?.parts?.some(part => part.filename) || false,
            isStarred: msg.data.labelIds?.includes('STARRED') || false,
            labels: msg.data.labelIds || [],
            provider: 'gmail' as const,
          }
        } catch (err) {
          console.error('Error fetching message:', err)
          return null
        }
      })
    )

    const validEmails = emails.filter(e => e !== null)

    return NextResponse.json({
      emails: validEmails,
      deleted: Array.from(deletedMessageIds),
      historyId: newHistoryId || historyId,
    })

  } catch (error) {
    console.error('Gmail history sync error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
