import { checkAiRateLimit, cacheAiResponse, getCachedAiResponse, hashPrompt } from "./queue"
import { checkCircuit, recordFailure, recordSuccess } from "./circuit-breaker"

// Strips markdown fences, extracts first JSON object/array, returns null on failure
export function safeParseJson<T = unknown>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (!match) return null
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ])
}

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  json = false,
  timeout = 15000
) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Gemini API key not configured")

  const response = await withTimeout(
    fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\n" + userMessage }] },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    ),
    timeout
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new Error(`Gemini API failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  if (!text) throw new Error("Gemini returned empty response")
  return text
}

// Uses plain fetch instead of groq-sdk to avoid serverless connection issues
async function callGroq(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number } = {},
  timeout = 15000
) {
  const { json = false, temperature = 0.7, maxTokens = 2048 } = options
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("Groq API key not configured")

  const response = await withTimeout(
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: json ? { type: "json_object" } : undefined,
      }),
    }),
    timeout
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new Error(`Groq API failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ""
  if (!content) throw new Error("Groq returned empty response")
  return content
}

export async function callAi(
  systemPrompt: string,
  userMessage: string,
  options: {
    json?: boolean
    temperature?: number
    timeout?: number
    maxTokens?: number
    userId?: string
    plan?: string
    cache?: boolean
    cacheTtl?: number
  } = {}
) {
  const {
    json = false,
    temperature = 0.7,
    timeout = 20000,
    maxTokens = 2048,
    userId = "anonymous",
    plan = "free",
    cache = true,
    cacheTtl = 86400,
  } = options

  const promptHash = hashPrompt(systemPrompt, userMessage, { json, temperature, maxTokens })

  if (cache) {
    const cached = await getCachedAiResponse(promptHash)
    if (cached) {
      console.log(`[AI Cache] Hit for user ${userId}`)
      return cached
    }
  }

  const [groqLimit, groqAvailable] = await Promise.all([
    checkAiRateLimit(userId, plan, "groq"),
    checkCircuit("groq"),
  ])

  if (groqAvailable && groqLimit.allowed) {
    try {
      const result = await callGroq(
        systemPrompt,
        userMessage,
        { json, temperature, maxTokens },
        timeout
      )
      await recordSuccess("groq")
      if (cache) await cacheAiResponse(promptHash, result, cacheTtl)
      return result
    } catch (error) {
      await recordFailure("groq")
      console.error("[Groq Error]", (error as Error).message)
    }
  }

  const geminiLimit = await checkAiRateLimit(userId, plan, "gemini")
  if (!geminiLimit.allowed) {
    throw new Error("Rate limit exceeded for all AI providers. Please try again shortly.")
  }

  try {
    const result = await callGemini(systemPrompt, userMessage, json, timeout)
    if (cache) await cacheAiResponse(promptHash, result, cacheTtl)
    return result
  } catch (error) {
    console.error("[Gemini Error]", (error as Error).message)
    throw new Error("All AI services unavailable. Please try again in a moment.")
  }
}
