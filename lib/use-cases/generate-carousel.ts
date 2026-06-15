import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"

export type CarouselSlide = {
  number: number
  title: string
  body: string
  visual_suggestion: string
}

export interface GenerateCarouselInput {
  topic: string
  role: string
  userId: string
}

export interface GenerateCarouselOutput {
  slides: CarouselSlide[]
}

export async function generateCarousel(input: GenerateCarouselInput): Promise<Result<GenerateCarouselOutput>> {
  const { topic, role, userId } = input
  if (!topic?.trim() || !role?.trim() || !userId) return err({ code: "VALIDATION_ERROR", message: "topic, role, and userId are required" })

  const system = "You are a LinkedIn carousel expert. Return only valid JSON matching the requested schema."
  const user = `Create a 5-7 slide LinkedIn carousel on "${topic}" for a ${role}.

Return JSON:
{"slides":[{"number":1,"title":"...","body":"...","visual_suggestion":"..."}]}`

  try {
    const raw = await callAi(system, user, { json: true, temperature: 0.8, maxTokens: 1200, userId, cache: false })
    const parsed = safeParseJson<{ slides?: Partial<CarouselSlide>[] }>(raw)
    const slides = (parsed?.slides || []).slice(0, 7).map((s, i) => ({
      number: Number(s.number) || i + 1,
      title: String(s.title || "").trim(),
      body: String(s.body || "").trim(),
      visual_suggestion: String(s.visual_suggestion || "").trim(),
    }))

    return slides.length ? ok({ slides }) : err({ code: "AI_UNAVAILABLE", message: "Carousel generation returned no slides" })
  } catch (cause) {
    return err({ code: "AI_UNAVAILABLE", message: "Failed to generate carousel", cause })
  }
}
