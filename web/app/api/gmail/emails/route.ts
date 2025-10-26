import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient, Provider } from '@prisma/client'
import { google } from 'googleapis'
import { cache, cacheKeys, cacheTTL } from '@/lib/redis'

const prisma = new PrismaClient()

/**
 * Fetch Gmail emails for today
 * Uses Gmail API to get inbox messages
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Check cache first
    const todayStr = new Date().toISOString().split('T')[0]
    const cacheKey = cacheKeys.emails(user.id, todayStr)
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    
    console.log(`📧 Gmail emails API - forceRefresh: ${forceRefresh}`)
    
    if (forceRefresh) {
      // Invalidate cache when force refresh is requested
      await cache.del(cacheKey)
      console.log('✓ Gmail cache invalidated due to forceRefresh')
    } else {
      const cachedData = await cache.get(cacheKey)
      if (cachedData) {
        console.log('✓ Returning cached Gmail emails')
        return NextResponse.json({
          ...cachedData,
          cached: true,
        })
      }
    }

    const integration = user.integrations[0]
    
    // Check if token is expired and refresh proactively
    let accessToken: string | null = integration.accessToken
    let refreshToken: string | null | undefined = integration.refreshToken
    let shouldSkipGmail = false
    
    if (integration.expiresAt && new Date() >= new Date(integration.expiresAt)) {
      console.log('🔄 Gmail token expired, refreshing...')
      
      if (!integration.refreshToken) {
        console.error('❌ No refresh token available for Gmail')
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
        
        console.log('✅ Gmail token refreshed successfully')
      } catch (refreshError) {
        console.error('❌ Failed to refresh Gmail token:', refreshError)
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
          console.error('Failed to persist refreshed Gmail tokens', e)
        }
      })()
    })
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Get today's date for filtering
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const todaySeconds = Math.floor(todayDate.getTime() / 1000)

    // List messages from today
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: `in:inbox after:${todaySeconds}`,
      maxResults: 50,
    })

    const messages = listResponse.data.messages || []

    // Get profile to get historyId
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const historyId = profile.data.historyId

    // Fetch full message details for each message
    const emails = await Promise.all(
      messages.map(async (message) => {
        try {
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full',
          })

          const headers = msg.data.payload?.headers || []
          const subject = headers.find(h => h.name === 'Subject')?.value || '(No subject)'
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
          const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString()
          
          // Extract email address from "Name <email>" format
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

    const responseData = {
      emails: validEmails,
      historyId: historyId || null,
    }

    // Cache the response (only if not a force refresh)
    if (!forceRefresh) {
      await cache.set(cacheKey, responseData, cacheTTL.emails)
      console.log('✓ Cached Gmail emails')
    } else {
      console.log('⚡ Fresh Gmail data returned (force refresh)')
    }

    return NextResponse.json({
      ...responseData,
      cached: false,
      forceRefreshed: forceRefresh,
    })

  } catch (error) {
    console.error('Gmail API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
