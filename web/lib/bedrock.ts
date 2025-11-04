import { BedrockRuntimeClient, ConverseCommand, type ConverseCommandInput } from '@aws-sdk/client-bedrock-runtime'

// Model ID for OpenAI GPT on Bedrock; can be overridden via env
const DEFAULT_BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'openai.gpt-oss-120b-1:0'

function assertEnv(name: string, optional = false) {
  const v = process.env[name]
  if (!v && !optional) {
    throw new Error(`${name} is not set in environment variables`)
  }
  return v
}

let _client: BedrockRuntimeClient | null = null

export function getBedrockClient() {
  if (_client) return _client
  const region = assertEnv('AWS_REGION')
  
  // Build credentials config - only include keys if they're actually set
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const sessionToken = process.env.AWS_SESSION_TOKEN
  
  const credentials = (accessKeyId && secretAccessKey) ? {
    accessKeyId,
    secretAccessKey,
    // Only include sessionToken if it exists and is not a placeholder
    ...(sessionToken && !sessionToken.includes('optional') && !sessionToken.includes('your-') ? { sessionToken } : {}),
  } : undefined
  
  _client = new BedrockRuntimeClient({ 
    region,
    credentials,
  })
  return _client
}

export async function bedrockGenerateText(prompt: string, options?: {
  temperature?: number
  maxTokens?: number
  topP?: number
  system?: string
  modelId?: string
}): Promise<string> {
  const client = getBedrockClient()
  const input: ConverseCommandInput = {
    modelId: options?.modelId || DEFAULT_BEDROCK_MODEL_ID,
    system: options?.system ? [{ text: options.system }] : undefined,
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      temperature: options?.temperature ?? 0.5,
      maxTokens: options?.maxTokens ?? 1024,
      topP: options?.topP ?? 0.95,
    },
  }
  const res = await client.send(new ConverseCommand(input))
  const parts = res.output?.message?.content || []
  const text = parts
    .map((p: any) => (p.text ? p.text : ''))
    .filter(Boolean)
    .join('\n')
  return text.trim()
}

// Minimal tool-calling helper using Bedrock Converse tools
export async function bedrockChatWithTools(params: {
  systemPrompt?: string
  tools?: Array<{
    name: string
    description?: string
    parameters: any // JSON Schema
  }>
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  lastUserMessage: string
  modelId?: string
  temperature?: number
  maxTokens?: number
}): Promise<{ message: string; toolCall: null | { name: string; arguments: any } }> {
  const client = getBedrockClient()
  const modelId = params.modelId || DEFAULT_BEDROCK_MODEL_ID

  const messages = [] as NonNullable<ConverseCommandInput['messages']>
  // Convert history into Bedrock messages
  if (params.history && params.history.length) {
    for (const m of params.history) {
      messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: [{ text: m.content }] })
    }
  }
  // Add the last user message
  messages.push({ role: 'user', content: [{ text: params.lastUserMessage }] })

  const toolConfig = params.tools && params.tools.length ? {
    tools: params.tools.map((t) => ({
      toolSpec: {
        name: t.name,
        description: t.description,
        inputSchema: { json: t.parameters },
      },
    })),
  } : undefined

  const input: ConverseCommandInput = {
    modelId,
    system: params.systemPrompt ? [{ text: params.systemPrompt }] : undefined,
    messages,
    toolConfig,
    inferenceConfig: {
      temperature: params.temperature ?? 0.5,
      maxTokens: params.maxTokens ?? 2048,
      topP: 0.95,
    },
  }

  const res = await client.send(new ConverseCommand(input))
  const content = res.output?.message?.content || []

  // Look for toolUse directive
  const toolUse = content.find((c: any) => c.toolUse)
  if (toolUse?.toolUse) {
    return {
      message: content.map((c: any) => c.text).filter(Boolean).join('\n') || '',
      toolCall: {
        name: toolUse.toolUse.name ?? 'unknown_tool',
        arguments: toolUse.toolUse.input,
      },
    }
  }

  const text = content.map((c: any) => c.text).filter(Boolean).join('\n') || ''
  return { message: text, toolCall: null }
}
