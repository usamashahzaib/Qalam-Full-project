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

  const response = await withTimeout(
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
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
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  if (!text) throw new Error("Gemini returned empty response")
  return text
}
