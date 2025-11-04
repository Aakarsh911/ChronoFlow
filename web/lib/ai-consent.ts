import { prisma } from '@/lib/prisma'

/**
 * Check if user has given AI consent
 * Returns { hasConsent: boolean, needsConsent: boolean }
 */
export async function checkAIConsent(userEmail: string): Promise<{
  hasConsent: boolean
  needsConsent: boolean
  aiConsentDate?: Date | null
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        aiConsent: true,
        aiConsentDate: true,
      },
    })

    if (!user) {
      return { hasConsent: false, needsConsent: true }
    }

    return {
      hasConsent: user.aiConsent,
      needsConsent: !user.aiConsent,
      aiConsentDate: user.aiConsentDate,
    }
  } catch (error) {
    console.error('Error checking AI consent:', error)
    return { hasConsent: false, needsConsent: true }
  }
}

/**
 * Require AI consent - throws error if not granted
 * Use this in AI API routes
 */
export async function requireAIConsent(userEmail: string): Promise<void> {
  const { hasConsent, needsConsent } = await checkAIConsent(userEmail)

  if (needsConsent || !hasConsent) {
    throw new Error('AI_CONSENT_REQUIRED')
  }
}

