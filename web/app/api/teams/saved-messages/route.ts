import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { Provider } from '@prisma/client'

/**
 * Fetch saved Teams messages for the user
 * GET /api/teams/saved-messages
 * 
 * Only fetches messages that the user has explicitly saved/bookmarked in Teams
 * This respects user privacy by not reading all their chat history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and Microsoft integration
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          where: { provider: Provider.MICROSOFT },
        },
      },
    })

    if (!user || !user.integrations.length) {
      return NextResponse.json({ 
        error: 'Microsoft account not connected. Please connect your Microsoft account to use Teams integration.' 
      }, { status: 401 })
    }

    const integration = user.integrations[0]

    // Check if token is expired and refresh if needed
    let accessToken = integration.accessToken
    const now = new Date()
    
    if (integration.expiresAt && now >= integration.expiresAt) {
      console.log('🔄 Microsoft token expired, refreshing...')
      
      if (!integration.refreshToken) {
        return NextResponse.json({ 
          error: 'Token expired and cannot be refreshed. Please reconnect your Microsoft account.',
          needsReauth: true
        }, { status: 401 })
      }

      try {
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID || '',
            client_secret: process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET || '',
            refresh_token: integration.refreshToken,
            grant_type: 'refresh_token',
            scope: 'openid email profile offline_access User.Read Calendars.Read Calendars.Read.Shared Calendars.ReadWrite Calendars.ReadWrite.Shared OnlineMeetings.Read OnlineMeetings.ReadWrite Mail.Read Mail.Send MailboxSettings.Read Chat.Read ChatMessage.Read ChannelMessage.Read.All Team.ReadBasic.All TeamMember.Read.All',
          }),
        })

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          console.error('❌ Token refresh failed:', errorText)
          return NextResponse.json({ 
            error: 'Failed to refresh token',
            details: errorText,
            needsReauth: true
          }, { status: 401 })
        }

        const tokenData = await tokenResponse.json()
        accessToken = tokenData.access_token

        // Update integration with new tokens
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || integration.refreshToken,
            expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          },
        })

        console.log('✅ Microsoft token refreshed successfully')
      } catch (refreshError) {
        console.error('❌ Failed to refresh Microsoft token:', refreshError)
        return NextResponse.json({ 
          error: 'Failed to refresh token. Please reconnect your Microsoft account.',
          needsReauth: true 
        }, { status: 401 })
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    console.log('📱 [Teams] Fetching recent messages...')

    const messages: any[] = []

    // Step 1: Get user's joined Teams
    const teamsUrl = `https://graph.microsoft.com/v1.0/me/joinedTeams`
    
    const teamsResponse = await fetch(teamsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!teamsResponse.ok) {
      const error = await teamsResponse.text()
      console.error('❌ [Teams] Graph API error:', error)
      
      if (teamsResponse.status === 403) {
        return NextResponse.json({ 
          error: 'Teams access not granted. Please reconnect your Microsoft account with Teams permissions.',
          needsReauth: true
        }, { status: 403 })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch Teams', details: error },
        { status: teamsResponse.status }
      )
    }

    const teamsData = await teamsResponse.json()
    const teams = teamsData.value || []
    
    console.log(`✅ [Teams] Found ${teams.length} joined teams`)

    // Step 2: For each team, get channels and fetch all messages (no date filter)
    for (const team of teams) {
      try {
        // Get channels in this team
        const channelsUrl = `https://graph.microsoft.com/v1.0/teams/${team.id}/channels`
        
        const channelsResponse = await fetch(channelsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json()
          const channels = channelsData.value || []
          
          console.log(`  📂 [Team: ${team.displayName}] Found ${channels.length} channels`)

          // Fetch messages from each channel
          for (const channel of channels) {
            try {
              // Fetch channel messages
              const messagesUrl = `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/${channel.id}/messages?$top=50`
              
              const messagesResponse = await fetch(messagesUrl, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              })

              if (messagesResponse.ok) {
                const messagesData = await messagesResponse.json()
                const channelMessages = messagesData.value || []
                
                // Add context to each message
                channelMessages.forEach((msg: any) => {
                  msg.teamId = team.id
                  msg.teamName = team.displayName
                  msg.channelId = channel.id
                  msg.channelName = channel.displayName
                  msg.isChannel = true
                })
                
                messages.push(...channelMessages)
                
                if (channelMessages.length > 0) {
                  console.log(`    ✅ [Channel: ${channel.displayName}] Found ${channelMessages.length} messages`)
                }
              }
            } catch (error) {
              console.error(`    ❌ Error fetching messages from channel ${channel.displayName}:`, error)
            }
          }
        }
      } catch (error) {
        console.error(`  ❌ Error fetching channels for team ${team.displayName}:`, error)
      }
    }

    // Step 3: Also get 1-on-1 and group chats
    const chatsUrl = `https://graph.microsoft.com/v1.0/me/chats?$top=20`

    const chatsResponse = await fetch(chatsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (chatsResponse.ok) {
      const chatsData = await chatsResponse.json()
      const chats = chatsData.value || []
      
      console.log(`💬 [Chats] Found ${chats.length} active chats`)

      for (const chat of chats) {
        try {
          // Fetch chat messages
          const messagesUrl = `https://graph.microsoft.com/v1.0/me/chats/${chat.id}/messages?$top=20`
          
          const messagesResponse = await fetch(messagesUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          })

          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json()
            const chatMessages = messagesData.value || []
            
            // Add context to all chat messages
            chatMessages.forEach((msg: any) => {
              msg.chatId = chat.id
              msg.chatTopic = chat.topic || 'Chat'
              msg.isChannel = false
            })
            
            messages.push(...chatMessages)
            
            if (chatMessages.length > 0) {
              console.log(`  💬 [Chat: ${chat.topic || 'Unnamed'}] Found ${chatMessages.length} messages`)
            }
          }
        } catch (error) {
          console.error(`  ❌ Error fetching messages from chat:`, error)
        }
      }
    }

    console.log(`✅ [Teams] Total raw messages fetched: ${messages.length}`)

    // Transform messages to a common format and filter out system messages
    const formattedMessages = messages
      .filter((msg: any) => {
        // Only include user messages (not system messages, bots, or empty messages)
        if (!msg.body?.content || !msg.from) return false
        if (msg.messageType !== 'message') return false
        
        // Skip messages from bots
        if (msg.from.application) return false
        
        return true
      })
      .map((msg: any) => ({
        id: msg.id,
        teamId: msg.teamId || null,
        teamName: msg.teamName || null,
        channelId: msg.channelId || null,
        channelName: msg.channelName || null,
        chatId: msg.chatId || null,
        chatTopic: msg.chatTopic || null,
        isChannel: msg.isChannel || false,
        from: {
          name: msg.from?.user?.displayName || msg.from?.displayName || 'Unknown',
          email: msg.from?.user?.userPrincipalName || msg.from?.user?.id || null,
        },
        body: msg.body?.content || '',
        bodyType: msg.body?.contentType || 'text',
        createdDateTime: msg.createdDateTime,
        importance: msg.importance || 'normal',
        messageType: msg.messageType,
        subject: msg.isChannel 
          ? `[${msg.teamName}] ${msg.channelName}`
          : (msg.chatTopic || 'Direct Message'),
        webUrl: msg.webUrl || null,
      }))
      .sort((a, b) => new Date(b.createdDateTime).getTime() - new Date(a.createdDateTime).getTime())

    console.log(`📝 [Teams] Formatted ${formattedMessages.length} user messages`)
    console.log(`📊 [Teams] Breakdown - Channels: ${formattedMessages.filter(m => m.isChannel).length}, Chats: ${formattedMessages.filter(m => !m.isChannel).length}`)

    return NextResponse.json({
      messages: formattedMessages,
      count: formattedMessages.length,
    })

  } catch (error) {
    console.error('❌ [Teams] Error fetching saved messages:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

