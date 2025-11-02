import { generateText } from '@/lib/ai'

export interface ExtractedTask {
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High'
  dueDate?: string // ISO date string
  category?: 'meeting' | 'review' | 'approval' | 'response' | 'deadline' | 'deliverable'
}

export interface TaskExtractionResult {
  hasActionableItems: boolean
  tasks: ExtractedTask[]
  confidence: number // 0-1 score
}

export interface EmailTaskResult {
  emailId: string
  emailSubject: string
  from: {
    name: string
    address: string
  }
  provider: 'gmail' | 'outlook'
  webLink?: string // Link to email in Gmail/Outlook
  hasActionableItems: boolean
  tasks: ExtractedTask[]
  confidence: number // 0-1 score
}

/**
 * Extract actionable tasks from email content using Gemini AI
 */
export async function extractTasksFromEmail(
  subject: string,
  body: string,
  from: string
): Promise<TaskExtractionResult> {
  try {
    const prompt = `You are an AI assistant that extracts actionable tasks from emails. Analyze the following emails and extract ONLY genuine actionable items that require the recipient to do something.

Email Details:
From: ${from}
Subject: ${subject}
Body: ${body}

Instructions:
1. Only extract items that are clear action items or requests
2. Ignore promotional content, newsletters, automated notifications, and spam
3. Ignore casual conversations without clear action items
4. Extract deadlines or due dates if mentioned
5. Assign priority based on urgency indicators (urgent, ASAP, by EOD, etc.)
6. Be conservative - if unsure whether something is actionable, don't include it

Return your response as a JSON object with this exact structure:
{
  "hasActionableItems": true/false,
  "confidence": 0.0-1.0,
  "tasks": [
    {
      "title": "Short, clear task title (max 100 chars)",
      "description": "Detailed description with context",
      "priority": "Low" | "Medium" | "High",
      "dueDate": "YYYY-MM-DD" (optional, only if mentioned),
      "category": "meeting" | "review" | "response" | "action" | "deadline" (optional)
    }
  ]
}

Examples of actionable items:
- "Please review the attached document by Friday"
- "Can you join the meeting tomorrow at 3pm?"
- "Need your approval on the budget proposal"
- "Please complete the survey"

Examples of NON-actionable items:
- Newsletter content
- Promotional emails
- System notifications (e.g., "Your order has shipped")
- Pure informational emails
- Casual conversations

Return ONLY the JSON object, no additional text.`

  const response = await generateText(prompt, { temperature: 0.3, maxTokens: 1024 })
    
    // Parse the JSON response
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: any
    try {
      parsed = JSON.parse(cleanedResponse)
    } catch (err) {
      console.error('❌ [AI] Failed to parse JSON:', err)
      console.error('❌ [AI] Raw response:', cleanedResponse.slice(0, 2000) + (cleanedResponse.length > 2000 ? '... (truncated)' : ''))
      return {
        hasActionableItems: false,
        tasks: [],
        confidence: 0,
      }
    }

    // Validate the response structure
    if (typeof parsed.hasActionableItems !== 'boolean' || !Array.isArray(parsed.tasks)) {
  throw new Error('Invalid response structure from AI')
    }

    // Filter out tasks with very low confidence
    if (parsed.confidence < 0.5) {
      return {
        hasActionableItems: false,
        tasks: [],
        confidence: parsed.confidence,
      }
    }

    return parsed
  } catch (error) {
    console.error('Error extracting tasks from email:', error)
    
    // Return empty result on error
    return {
      hasActionableItems: false,
      tasks: [],
      confidence: 0,
    }
  }
}

/**
 * Batch extract tasks from multiple emails in a SINGLE API call
 * Returns results with complete email metadata
 */
