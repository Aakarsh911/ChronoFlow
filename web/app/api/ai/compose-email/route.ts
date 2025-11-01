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

    const { to, subject, context, tone } = await request.json()

    if (!context) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 })
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

    const result = await model.generateContent(prompt)
    const response = result.response
    const emailBody = response.text().trim()

    // Generate subject if not provided
    let generatedSubject = subject
    if (!subject && to) {
      const subjectPrompt = `Generate a short, professional email subject line (max 60 characters) for an email about: ${context}

Return ONLY the subject line, no quotes or explanations.`
      
      const subjectResult = await model.generateContent(subjectPrompt)
      generatedSubject = subjectResult.response.text().trim().replace(/['"]/g, '')
    }

    return NextResponse.json({ 
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

