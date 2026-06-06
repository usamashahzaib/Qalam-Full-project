import Groq from "groq-sdk"
import { checkCircuit, recordFailure, recordSuccess } from "./circuit-breaker"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function callGemini(systemPrompt: string, userMessage: string, json = false): Promise<string> {
  // SECURITY FIX: API key ab URL mein nahi, header mein ja rahi hai
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
    {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY || ""
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userMessage }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: json ? "application/json" : "text/plain",
        },
      }),
    }
  )

  if (!response.ok) throw new Error("Gemini API failed")
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

export async function callAi(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; timeout?: number } = {}
): Promise<string> {
  const { json = false, temperature = 0.7, timeout = 15000 } = options

  const groqAvailable = await checkCircuit("groq")

  if (groqAvailable) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const completion = await groq.chat.completions.create(
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          model: "llama-3.1-8b-instant",
          temperature,
          response_format: json ? { type: "json_object" } : undefined,
        },
        { signal: controller.signal }
      )

      clearTimeout(timeoutId)
      const content = completion.choices[0]?.message?.content || ""
      await recordSuccess("groq")
      return content
    } catch (error) {
      await recordFailure("groq")
      console.error("Groq failed, falling back to Gemini:", error)
    }
  }

  try {
    return await callGemini(systemPrompt, userMessage, json)
  } catch (error) {
    throw new Error("All AI services unavailable. Please try again in a moment.")
  }
}