import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { VOICE_ANALYSIS_SYSTEM_PROMPT } from "@/lib/prompts/builders/voice"

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

  const fallbackAnalysis: VoiceSampleAnalysis = {
    tone: "direct and concise",
    sentence_structure: "short declarative sentences",
    vocabulary_level: "simple",
    emotional_temperature: "neutral",
    distinctive_phrases: [],
    formatting_habits: "plain short posts",
    perspective: "first person",
    hook_style: "direct statement",
    cta_style: "implicit",
  }
  const fallbackFingerprint: VoiceFingerprint = {
    signature_phrases: [],
    typical_sentence_length: "short",
    emotional_range: "neutral",
    argument_structure: "simple point-first structure",
    unique_verbal_tics: [],
    confidence_level: "assertive",
    storytelling_approach: "direct",
  }
  const analysisRaw = await callAi("voice-profile",
    VOICE_ANALYSIS_SYSTEM_PROMPT,
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
  ).catch(() => JSON.stringify(fallbackAnalysis))

  const analysis = safeParseJson<VoiceSampleAnalysis>(analysisRaw)
  if (!analysis) {
    return ok({ characteristics: { analysis: fallbackAnalysis, fingerprint: fallbackFingerprint } })
  }

  const fingerprintRaw = await callAi("voice-profile",
    VOICE_ANALYSIS_SYSTEM_PROMPT,
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
  ).catch(() => JSON.stringify(fallbackFingerprint))

  const fingerprint = safeParseJson<VoiceFingerprint>(fingerprintRaw)
  if (!fingerprint) {
    return ok({ characteristics: { analysis, fingerprint: fallbackFingerprint } })
  }

  return ok({ characteristics: { analysis, fingerprint } })
}
