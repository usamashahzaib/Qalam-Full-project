import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"

export interface VoiceSampleAnalysis {
  tone: string
  sentence_structure: string
  vocabulary_level: string
  emotional_temperature: string
  distinctive_phrases: string[]
  formatting_habits: string
  perspective: string
  hook_style: string
  cta_style: string
}

export interface VoiceFingerprint {
  signature_phrases: string[]
  typical_sentence_length: string
  emotional_range: string
  argument_structure: string
  unique_verbal_tics: string[]
  confidence_level: string
  storytelling_approach: string
}

export interface VoiceCharacteristics {
  analysis: VoiceSampleAnalysis
  fingerprint: VoiceFingerprint
}

export interface TrainVoiceProfileInput {
  examplePosts: string[]  // all posts to train on; last element is the one being analyzed
}

export async function trainVoiceProfile(
  input: TrainVoiceProfileInput
): Promise<Result<{ characteristics: VoiceCharacteristics }>> {
  const { examplePosts } = input

  if (examplePosts.length === 0) {
    return err({ code: "VALIDATION_ERROR", message: "No posts provided", userMessage: "At least one post is required." })
  }

  const latestPost = examplePosts[examplePosts.length - 1]

  const analysisRaw = await callAi(
    "Return strict JSON only.",
    `Analyze this LinkedIn post sample and extract voice characteristics.

SAMPLE:
${latestPost}

OUTPUT JSON:
{
  "tone": "specific tone description (not just 'professional')",
  "sentence_structure": "how sentences are built",
  "vocabulary_level": "technical/simple/mixed",
  "emotional_temperature": "warm/cold/neutral/excited",
  "distinctive_phrases": ["phrase 1", "phrase 2"],
  "formatting_habits": "how they use line breaks, emojis, lists",
  "perspective": "first person / second person / third person",
  "hook_style": "how they open posts",
  "cta_style": "how they close posts"
}`,
    { json: true, temperature: 0.3, timeout: 15000 }
  )

  const analysis = safeParseJson<VoiceSampleAnalysis>(analysisRaw)
  if (!analysis) {
    return err({ code: "AI_UNAVAILABLE", message: "Voice analysis returned invalid JSON" })
  }

  const fingerprintRaw = await callAi(
    "Return strict JSON only.",
    `Based on these ${examplePosts.length} writing samples, create a unified voice fingerprint.

SAMPLES:
${examplePosts.map((post, i) => `Sample ${i + 1}: ${post.substring(0, 200)}...`).join("\n")}

OUTPUT JSON:
{
  "signature_phrases": ["phrase 1", "phrase 2"],
  "typical_sentence_length": "short/medium/long/mixed",
  "emotional_range": "what emotions they convey",
  "argument_structure": "how they build arguments",
  "unique_verbal_tics": ["tic 1", "tic 2"],
  "confidence_level": "humble/assertive/aggressive/mixed",
  "storytelling_approach": "personal/anecdotal/data-driven"
}`,
    { json: true, temperature: 0.3, timeout: 15000 }
  )

  const fingerprint = safeParseJson<VoiceFingerprint>(fingerprintRaw)
  if (!fingerprint) {
    return err({ code: "AI_UNAVAILABLE", message: "Voice fingerprint returned invalid JSON" })
  }

  return ok({ characteristics: { analysis, fingerprint } })
}
