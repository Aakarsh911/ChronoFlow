import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { generateText } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, subject, context, tone } = await request.json()

    if (!context) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 })
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

    const prompt = `You are helping compose a new email. Generate a ${toneDescription} email based on the following information:

${to ? `To: ${to}` : ''}
${subject ? `Subject: ${subject}` : ''}

Context/Instructions: ${context}

Guidelines:
- Be ${toneDescription}
- Keep it concise and clear
- Use proper email etiquette
- Start with an appropriate greeting
- End with a professional sign-off
- Do NOT include "To:" or "Subject:" in the body
- Just provide the email body content

Generate only the email body:`

    const emailBody = (await generateText(prompt, { temperature: 0.7, maxTokens: 1024 })).trim()

    // Generate subject if not provided
    let generatedSubject = subject
    if (!subject && to) {
      const subjectPrompt = `Generate a short, professional email subject line (max 60 characters) for an email about: ${context}

Return ONLY the subject line, no quotes or explanations.`
      
      const subjectText = await generateText(subjectPrompt, { temperature: 0.7, maxTokens: 128 })
      generatedSubject = subjectText.trim().replace(/['"]/g, '')
    }    return NextResponse.json({ 
      body: emailBody,
      subject: generatedSubject || 'Follow up',
    })

  } catch (error) {
    console.error('Compose email error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

