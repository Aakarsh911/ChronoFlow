import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient, Provider } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Microsoft Graph Webhook Subscriptions
 * Creates and manages change notifications for inbox messages
 * https://learn.microsoft.com/en-us/graph/webhooks
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and Microsoft integration from database
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

    const accessToken = user.integrations[0].accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'create') {
      // Create a new subscription
      const expirationDateTime = new Date();
      expirationDateTime.setHours(expirationDateTime.getHours() + 4); // Max 4320 minutes for mail
      
      // Use ngrok URL for webhooks if available, otherwise use NEXTAUTH_URL
      const webhookBaseUrl = process.env.NGROK_URL || process.env.NEXTAUTH_URL;
      
      const subscriptionPayload = {
        changeType: 'created,updated',
        notificationUrl: `${webhookBaseUrl}/api/outlook/webhooks`,
        resource: "/me/mailFolders('inbox')/messages",
        expirationDateTime: expirationDateTime.toISOString(),
        clientState: process.env.WEBHOOK_CLIENT_STATE || 'chronoflow-secret-' + Math.random().toString(36),
      };

      const response = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionPayload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to create subscription:', error);
        return NextResponse.json(
          { error: 'Failed to create subscription', details: error },
          { status: response.status }
        );
      }

      const subscription = await response.json();
      
      // TODO: Store subscription ID in database with user ID for renewal
      // await prisma.outlookSubscription.create({
      //   data: {
      //     userId: session.user.id,
      //     subscriptionId: subscription.id,
      //     expiresAt: new Date(subscription.expirationDateTime),
      //   }
      // });

      return NextResponse.json({ subscription });
    }

    if (action === 'renew') {
      const { subscriptionId } = await request.json();
      
      const expirationDateTime = new Date();
      expirationDateTime.setHours(expirationDateTime.getHours() + 4);

      const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expirationDateTime: expirationDateTime.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: 'Failed to renew subscription', details: error },
          { status: response.status }
        );
      }

      const subscription = await response.json();
      return NextResponse.json({ subscription });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and Microsoft integration from database
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

    const accessToken = user.integrations[0].accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }

    const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to delete subscription', details: error },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
