import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import type { VoiceAnalysis } from "@/lib/repositories/interfaces"

export const analyzeVoice = async (
  examplePosts: string,
  userId: string,
  plan: string
): Promise<VoiceAnalysis> => {
  const raw = await callAi("voice-profile",
    "Return strict JSON only.",
    `Analyze this writing sample and return { "tone", "sentenceLength", "vocabulary", "commonPhrases", "transitions", "ctaStyle" }.\n\n${examplePosts}`,
    { json: true, temperature: 0.3, maxTokens: 500, userId, plan, cache: false }
  ).catch(() => JSON.stringify({
    tone: "direct",
    sentenceLength: "short",
    vocabulary: "simple",
    commonPhrases: [],
    transitions: [],
    ctaStyle: "direct",
  }))

  return safeParseJson<VoiceAnalysis>(raw) ?? {
    tone: "direct",
    sentenceLength: "short",
    vocabulary: "simple",
    commonPhrases: [],
    transitions: [],
    ctaStyle: "direct",
  }
}
