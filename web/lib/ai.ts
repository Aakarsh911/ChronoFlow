/**
 * Unified AI Helper - Switches between Gemini (dev) and Bedrock (prod)
 */

import { bedrockGenerateText, bedrockChatWithTools } from '@/lib/bedrock'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

const AI_MODE = process.env.AI_MODE || 'development'
const USE_GEMINI = AI_MODE === 'development'

// Gemini setup (development)
let genAI: GoogleGenerativeAI | null = null
if (USE_GEMINI && process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
}

/**
 * Generate text using the configured AI provider
 */
export async function generateText(prompt: string, options?: {
  temperature?: number
  maxTokens?: number
  topP?: number
  system?: string
  modelId?: string
}): Promise<string> {
  if (USE_GEMINI && genAI) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: options?.temperature ?? 0.5,
        topP: options?.topP ?? 0.95,
        topK: 40,
        maxOutputTokens: options?.maxTokens ?? 1024,
      },
    })

    const fullPrompt = options?.system 
      ? `${options.system}\n\n${prompt}`
      : prompt

    const result = await model.generateContent(fullPrompt)
    return result.response.text().trim()
  }

  // Production: Use Bedrock
  return bedrockGenerateText(prompt, options)
}

/**
 * Chat with tools using the configured AI provider
 */
export async function chatWithTools(params: {
  systemPrompt?: string
  tools?: Array<{
    name: string
    description?: string
    parameters: any
  }>
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  lastUserMessage: string
  temperature?: number
  maxTokens?: number
}): Promise<{ message: string; toolCall: null | { name: string; arguments: any } }> {
  if (USE_GEMINI && genAI) {
    // Convert tools to Gemini format
    const geminiTools = params.tools?.map(t => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: Object.fromEntries(
          Object.entries(t.parameters.properties || {}).map(([key, val]: [string, any]) => [
            key,
            {
              type: val.type === 'string' ? SchemaType.STRING :
                    val.type === 'number' ? SchemaType.NUMBER :
                    val.type === 'array' ? SchemaType.ARRAY :
                    SchemaType.OBJECT,
              description: val.description,
              ...(val.items ? { items: val.items } : {}),
            }
          ])
        ),
        required: t.parameters.required || [],
      },
    }))

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: params.temperature ?? 0.5,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: params.maxTokens ?? 2048,
      },
      tools: geminiTools && geminiTools.length > 0 ? [{ functionDeclarations: geminiTools as any }] : undefined,
    })

    // Build chat history
    const chatHistory = [
      {
        role: 'user' as const,
        parts: [{ text: params.systemPrompt || 'You are a helpful AI assistant.' }],
      },
      {
        role: 'model' as const,
        parts: [{ text: 'Understood! How can I help?' }],
      },
    ]

    if (params.history) {
      for (const msg of params.history) {
        if (msg.role === 'user') {
          chatHistory.push({ role: 'user', parts: [{ text: msg.content }] })
        } else if (msg.role === 'assistant') {
          chatHistory.push({ role: 'model', parts: [{ text: msg.content }] })
        }
      }
    }

    const chat = model.startChat({
      history: chatHistory,
    })

    const result = await chat.sendMessage(params.lastUserMessage)
    const response = result.response

    // Check for function calls
    const functionCalls = response.functionCalls()
    if (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0]
      return {
        message: response.text() || '',
        toolCall: {
          name: functionCall.name,
          arguments: functionCall.args,
        },
      }
    }

    return {
      message: response.text() || 'I apologize, but I encountered an error.',
      toolCall: null,
    }
  }

  // Production: Use Bedrock
  return bedrockChatWithTools(params)
}

export function getAIMode(): 'development' | 'production' {
  return USE_GEMINI ? 'development' : 'production'
}

export function getAIProvider(): 'gemini' | 'bedrock' {
  return USE_GEMINI ? 'gemini' : 'bedrock'
}
