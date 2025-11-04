import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

/**
 * GET - Check AI consent status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        aiConsent: true,
        aiConsentDate: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      aiConsent: user.aiConsent,
      aiConsentDate: user.aiConsentDate,
    })
  } catch (error) {
    console.error('Error checking AI consent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Grant AI consent
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        aiConsent: true,
        aiConsentDate: new Date(),
      },
    })

    console.log(`✓ AI consent granted for user: ${user.email}`)

    return NextResponse.json({
      success: true,
      aiConsent: user.aiConsent,
      aiConsentDate: user.aiConsentDate,
    })
  } catch (error) {
    console.error('Error granting AI consent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Revoke AI consent
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        aiConsent: false,
        aiConsentDate: null,
      },
    })

    console.log(`✓ AI consent revoked for user: ${user.email}`)

    return NextResponse.json({
      success: true,
      aiConsent: user.aiConsent,
    })
  } catch (error) {
    console.error('Error revoking AI consent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

