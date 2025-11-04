import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { deleteCachePattern } from '@/lib/redis'

/**
 * DELETE - Delete user account and all associated data
 * This is permanent and cannot be undone
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { confirmEmail } = await request.json()

    // Require email confirmation for safety
    if (confirmEmail !== session.user.email) {
      return NextResponse.json(
        { error: 'Email confirmation does not match' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        integrations: true,
        tasks: true,
        taskEvents: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete all user data (cascades will handle related records)
    await prisma.user.delete({
      where: { id: user.id },
    })

    // Clear all cached data
    await deleteCachePattern(`*:${user.id}:*`)
    await deleteCachePattern(`*${user.id}*`)

    console.log(`✓ User account deleted: ${user.email}`)
    console.log(`  - Deleted ${user.integrations.length} integrations`)
    console.log(`  - Deleted ${user.tasks.length} tasks`)
    console.log(`  - Deleted ${user.taskEvents.length} task events`)

    return NextResponse.json({
      success: true,
      message: 'Account and all data permanently deleted',
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

