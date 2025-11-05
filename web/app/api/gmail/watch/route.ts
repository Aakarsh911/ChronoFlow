import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { google } from 'googleapis';
import { Provider } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Gmail Watch API - Set up push notifications via Pub/Sub
 * https://developers.google.com/gmail/api/guides/push
 * 
 * Using existing Pub/Sub setup:
 * - Project: chronoflow-472019
 * - Topic: gmail-notify
 * - Endpoint: https://30a727011b5a.ngrok-free.app/api/gmail/push
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and Google integration from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          where: { provider: Provider.GOOGLE },
        },
      },
    });

    if (!user || !user.integrations.length) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 401 });
    }

    const integration = user.integrations[0];
    
    // Check if token is expired and refresh proactively
    let accessToken: string | null = integration.accessToken;
    let refreshToken: string | null | undefined = integration.refreshToken;
    
    if (integration.expiresAt && new Date() >= new Date(integration.expiresAt)) {
      console.log('🔄 Gmail watch token expired, refreshing...');
      
      if (!integration.refreshToken) {
        console.error('❌ No refresh token available for Gmail watch');
        return NextResponse.json({ 
          error: 'Token expired. Please reconnect your Google account.',
          needsReauth: true 
        }, { status: 401 });
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
        
        console.log('✅ Gmail watch token refreshed successfully')
      } catch (refreshError) {
        console.error('❌ Failed to refresh Gmail watch token:', refreshError)
        return NextResponse.json({ 
          error: 'Failed to refresh token. Please reconnect your Google account.',
          needsReauth: true 
        }, { status: 401 })
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Set up watch on user's mailbox using your existing Pub/Sub
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'chronoflow-474012';
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC || 'gmail-notify';
    
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${projectId}/topics/${topicName}`,
        labelIds: ['INBOX'],
        labelFilterAction: 'include',
      },
    });

    const historyId = watchResponse.data.historyId;

    // Store historyId in the integration
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        data: {
          ...(integration.data as object || {}),
          historyId: historyId,
          watchExpiration: watchResponse.data.expiration,
        },
      },
    });

    return NextResponse.json({
      success: true,
      historyId: historyId,
      expiration: watchResponse.data.expiration,
    });

  } catch (error: any) {
    console.error('Gmail watch error:', error);
    
    // Check for permission error
    if (error?.code === 403 || error?.message?.includes('not authorized')) {
      return NextResponse.json(
        { 
          error: 'Gmail Pub/Sub permission error',
          details: 'Gmail service account needs Pub/Sub Publisher role. See GMAIL_PUBSUB_SETUP.md for instructions.',
          hint: 'Run: gcloud pubsub topics add-iam-policy-binding gmail-notify --member=serviceAccount:gmail-api-push@system.gserviceaccount.com --role=roles/pubsub.publisher --project=chronoflow-472019'
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to set up Gmail watch', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
