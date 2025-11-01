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
    description: 'Generate a NEW reply to an email. ONLY call when user explicitly wants to create/send a NEW reply. DO NOT call when asking about replies that were already sent. The system will handle email selection if no email is in context.',
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
  {
    name: 'compose_new_email',
    description: 'Compose and send a NEW email to someone. ONLY use when user explicitly requests to send/write/compose a NEW email. DO NOT use when user asks about emails that were already sent or asks about email content.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        to: {
          type: SchemaType.STRING,
          description: 'Recipient email address (e.g., "john@example.com"). If not provided by user, ask for it.',
        },
        subject: {
          type: SchemaType.STRING,
          description: 'Email subject line. If not provided, infer from context or ask.',
        },
        context: {
          type: SchemaType.STRING,
          description: 'What the email should be about. User\'s instructions for email content.',
        },
        tone: {
          type: SchemaType.STRING,
          description: 'Tone of the email: professional, casual, friendly, or formal. Default to professional.',
        },
      },
      required: ['context'],
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
    let systemPrompt = `You are an AI assistant for ChronoFlow, a productivity and email management application. You are conversational, helpful, and professional.

CORE CAPABILITIES:
- Reply to emails, compose new emails, forward emails
- Create and manage tasks from emails or conversations
- Create Jira tickets from emails or requests
- Schedule meetings and manage calendar
- Extract tasks, action items, and insights
- Answer questions about productivity and workflow

WHEN TO USE FUNCTIONS vs WHEN TO CHAT:
✅ CALL FUNCTIONS when user explicitly requests a NEW ACTION:
- "reply to this email" / "respond to the email" / "answer this email" → reply_to_email
- "send an email to..." / "email john about..." / "compose a new email" → compose_new_email
- "create a Jira ticket" / "make a ticket" → create_jira_ticket
- "extract tasks" / "find action items" → extract_tasks
- "schedule a meeting" / "set up a meeting" → schedule_meeting

❌ DO NOT call functions for:
- Greetings ("hi", "hello", "yo", "hey")
- Questions about what you just did ("what was in that email?", "what did I send?", "can you show me the email?")
- Questions about content that was just created/sent ("what did the email say?", "what was the subject?")
- Acknowledgments ("thanks", "ok", "great", "cool")
- Casual conversation
- Follow-up questions about completed actions ("did it send?", "was it successful?")
- Information requests about recent actions ("what did you write?", "show me what you sent")
- Questions about your capabilities ("what can you do?", "how do you work?")

IMPORTANT RULES:
- DO NOT call tools when user asks about something that JUST happened in this conversation
- DO NOT call tools to retrieve information about actions you JUST performed
- ONLY call tools when the user wants to perform a NEW action
- After completing an action, you can refer to the chat history to answer questions about it
- Respond conversationally to questions about recent messages or actions in this chat

FUNCTION CALLING RULES:
- Only call functions when user clearly requests a NEW action
- Don't ask for clarification - call the function and let the system prompt if needed
- After completing an action, respond conversationally and wait for the next instruction
- If user asks about what you just did, answer from chat history without calling tools

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
        temperature: 0.5, // Balanced for both conversation and tool calling
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
        parts: [{ text: 'Understood! I can help you with emails, tasks, meetings, and Jira tickets. I\'ll chat with you normally and only use functions when you request specific actions. How can I help?' }],
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

