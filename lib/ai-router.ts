import { GoogleGenerativeAI } from "@google/generative-ai"
import { groqApiKey } from "@/lib/server/env"

export async function callAi(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number } = {}
): Promise<string> {
  // 1. Try Groq first
  if (groqApiKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: options.temperature ?? 0.6,
          ...(options.json ? { response_format: { type: "json_object" } } : {}),
        }),
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        const content = data?.choices?.[0]?.message?.content
        if (content) return String(content)
      }
      console.warn(`Groq API returned status ${response.status}. Falling back to Gemini...`)
    } catch (e) {
      console.error("Groq API error. Falling back to Gemini...", e)
    }
  } else {
    console.warn("GROQ_API_KEY is not configured. Falling back to Gemini...")
  }

  // 2. Fallback to Gemini
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) {
    throw new Error("AI service is currently unavailable. Groq failed and Gemini API key is missing.")
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: options.temperature ?? 0.6,
        responseMimeType: options.json ? "application/json" : "text/plain",
      },
    })

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      systemInstruction: systemPrompt,
    })

    const text = result.response.text()
    if (!text) {
      throw new Error("Gemini returned empty response")
    }
    return text
  } catch (e) {
    console.error("Gemini API error:", e)
    throw new Error(`AI generation failed: ${(e as Error).message}`)
  }
}
