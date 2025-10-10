import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Server-Sent Events (SSE) endpoint for real-time Gmail updates
 * Clients connect here to receive instant notifications when emails change
 */

const eventEmitter = global as any
if (!eventEmitter.gmailClients) {
  eventEmitter.gmailClients = new Map()
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Create a TransformStream for SSE
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Generate unique client ID
  const clientId = `${session.user?.email || 'user'}-${Date.now()}-${Math.random()}`

  // Store client connection
  eventEmitter.gmailClients.set(clientId, {
    controller: {
      enqueue: (data: string) => {
        writer.write(encoder.encode(data))
      },
    },
    userId: session.user?.email,
  })

  console.log('Gmail SSE client connected:', clientId)

  // Send initial connection message
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`))

  // Keep-alive ping every 30 seconds
  const keepAliveInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(`: keep-alive ${new Date().toISOString()}\n\n`))
    } catch (error) {
      console.log('Gmail client disconnected:', clientId)
      clearInterval(keepAliveInterval)
      eventEmitter.gmailClients.delete(clientId)
    }
  }, 30000)

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    console.log('Gmail SSE client disconnected:', clientId)
    clearInterval(keepAliveInterval)
    eventEmitter.gmailClients.delete(clientId)
    writer.close()
  })

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// Helper function to broadcast to all connected clients
export function broadcastGmailChange(userId?: string) {
  const clients = eventEmitter.gmailClients
  if (!clients) return

  clients.forEach((client: any, clientId: string) => {
    if (!userId || client.userId === userId) {
      try {
        client.controller.enqueue(
          `data: ${JSON.stringify({ type: 'email-change' })}\n\n`
        )
      } catch (error) {
        console.error('Error broadcasting to client:', clientId, error)
        clients.delete(clientId)
      }
    }
  })
}
