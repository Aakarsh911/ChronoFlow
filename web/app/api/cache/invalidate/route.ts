import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { cache, cacheKeys } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/cache/invalidate
 * Invalidate cache for specific resources
 * Body: { type: 'calendar' | 'emails' | 'all' }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { type = 'all' } = body

    let deletedCount = 0

    switch (type) {
      case 'calendar':
        deletedCount = await cache.delPattern(cacheKeys.calendarUser(user.id))
        break
      
      case 'emails':
        deletedCount = await cache.delPattern(cacheKeys.emailsUser(user.id))
        break
      
      case 'integrations':
        await cache.del(cacheKeys.integrations(user.id))
        deletedCount = 1
        break
      
      case 'tasks':
        await cache.del(cacheKeys.tasks(user.id))
        deletedCount = 1
        break
      
      case 'jira':
        await cache.del(cacheKeys.jiraIssues(user.id))
        deletedCount = 1
        break
      
      case 'all':
        const calendarCount = await cache.delPattern(cacheKeys.calendarUser(user.id))
        const emailsCount = await cache.delPattern(cacheKeys.emailsUser(user.id))
        await cache.del(cacheKeys.integrations(user.id))
        await cache.del(cacheKeys.tasks(user.id))
        await cache.del(cacheKeys.jiraIssues(user.id))
        deletedCount = calendarCount + emailsCount + 3
        break
      
      default:
        return NextResponse.json({ error: 'Invalid cache type' }, { status: 400 })
    }

    console.log(`✓ Invalidated ${deletedCount} cache key(s) for type: ${type}`)

    return NextResponse.json({
      success: true,
      deletedCount,
      type,
    })

  } catch (error) {
    console.error('Error invalidating cache:', error)
    return NextResponse.json({ 
      error: 'Failed to invalidate cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
