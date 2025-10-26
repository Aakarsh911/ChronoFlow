import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient, Provider } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Delta Query API for Outlook emails
 * Uses Microsoft Graph delta queries to efficiently sync only changes
 * https://learn.microsoft.com/en-us/graph/delta-query-messages
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          where: { provider: Provider.MICROSOFT },
        },
      },
    });

    if (!user || !user.integrations.length) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 401 });
    }

    const integration = user.integrations[0];
    
    // Check if token is expired and refresh proactively
    let accessToken: string | null = integration.accessToken;
    
    if (integration.expiresAt && new Date() >= new Date(integration.expiresAt)) {
      console.log('🔄 Microsoft token expired, refreshing...');
      
      if (!integration.refreshToken) {
        console.error('❌ No refresh token available for Microsoft');
        return NextResponse.json({ 
          error: 'Token expired. Please reconnect your Microsoft account.',
          needsReauth: true 
        }, { status: 401 });
      }
      
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
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.text();
          console.error('❌ Failed to refresh Microsoft token:', error);
          return NextResponse.json({ 
            error: 'Failed to refresh token. Please reconnect your Microsoft account.',
            needsReauth: true 
          }, { status: 401 });
        }

        const tokens = await tokenResponse.json();
        accessToken = tokens.access_token;
        
        // Update tokens in database
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || integration.refreshToken,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
        });
        
        console.log('✅ Microsoft token refreshed successfully');
      } catch (refreshError) {
        console.error('❌ Failed to refresh Microsoft token:', refreshError);
        return NextResponse.json({ 
          error: 'Failed to refresh token. Please reconnect your Microsoft account.',
          needsReauth: true 
        }, { status: 401 });
      }
    }
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    // Get deltaLink from query params (if this is a subsequent sync)
    const { searchParams } = new URL(request.url);
    const deltaLink = searchParams.get('deltaLink');

    let url: string;
    
    if (deltaLink) {
      // Use the stored deltaLink to get only changes since last sync
      url = deltaLink;
    } else {
      // Initial delta query - get today's emails
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      
      url = `https://graph.microsoft.com/v1.0/me/mailFolders('inbox')/messages/delta?$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments,importance,conversationId&$filter=receivedDateTime ge ${todayISO}&$top=50&$orderby=receivedDateTime desc`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Graph API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch emails', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The response includes:
    // - value: array of changed items
    // - @odata.deltaLink: URL for next delta query (when no more changes)
    // - @odata.nextLink: URL for pagination (if there are more changes)
    
    return NextResponse.json({
      emails: data.value || [],
      deltaLink: data['@odata.deltaLink'] || null,
      nextLink: data['@odata.nextLink'] || null,
    });

  } catch (error) {
    console.error('Delta query error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
