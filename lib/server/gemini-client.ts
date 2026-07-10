import "server-only"

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ])
}

export async function callGemini(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number; model?: string } = {},
  timeout = 15000
): Promise<string> {
  const { json = false, temperature = 0.7, maxTokens = 2048, model = "gemini-2.5-flash" } = options
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Gemini API key not configured")

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: maxTokens,
  }
  if (json) generationConfig.responseMimeType = "application/json"
  // Flash models spend part of maxOutputTokens on hidden reasoning tokens before
  // writing the answer, which can exhaust a small token budget and truncate the
  // response before any real output is written. Pro models require a nonzero
  // thinking budget, so only disable it on Flash.
  if (model.includes("flash")) generationConfig.thinkingConfig = { thinkingBudget: 0 }

  const response = await withTimeout(
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userMessage }] }],
          generationConfig,
        }),
      }
    ),
    timeout
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  // Safety/recitation/length blocks return a candidate with no content - not a hard error.
  // Throw a recognisable message so the router skips to the next provider without
  // recording a circuit-breaker failure.
  const finishReason = candidate?.finishReason as string | undefined
  if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
    throw new Error(`Gemini content filtered: ${finishReason}`)
  }
  const text = candidate?.content?.parts?.[0]?.text || ""
  if (!text) throw new Error("Gemini returned empty response")
  return text
}