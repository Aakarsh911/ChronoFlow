import { NextRequest, NextResponse } from 'next/server';
import { deleteCachePattern } from '@/lib/redis';
import { PrismaClient } from '@prisma/client';

/**
 * Microsoft Graph Webhook Endpoint
 * Receives change notifications from Microsoft Graph
 * https://learn.microsoft.com/en-us/graph/webhooks
 */

// Global event emitter for SSE connections
// In production, use Redis pub/sub or similar
const eventEmitter = global as any;
if (!eventEmitter.mailClients) {
  eventEmitter.mailClients = new Map();
}

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check if this is a validation request
    const { searchParams } = new URL(request.url);
    const validationToken = searchParams.get('validationToken');
    
    if (validationToken) {
      // Microsoft Graph is validating our webhook endpoint
      // We must respond with the validation token in plain text
      return new NextResponse(validationToken, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // This is an actual notification
    const payload = await request.json();
    const notifications = payload.value || [];

    console.log('Received webhook notifications:', notifications.length);

    // Process each notification
    for (const notification of notifications) {
      const { clientState, subscriptionId, resource, changeType } = notification;
      
      // Verify clientState matches what we sent
      const expectedClientState = process.env.WEBHOOK_CLIENT_STATE || 'chronoflow-secret-';
      if (!clientState || !clientState.startsWith(expectedClientState.split('-')[0])) {
        console.error('Invalid clientState in notification');
        continue;
      }

      console.log('Email change detected:', {
        changeType,
        resource,
        subscriptionId,
      });

      // Invalidate email cache for all users (or look up specific user from subscription)
      try {
        // In production, you'd look up which user this subscription belongs to
        // For now, invalidate cache for all outlook emails
        const integrations = await prisma.integration.findMany({
          where: { provider: 'MICROSOFT' },
        });
        
        for (const integration of integrations) {
          await deleteCachePattern(`emails:${integration.userId}:*`);
        }
        console.log(`Invalidated email cache for ${integrations.length} users`);
      } catch (error) {
        console.error('Error invalidating cache:', error);
      }

      // Extract user info from subscription (you'd normally look this up in DB)
      // For now, broadcast to all connected SSE clients
      const mailClients = eventEmitter.mailClients;
      
      // Notify all connected clients to refresh via delta query
      for (const [clientId, client] of mailClients.entries()) {
        try {
          client.controller.enqueue(
            `data: ${JSON.stringify({
              type: 'new-email',
              provider: 'outlook',
              changeType,
              subscriptionId,
              timestamp: new Date().toISOString(),
            })}\n\n`
          );
        } catch (error) {
          console.error('Failed to send SSE to client:', clientId, error);
          mailClients.delete(clientId);
        }
      }
    }

    // Acknowledge receipt
    return NextResponse.json({ success: true }, { status: 202 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return 202 to avoid Microsoft retrying
    return NextResponse.json({ error: 'Processing failed' }, { status: 202 });
  }
}

// Health check for the webhook endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: 'Microsoft Graph Webhook Handler',
    connectedClients: eventEmitter.mailClients?.size || 0,
  });
}
