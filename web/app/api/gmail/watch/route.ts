import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { google } from 'googleapis';
import { PrismaClient, Provider } from '@prisma/client';

const prisma = new PrismaClient();

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
    const accessToken = integration.accessToken;
    const refreshToken = integration.refreshToken;

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
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: 'projects/chronoflow-472019/topics/gmail-notify',
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