export async function extractTasksFromEmailsBatch(
  emails: Array<{
    id: string
    subject: string
    bodyPreview: string
    from: { name: string; address: string }
    provider: 'gmail' | 'outlook'
    webLink?: string
  }>
): Promise<EmailTaskResult[]> {
  const results: EmailTaskResult[] = []

  if (emails.length === 0) {
    return results
  }

  try {

    // Create batch prompt
    const emailsText = emails.map((email, index) => `
EMAIL ${index + 1}:
ID: ${email.id}
From: ${email.from.name} <${email.from.address}>
Subject: ${email.subject}
Body: ${email.bodyPreview}
---`).join('\n')

    const prompt = `You are an AI assistant that extracts REAL, WORK-RELATED actionable tasks from emails. 

Analyze the following ${emails.length} emails and extract ONLY genuine work tasks that require action.

${emailsText}

STRICT CRITERIA - Only extract tasks that are:
✅ Clear work-related action items (meetings, reviews, approvals, deliverables)
✅ Specific requests that require the recipient to do something
✅ Time-sensitive items with deadlines or urgency
✅ Professional communications from colleagues, clients, or business contacts

❌ DO NOT extract from:
- Newsletters, marketing emails, promotional content
- Social media notifications, automated alerts
- Order confirmations, shipping updates, receipts
- System notifications, password resets
- Casual conversations without clear deliverables
- Informational emails with no action required
- Spam, junk, or irrelevant content
- Generic greetings or small talk
- Calendar invites (these are already in calendar)

EXAMPLES OF VALID TASKS:
✓ "Please review the Q4 budget proposal by Friday"
✓ "Can you provide feedback on the design mockups?"
✓ "Need your approval on the hiring decision"
✓ "Submit your timesheet before EOD"
✓ "Prepare presentation slides for client meeting"

EXAMPLES OF INVALID (don't extract these):
✗ "Your Amazon order has shipped"
✗ "New post from John on LinkedIn"
✗ "Weekly newsletter from TechCrunch"
✗ "Password reset requested"
✗ "You have 3 new messages on Slack"
✗ "Sale: 50% off all items!"
✗ "Meeting invite: Team standup" (already in calendar)

Return a JSON object mapping email IDs to their extracted tasks:
{
  "emailId1": {
    "hasActionableItems": true,
    "confidence": 0.95,
    "tasks": [
      {
        "title": "Clear, actionable task title",
        "description": "Context from email with key details",
        "priority": "Low" | "Medium" | "High",
        "dueDate": "YYYY-MM-DD" (only if explicitly mentioned),
        "category": "meeting" | "review" | "approval" | "response" | "deadline" | "deliverable"
      }
    ]
  },
  "emailId2": {
    "hasActionableItems": false,
    "confidence": 0.1,
    "tasks": []
  }
}

Priority Guidelines:
- High: Contains "urgent", "ASAP", "by EOD", "critical", deadline within 24 hours
- Medium: Has specific deadline, "please review", "need feedback"  
- Low: No urgency indicators, "when you have time"

Return ONLY the JSON object. Be conservative - when in doubt, don't extract it.`

  const response = await generateText(prompt, { temperature: 0.2, maxTokens: 4096 })
    
    // Parse the JSON response
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: any
    try {
      parsed = JSON.parse(cleanedResponse)
    } catch (err) {
      console.error('❌ [AI] Failed to parse JSON:', err)
      console.error('❌ [AI] Raw response:', cleanedResponse.slice(0, 2000) + (cleanedResponse.length > 2000 ? '... (truncated)' : ''))
      return results // Return empty array on parse error
    }

    // Convert to EmailTaskResult array
    emails.forEach((email) => {
      const extraction = parsed[email.id]
      
      if (extraction && extraction.hasActionableItems && 
          extraction.confidence >= 0.6 && 
          extraction.tasks && extraction.tasks.length > 0) {
        results.push({
          emailId: email.id,
          emailSubject: email.subject,
          from: email.from,
          provider: email.provider,
          webLink: email.webLink,
          hasActionableItems: true,
          tasks: extraction.tasks,
          confidence: extraction.confidence,
        })
      }
    })

    return results
  } catch (error) {
    console.error('Error in batch task extraction:', error)
    return results // Return empty array on error
  }
}

/**
 * Batch extract tasks from multiple emails in a SINGLE API call
 * This is much more efficient and avoids rate limits
 * @deprecated Use extractTasksFromEmailsBatch instead
 */
