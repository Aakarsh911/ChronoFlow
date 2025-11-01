import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Define available tools for the AI using Gemini's function calling format
const tools = [
  {
    name: 'reply_to_email',
    description: 'Generate a reply to an email. ALWAYS call this function when the user wants to reply to, respond to, or answer an email. The system will handle email selection if no email is in context.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        emailId: {
          type: SchemaType.STRING,
          description: 'Optional. The ID of the email to reply to. Leave empty if no email is selected - the system will prompt the user to select one.',
        },
        tone: {
          type: SchemaType.STRING,
          description: 'The tone of the reply: professional, casual, friendly, or formal',
        },
        additionalInstructions: {
          type: SchemaType.STRING,
          description: 'Any specific instructions from the user about what to include in the reply',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_jira_ticket',
    description: 'Create a Jira ticket from an email or conversation context',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'Title of the Jira ticket',
        },
        description: {
          type: SchemaType.STRING,
          description: 'Description of the issue',
        },
        priority: {
          type: SchemaType.STRING,
          description: 'Priority level: High, Medium, or Low',
        },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'extract_tasks',
    description: 'Extract action items and tasks from emails or conversations',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        source: {
          type: SchemaType.STRING,
          description: 'Where to extract tasks from (e.g., "last 5 emails", "this email", "this conversation")',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'schedule_meeting',
    description: 'Schedule a meeting based on user request',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'Meeting title',
        },
        duration: {
          type: SchemaType.NUMBER,
          description: 'Duration in minutes',
        },
        attendees: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
          },
          description: 'List of attendee email addresses',
        },
      },
      required: ['title', 'duration'],
    },
  },
]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, selectedEmail } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    // Build system prompt with context
    let systemPrompt = `You are an AI assistant for ChronoFlow, a productivity and email management application. You help users with:
- Replying to emails professionally
- Creating Jira tickets from emails
- Extracting tasks from conversations
- Scheduling meetings
- Managing their calendar and tasks

IMPORTANT FUNCTION CALLING RULES:
- When the user asks to reply to, respond to, or answer an email, ALWAYS call the reply_to_email function immediately
- Do NOT ask for email IDs or clarification - just call the function and the system will handle email selection
- When they want to create a Jira ticket, call create_jira_ticket
- When they ask about tasks, call extract_tasks
- When they want to schedule a meeting, call schedule_meeting

You are helpful, concise, and professional. Prefer calling functions over asking clarifying questions.

Current user: ${session.user.email}`

    if (selectedEmail) {
      systemPrompt += `\n\nCurrent email in context:
- Subject: ${selectedEmail.subject}
- From: ${selectedEmail.from.name} <${selectedEmail.from.address}>
- ID: ${selectedEmail.id}
- Provider: ${selectedEmail.provider}
- Preview: ${selectedEmail.bodyPreview}`
    }

    // Initialize Gemini model with function calling
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent tool calling
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
      tools: [{ functionDeclarations: tools as any }],
    })

    // Build chat history for Gemini
    const chatHistory = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood! I\'ll help you manage emails, tasks, and calendar efficiently. What would you like me to do?' }],
      },
    ]

    // Add conversation messages
    for (const msg of messages) {
      if (msg.role === 'user') {
        chatHistory.push({
          role: 'user',
          parts: [{ text: msg.content }],
        })
      } else if (msg.role === 'assistant') {
        chatHistory.push({
          role: 'model',
          parts: [{ text: msg.content }],
        })
      }
    }

    // Start chat
    const chat = model.startChat({
      history: chatHistory.slice(0, -1), // All but the last message
    })

    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    const response = result.response

    // Check if Gemini wants to call a function
    const functionCalls = response.functionCalls()
    
    if (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0]
      
      return NextResponse.json({
        message: response.text() || '',
        toolCall: {
          name: functionCall.name,
          arguments: functionCall.args,
        },
      })
    }

    // Regular text response
    return NextResponse.json({
      message: response.text() || 'I apologize, but I encountered an error.',
      toolCall: null,
    })

  } catch (error) {
    console.error('AI Chat error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

