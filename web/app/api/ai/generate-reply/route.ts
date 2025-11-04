import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { generateText } from '@/lib/ai'
import { requireAIConsent } from '@/lib/ai-consent'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check AI consent
    try {
      await requireAIConsent(session.user.email)
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'AI consent required',
          code: 'AI_CONSENT_REQUIRED',
          message: 'You must grant consent to use AI features. Please enable AI features in Settings.'
        },
        { status: 403 }
      )
    }

    const { emailSubject, emailBody, from, tone, additionalInstructions } = await request.json()

    if (!emailSubject || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    

    const toneMap = {
      professional: 'professional and courteous',
      casual: 'casual and friendly',
      friendly: 'warm and friendly',
      formal: 'formal and respectful',
    } as const
    const allowedTones = Object.keys(toneMap) as Array<keyof typeof toneMap>
    const toneKey: keyof typeof toneMap = allowedTones.includes((tone as any)) ? (tone as keyof typeof toneMap) : 'professional'
    const toneDescription = toneMap[toneKey]

    const prompt = `You are helping write an email reply. Generate a ${toneDescription} response to the following email.

Original Email:
From: ${from.name} <${from.address}>
Subject: ${emailSubject}
Body:
${emailBody}

${additionalInstructions ? `Additional instructions: ${additionalInstructions}\n` : ''}
Guidelines:
- Be ${toneDescription}
- Address the main points in the original email
- Keep it concise and clear
- Use proper email etiquette
- Do NOT include subject line, greeting salutation at the start (like "Subject:" or "To:")
- Just provide the body content
- Start directly with the greeting (e.g., "Hi John,")
- End with an appropriate sign-off

Generate only the email body, nothing else:`

    const reply = (await generateText(prompt, { temperature: 0.7, maxTokens: 1024 })).trim()

    return NextResponse.json({ reply })  } catch (error) {
    console.error('Generate reply error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

