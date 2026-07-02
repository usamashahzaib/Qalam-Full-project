import "server-only"

export type OpenAiCompatibleResult = {
  content: string
  tokensIn: number
  tokensOut: number
  model: string
}

type OpenAiCompatibleOptions = {
  endpoint: string
  apiKey?: string
  model: string
  provider: string
  systemPrompt: string
  userMessage: string
  json?: boolean
  temperature?: number
  maxTokens?: number
  timeout?: number
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))])
}

export async function callOpenAiCompatible({
  endpoint,
  apiKey,
  model,
  provider,
  systemPrompt,
  userMessage,
  json = false,
  temperature = 0.7,
  maxTokens = 2048,
  timeout = 15000,
  headers = {},
  body = {},
}: OpenAiCompatibleOptions): Promise<OpenAiCompatibleResult> {
  if (!apiKey) throw new Error(`${provider} API key not configured`)

  const response = await withTimeout(
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...headers,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: json ? { type: "json_object" } : undefined,
        ...body,
      }),
    }),
    timeout
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new Error(`${provider} API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ""
  if (!content) throw new Error(`${provider} returned empty response`)

  return {
    content,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
    model,
  }
}