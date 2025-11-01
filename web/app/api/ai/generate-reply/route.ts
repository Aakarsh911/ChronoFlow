import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { emailSubject, emailBody, from, tone, additionalInstructions } = await request.json()

    if (!emailSubject || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    })

    const toneDescription = {
      professional: 'professional and courteous',
      casual: 'casual and friendly',
      friendly: 'warm and friendly',
      formal: 'formal and respectful',
    }[tone || 'professional']

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

    const result = await model.generateContent(prompt)
    const response = result.response
    const reply = response.text().trim()

    return NextResponse.json({ reply })

  } catch (error) {
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

