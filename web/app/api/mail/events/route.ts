import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Unified Server-Sent Events (SSE) endpoint for Gmail and Outlook
 * Clients connect here to receive instant notifications when emails change
 */

const eventEmitter = global as any;
if (!eventEmitter.mailClients) {
  eventEmitter.mailClients = new Map();
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const clientId = `${session.user?.email || 'user'}-${Date.now()}-${Math.random()}`;

  eventEmitter.mailClients.set(clientId, {
    controller: {
      enqueue: (data: string) => {
        writer.write(encoder.encode(data));
      },
    },
    userId: session.user?.email,
  });

  console.log('Mail SSE client connected:', clientId);

  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`));

  // Keep-alive ping every 30 seconds
  const keepAliveInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(`: keep-alive ${new Date().toISOString()}\n\n`));
    } catch (error) {
      console.log('Client disconnected:', clientId);
      clearInterval(keepAliveInterval);
      eventEmitter.mailClients.delete(clientId);
    }
  }, 30000);

  request.signal.addEventListener('abort', () => {
    console.log('Mail SSE client disconnected:', clientId);
    clearInterval(keepAliveInterval);
    eventEmitter.mailClients.delete(clientId);
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
