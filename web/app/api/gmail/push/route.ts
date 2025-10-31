import { NextRequest, NextResponse } from 'next/server';
import { deleteCachePattern } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * Gmail Push Notifications Endpoint
 * Receives notifications from Google Cloud Pub/Sub when Gmail changes occur
 * https://developers.google.com/gmail/api/guides/push
 */

const eventEmitter = global as any;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Gmail sends a message in this format:
    // {
    //   "message": {
    //     "data": "base64-encoded-string",
    //     "messageId": "...",
    //     "publishTime": "..."
    //   },
    //   "subscription": "projects/..."
    // }

    if (!body.message || !body.message.data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Decode the base64 data
    const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8');
    const notification = JSON.parse(decodedData);

    console.log('Gmail push notification received:', notification);

    // Extract user email from notification
    const emailAddress = notification.emailAddress;

    // Invalidate email cache for this user
    try {
      const user = await prisma.user.findUnique({ where: { email: emailAddress } });
      if (user) {
        await deleteCachePattern(`emails:${user.id}:*`);
        console.log(`Invalidated email cache for user: ${user.id}`);
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }

    // Broadcast to all connected SSE clients for this user
    if (eventEmitter.mailClients) {
      let notifiedCount = 0;
      eventEmitter.mailClients.forEach((client: any, clientId: string) => {
        if (client.userId === emailAddress) {
          try {
            client.controller.enqueue(
              `data: ${JSON.stringify({
                type: 'new-email',
                provider: 'gmail',
                historyId: notification.historyId,
              })}\n\n`
            );
            console.log('Notified mail client (Gmail):', clientId);
            notifiedCount++;
          } catch (error) {
            console.error('Error notifying client:', error);
            eventEmitter.mailClients.delete(clientId);
          }
        }
      });
      console.log(`Notified ${notifiedCount} mail clients for Gmail: ${emailAddress}`);
    } else {
      console.log('No mail SSE clients connected');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gmail push notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify webhook endpoint (for initial setup)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Gmail push notifications endpoint',
    status: 'active' 
  });
}
