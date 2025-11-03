import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { generateText } from '@/lib/ai'
import { prisma } from '@/lib/prisma'

// Using unified AI helper (Gemini in dev, Bedrock in prod)

/**
 * Extract actionable tasks from Teams messages using AI (Gemini)
 * POST /api/tasks/extract-from-teams
 * 
 * Similar to email task extraction but for Teams messages
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log(`🤖 [Teams Task Extraction] Starting for user ${user.id}`)

    // Fetch saved Teams messages
    const messagesRes = await fetch(`${process.env.NEXTAUTH_URL}/api/teams/saved-messages`, {
      headers: { Cookie: request.headers.get('cookie') || '' }
    })

    if (!messagesRes.ok) {
      const errorData = await messagesRes.json()
      return NextResponse.json({ 
        error: errorData.error || 'Failed to fetch Teams messages',
        needsReauth: errorData.needsReauth 
      }, { status: messagesRes.status })
    }

    const messagesData = await messagesRes.json()
    const messages = messagesData.messages || []

    if (messages.length === 0) {
      console.log('⚠️ [Teams Task Extraction] No messages found')
      return NextResponse.json({
        success: true,
        extracted: 0,
        created: 0,
        messagesProcessed: 0,
        message: 'No saved Teams messages found. Try saving some messages in Teams first!'
      })
    }

    console.log(`📊 [Teams Task Extraction] Processing ${messages.length} messages`)

    // Process messages in batches
    const BATCH_SIZE = 10
    const batches: any[][] = []
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      batches.push(messages.slice(i, i + BATCH_SIZE))
    }

    const allTasks: any[] = []

    for (const batch of batches) {
      try {
        const batchTasks = await extractTasksFromMessagesBatch(batch)
        allTasks.push(...batchTasks)
      } catch (error) {
        console.error('❌ [Batch Error]:', error)
      }
    }

    console.log(`✅ [AI] Found actionable items in ${allTasks.length} messages`)

    // Create tasks in database
    const createdTasks: any[] = []
    const skippedDuplicates: string[] = []

    for (const taskData of allTasks) {
      try {
        // Check for duplicate using sourceId (message ID)
        const existing = await prisma.task.findFirst({
          where: {
            userId: user.id,
            source: 'TEAMS',
            sourceId: taskData.messageId,
          },
        })

        if (existing) {
          console.log(`⏭️ Skipping duplicate task from message: ${taskData.messageId}`)
          skippedDuplicates.push(taskData.messageId)
          continue
        }

        // Create task
        const createdTask = await prisma.task.create({
            data: {
              title: taskData.task,
              description: taskData.context || taskData.messageBody?.substring(0, 500),
              status: 'To Do',
              priority: taskData.priority || 'medium',
              dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
              userId: user.id,
              source: 'teams',
              sourceId: taskData.messageId,
            }
          })

        createdTasks.push(createdTask)
        console.log(`✅ Created task: ${createdTask.title}`)
      } catch (error) {
        console.error(`❌ Failed to create task from message ${taskData.messageId}:`, error)
      }
    }

    const duration = Date.now() - Date.now()
    
    console.log(`✅ [Teams Task Extraction] Complete in ${duration}ms`)
    console.log(`   📝 Messages processed: ${messages.length}`)
    console.log(`   🎯 Tasks found: ${allTasks.length}`)
    console.log(`   ✨ Tasks created: ${createdTasks.length}`)
    console.log(`   ⏭️  Duplicates skipped: ${skippedDuplicates.length}`)

    return NextResponse.json({
      success: true,
      extracted: allTasks.length,
      created: createdTasks.length,
      messagesProcessed: messages.length,
      duplicatesSkipped: skippedDuplicates.length,
      tasks: createdTasks,
    })

  } catch (error) {
    console.error('❌ [Teams Task Extraction] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to extract tasks from Teams messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Extract tasks from a batch of Teams messages using Bedrock (Claude)
 */
async function extractTasksFromMessagesBatch(messages: any[]): Promise<any[]> {
  const prompt = `You are an AI task extraction assistant. Analyze these Teams messages and extract ONLY actionable tasks.

TEAMS MESSAGES:
${messages.map((msg, idx) => `
Message ${idx + 1}:
ID: ${msg.id}
From: ${msg.from.name}
Date: ${msg.createdDateTime}
Body: ${msg.body.substring(0, 1000)}
---
`).join('\n')}

EXTRACTION RULES:
1. Only extract if there's a CLEAR action item or task
2. Ignore greetings, acknowledgments, FYIs, status updates without actions
3. Extract: assignments, requests, deadlines, todos, action items
4. Determine priority: high (urgent/deadline), medium (important), low (nice-to-have)
5. Extract due dates if mentioned (return as ISO 8601 format)

Return a JSON array of tasks. If a message has NO actionable tasks, omit it.

Example output format:
[
  {
    "messageId": "exact_message_id_from_above",
    "task": "Brief task description",
    "context": "Additional context from the message",
    "priority": "high|medium|low",
    "dueDate": "2025-11-05T00:00:00Z" or null
  }
]

IMPORTANT: Use the exact "ID" value from the message metadata above as the "messageId" in your response.

If NO actionable tasks found in ANY messages, return an empty array: []

RETURN ONLY THE JSON ARRAY, NO OTHER TEXT.`

  try {
    const response = await generateText(prompt, { temperature: 0.2, maxTokens: 2048 })
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.log('⚠️ No tasks found in batch')
      return []
    }

    const tasks = JSON.parse(jsonMatch[0])
    
    // Enrich tasks with message data
    const enrichedTasks = tasks.map((task: any, index: number) => {
      // Match task to original message by index or messageId
      const message = task.messageId 
        ? messages.find(m => m.id === task.messageId) 
        : messages[index] || messages[0]
      
      return {
        ...task,
        messageId: message.id,
        chatId: message.chatId,
        from: message.from,
        createdDateTime: message.createdDateTime,
        webUrl: message.webUrl,
        messageBody: message.body,
      }
    })

    return enrichedTasks
  } catch (error) {
    console.error('❌ Gemini extraction error:', error)
    return []
  }
}