export async function extractTasksFromEmails(
  emails: Array<{
    id: string
    subject: string
    bodyPreview: string
    from: { name: string; address: string }
  }>
): Promise<Map<string, TaskExtractionResult>> {
  const results = new Map<string, TaskExtractionResult>()

  if (emails.length === 0) {
    return results
  }

  try {

    // Create a batch prompt with all emails
    const emailsText = emails.map((email, index) => `
EMAIL ${index + 1}:
ID: ${email.id}
From: ${email.from.name} <${email.from.address}>
Subject: ${email.subject}
Body: ${email.bodyPreview}
---`).join('\n')

    const prompt = `You are an AI assistant that extracts REAL, WORK-RELATED actionable tasks from emails. 

Analyze the following ${emails.length} emails and extract ONLY genuine work tasks that require action.

${emailsText}

STRICT CRITERIA - Only extract tasks that are:
✅ Clear work-related action items (meetings, reviews, approvals, deliverables)
✅ Specific requests that require the recipient to do something
✅ Time-sensitive items with deadlines or urgency
✅ Professional communications from colleagues, clients, or business contacts

❌ DO NOT extract from:
- Newsletters, marketing emails, promotional content
- Social media notifications, automated alerts
- Order confirmations, shipping updates, receipts
- System notifications, password resets
- Casual conversations without clear deliverables
- Informational emails with no action required
- Spam, junk, or irrelevant content
- Generic greetings or small talk
- Calendar invites (these are already in calendar)

EXAMPLES OF VALID TASKS:
✓ "Please review the Q4 budget proposal by Friday"
✓ "Can you provide feedback on the design mockups?"
✓ "Need your approval on the hiring decision"
✓ "Submit your timesheet before EOD"
✓ "Prepare presentation slides for client meeting"

EXAMPLES OF INVALID (don't extract these):
✗ "Your Amazon order has shipped"
✗ "New post from John on LinkedIn"
✗ "Weekly newsletter from TechCrunch"
✗ "Password reset requested"
✗ "You have 3 new messages on Slack"
✗ "Sale: 50% off all items!"
✗ "Meeting invite: Team standup" (already in calendar)

Return a JSON object mapping email IDs to their extracted tasks:
{
  "emailId1": {
    "hasActionableItems": true,
    "confidence": 0.95,
    "tasks": [
      {
        "title": "Clear, actionable task title",
        "description": "Context from email with key details",
        "priority": "Low" | "Medium" | "High",
        "dueDate": "YYYY-MM-DD" (only if explicitly mentioned),
        "category": "meeting" | "review" | "approval" | "response" | "deadline" | "deliverable"
      }
    ]
  },
  "emailId2": {
    "hasActionableItems": false,
    "confidence": 0.1,
    "tasks": []
  }
}

Priority Guidelines:
- High: Contains "urgent", "ASAP", "by EOD", "critical", deadline within 24 hours
- Medium: Has specific deadline, "please review", "need feedback"  
- Low: No urgency indicators, "when you have time"

Return ONLY the JSON object. Be conservative - when in doubt, don't extract it.`

  const response = await generateText(prompt, { temperature: 0.2, maxTokens: 4096 })
    
    // Parse the JSON response
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: any
    try {
      parsed = JSON.parse(cleanedResponse)
    } catch (err) {
      console.error('❌ [AI] Failed to parse JSON:', err)
      console.error('❌ [AI] Raw response:', cleanedResponse.slice(0, 2000) + (cleanedResponse.length > 2000 ? '... (truncated)' : ''))
      return results // Return empty array on parse error
    }

    // Convert to Map
    Object.keys(parsed).forEach((emailId) => {
      const extraction = parsed[emailId] as TaskExtractionResult
      
      // Only include if has actionable items and decent confidence
      if (extraction.hasActionableItems && 
          extraction.confidence >= 0.6 && 
          extraction.tasks.length > 0) {
        results.set(emailId, extraction)
      }
    })

    return results
  } catch (error) {
    console.error('Error in batch task extraction:', error)
    return results // Return empty map on error
  }
}
