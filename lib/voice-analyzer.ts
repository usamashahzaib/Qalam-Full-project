import { callAi } from "@/lib/server/ai-router"

export type VoiceAnalysis = {
  tone: string
  sentenceLength: string
  formatting: string
  emojiUsage: string
  hashtagUsage: string
  vocabulary: string[]
  patterns: string[]
}

export type VoiceFingerprint = {
  signaturePhrases: string[]
  typicalSentenceLength: string
  emotionalRange: string
  argumentStructure: string
  uniqueVerbalTics: string[]
  confidenceLevel: number
  storytellingApproach: string
}

export type VoiceProfile = {
  analysis: VoiceAnalysis
  fingerprint: VoiceFingerprint
  samplePosts: string[]
  createdAt: string
}

const fallbackAnalysis: VoiceAnalysis = {
  tone: "professional and direct",
  sentenceLength: "mixed",
  formatting: "short paragraphs with clear line breaks",
  emojiUsage: "light",
  hashtagUsage: "light",
  vocabulary: [],
  patterns: [],
}

const safeJson = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

export async function extractWritingSamples(text: string): Promise<string[]> {
  return text
    .split(/\n\s*(?:---+|\*\*\*+|#{2,}|\d+\.\s+Post\s+\d+)\s*\n|\n{3,}/i)
    .map((sample) => sample.replace(/\s+/g, " ").trim())
    .filter((sample) => sample.length >= 40)
    .slice(0, 25)
}

export async function generateVoiceFingerprint(analysis: VoiceAnalysis): Promise<VoiceFingerprint> {
  try {
    const result = await callAi(
      "Return strict JSON for a writing fingerprint.",
      `Analyze this style profile and return JSON with signaturePhrases, typicalSentenceLength, emotionalRange, argumentStructure, uniqueVerbalTics, confidenceLevel, storytellingApproach.\n\n${JSON.stringify(analysis)}`,
      { json: true, temperature: 0.4, timeout: 10000 }
    )
    const parsed = safeJson<Partial<VoiceFingerprint>>(result, {})
    return {
      signaturePhrases: parsed.signaturePhrases || analysis.vocabulary.slice(0, 6),
      typicalSentenceLength: parsed.typicalSentenceLength || analysis.sentenceLength,
      emotionalRange: parsed.emotionalRange || "balanced",
      argumentStructure: parsed.argumentStructure || analysis.patterns[0] || "hook, context, lesson, CTA",
      uniqueVerbalTics: parsed.uniqueVerbalTics || [],
      confidenceLevel: Number(parsed.confidenceLevel || 60),
      storytellingApproach: parsed.storytellingApproach || "practical examples",
    }
  } catch {
    return {
      signaturePhrases: analysis.vocabulary.slice(0, 6),
      typicalSentenceLength: analysis.sentenceLength,
      emotionalRange: "balanced",
      argumentStructure: analysis.patterns[0] || "hook, context, lesson, CTA",
      uniqueVerbalTics: [],
      confidenceLevel: 50,
      storytellingApproach: "practical examples",
    }
  }
}

export async function analyzeVoiceFromText(samples: string[]): Promise<VoiceProfile> {
  const cleanSamples = samples.map((s) => s.trim()).filter(Boolean).slice(0, 20)
  try {
    const result = await callAi(
      "Analyze LinkedIn writing voice. Return strict JSON only.",
      `Return JSON with tone, sentenceLength, formatting, emojiUsage, hashtagUsage, vocabulary, patterns.\n\nSamples:\n${cleanSamples.join("\n\n---\n\n")}`,
      { json: true, temperature: 0.35, timeout: 15000 }
    )
    const parsed = safeJson<Partial<VoiceAnalysis>>(result, fallbackAnalysis)
    const analysis: VoiceAnalysis = {
      tone: parsed.tone || fallbackAnalysis.tone,
      sentenceLength: parsed.sentenceLength || fallbackAnalysis.sentenceLength,
      formatting: parsed.formatting || fallbackAnalysis.formatting,
      emojiUsage: parsed.emojiUsage || fallbackAnalysis.emojiUsage,
      hashtagUsage: parsed.hashtagUsage || fallbackAnalysis.hashtagUsage,
      vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
    }
    return {
      analysis,
      fingerprint: await generateVoiceFingerprint(analysis),
      samplePosts: cleanSamples,
      createdAt: new Date().toISOString(),
    }
  } catch {
    return {
      analysis: fallbackAnalysis,
      fingerprint: await generateVoiceFingerprint(fallbackAnalysis),
      samplePosts: cleanSamples,
      createdAt: new Date().toISOString(),
    }
  }
}

export async function compareVoiceToRole(voiceProfile: VoiceProfile, role: string): Promise<{ match: number; suggestions: string[] }> {
  try {
    const result = await callAi(
      "Compare a voice profile to a LinkedIn role. Return strict JSON.",
      `Role: ${role}\nVoice profile: ${JSON.stringify(voiceProfile)}\nReturn { "match": 0-100, "suggestions": [] }.`,
      { json: true, temperature: 0.3, timeout: 10000 }
    )
    const parsed = safeJson<{ match?: number; suggestions?: string[] }>(result, {})
    return { match: Math.max(0, Math.min(100, Number(parsed.match || 50))), suggestions: parsed.suggestions || [] }
  } catch {
    return { match: 50, suggestions: ["Add more role-specific vocabulary.", "Use more concrete examples."] }
  }
}
