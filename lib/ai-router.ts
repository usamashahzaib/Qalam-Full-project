import Groq from "groq-sdk"
import { groqApiKey } from "@/lib/server/env"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function callAi(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number } = {}
): Promise<string> {
  if (!groqApiKey) throw new Error("AI service is currently unavailable. GROQ_API_KEY is missing.")
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      model: "llama-3.1-8b-instant",
      temperature: options.temperature ?? 0.6,
      ...(options.json ? { response_format: { type: "json_object" as const } } : {}),
    })
    return chatCompletion.choices[0]?.message?.content || ""
  } catch (e) {
    console.error("Groq API error:", e)
    throw new Error(`AI generation failed: ${(e as Error).message}`)
  }
}
