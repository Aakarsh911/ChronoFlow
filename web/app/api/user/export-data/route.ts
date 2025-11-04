import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

/**
 * GET - Export all user data (GDPR compliance)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: {
          select: {
            provider: true,
            accountId: true,
            createdAt: true,
            updatedAt: true,
            // Don't include tokens for security
          },
        },
        tasks: {
          select: {
            title: true,
            description: true,
            status: true,
            source: true,
            sourceId: true,
            url: true,
            priority: true,
            dueDate: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        taskEvents: {
          select: {
            type: true,
            payload: true,
            createdAt: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Sanitize user data - remove sensitive tokens
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
        onboarding: user.onboarding,
        aiConsent: user.aiConsent,
        aiConsentDate: user.aiConsentDate,
      },
      integrations: user.integrations,
      tasks: user.tasks,
      taskEvents: user.taskEvents,
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
    }

    console.log(`✓ Data export generated for user: ${user.email}`)

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="chronoflow-data-${user.id}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

