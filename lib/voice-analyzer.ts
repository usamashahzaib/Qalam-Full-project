import { callAi } from "@/lib/server/ai-router"

export interface VoiceAnalysis {
  tone: string
  sentenceLength: string
  formatting: string
  emojiUsage: string
  hashtagUsage: string
  vocabulary: string[]
  patterns: string[]
}

export interface VoiceFingerprint {
  signaturePhrases: string[]
  typicalSentenceLength: number
  emotionalRange: string
  argumentStructure: string
  uniqueVerbalTics: string[]
  confidenceLevel: number
  storytellingApproach: string
}

export interface VoiceProfile {
  analysis: VoiceAnalysis
  fingerprint: VoiceFingerprint
  samplePosts: string[]
  createdAt: string
}

const TONE_ROLE_MAP: Record<string, string[]> = {
  executive: ["authoritative", "strategic", "visionary", "confident"],
  founder: ["authentic", "bold", "direct", "passionate"],
  coach: ["warm", "empathetic", "encouraging", "practical"],
  consultant: ["analytical", "professional", "measured", "expert"],
  creator: ["conversational", "engaging", "playful", "relatable"],
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

function parseSentenceLengthNumber(sentenceLength: string): number {
  const match = sentenceLength.match(/\d+/)
  if (match) return parseInt(match[0], 10)
  const lower = sentenceLength.toLowerCase()
  if (lower.includes("short")) return 10
  if (lower.includes("long")) return 25
  return 15
}

export async function extractWritingSamples(text: string): Promise<string[]> {
  return text
    .split("\n\n")
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function generateVoiceFingerprint(analysis: VoiceAnalysis): Promise<VoiceFingerprint> {
  const typicalSentenceLength = parseSentenceLengthNumber(analysis.sentenceLength)
  // richness of analysis acts as proxy for sample count in confidence formula
  const richness = analysis.vocabulary.length + analysis.patterns.length
  const confidenceLevel = Math.min(0.95, 0.7 + richness * 0.05)

  try {
    const result = await callAi(
      "Return strict JSON for a writing fingerprint.",
      `Analyze this style profile and return JSON with signaturePhrases (array), emotionalRange, argumentStructure, uniqueVerbalTics (array), storytellingApproach.\n\n${JSON.stringify(analysis)}`,
      { json: true, temperature: 0.4, timeout: 10000 }
    )
    let parsed: Partial<VoiceFingerprint> = {}
    try {
      parsed = JSON.parse(result) as Partial<VoiceFingerprint>
    } catch {
      // malformed AI output — defaults applied below
    }
    return {
      signaturePhrases: Array.isArray(parsed.signaturePhrases)
        ? parsed.signaturePhrases
        : analysis.vocabulary.slice(0, 6),
      typicalSentenceLength,
      emotionalRange: typeof parsed.emotionalRange === "string" ? parsed.emotionalRange : "balanced",
      argumentStructure:
        typeof parsed.argumentStructure === "string"
          ? parsed.argumentStructure
          : analysis.patterns[0] ?? "hook, context, lesson, CTA",
      uniqueVerbalTics: Array.isArray(parsed.uniqueVerbalTics) ? parsed.uniqueVerbalTics : [],
      confidenceLevel,
      storytellingApproach:
        typeof parsed.storytellingApproach === "string" ? parsed.storytellingApproach : "practical examples",
    }
  } catch {
    return {
      signaturePhrases: analysis.vocabulary.slice(0, 6),
      typicalSentenceLength,
      emotionalRange: "balanced",
      argumentStructure: analysis.patterns[0] ?? "hook, context, lesson, CTA",
      uniqueVerbalTics: [],
      confidenceLevel,
      storytellingApproach: "practical examples",
    }
  }
}

export async function analyzeVoiceFromText(samples: string[]): Promise<VoiceProfile> {
  if (samples.length < 3) {
    throw new Error("At least 3 writing samples required")
  }
  const cleanSamples = samples.map((s) => s.trim()).filter(Boolean).slice(0, 20)

  let analysis: VoiceAnalysis = { ...fallbackAnalysis }

  try {
    const result = await callAi(
      "Analyze LinkedIn writing voice. Return strict JSON only.",
      `Analyze the writing style of these LinkedIn posts. Return JSON with: tone, sentenceLength, formatting, emojiUsage, hashtagUsage, vocabulary (array), patterns (array).\n\nSamples:\n${cleanSamples.join("\n\n---\n\n")}`,
      { json: true, temperature: 0.35, timeout: 15000 }
    )
    try {
      const parsed = JSON.parse(result) as Partial<VoiceAnalysis>
      analysis = {
        tone: typeof parsed.tone === "string" ? parsed.tone : fallbackAnalysis.tone,
        sentenceLength:
          typeof parsed.sentenceLength === "string" ? parsed.sentenceLength : fallbackAnalysis.sentenceLength,
        formatting: typeof parsed.formatting === "string" ? parsed.formatting : fallbackAnalysis.formatting,
        emojiUsage: typeof parsed.emojiUsage === "string" ? parsed.emojiUsage : fallbackAnalysis.emojiUsage,
        hashtagUsage: typeof parsed.hashtagUsage === "string" ? parsed.hashtagUsage : fallbackAnalysis.hashtagUsage,
        vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
        patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      }
    } catch {
      // analysis stays as fallback
    }
  } catch {
    // analysis stays as fallback
  }

  return {
    analysis,
    fingerprint: await generateVoiceFingerprint(analysis),
    samplePosts: cleanSamples,
    createdAt: new Date().toISOString(),
  }
}

export async function compareVoiceToRole(
  voiceProfile: VoiceProfile,
  role: string
): Promise<{ match: number; suggestions: string[] }> {
  const roleLower = role.toLowerCase()
  const roleTones = Object.entries(TONE_ROLE_MAP).find(([key]) => roleLower.includes(key))?.[1] ?? []
  const tone = voiceProfile.analysis.tone.toLowerCase()
  const toneMatch = roleTones.length > 0 && roleTones.some((t) => tone.includes(t))

  let match = toneMatch ? 75 : 45
  const suggestions: string[] = []

  if (!toneMatch) {
    const expected = roleTones[0] ?? "professional"
    suggestions.push(`Shift your tone toward ${expected} to better align with the ${role} voice.`)
  }
  if (voiceProfile.analysis.vocabulary.length < 5) {
    suggestions.push(`Incorporate more role-specific vocabulary to strengthen ${role} authority.`)
    match = Math.max(0, match - 10)
  }
  if (voiceProfile.fingerprint.confidenceLevel < 0.75) {
    suggestions.push(`Provide more writing samples to improve voice confidence and matching accuracy.`)
  }
  if (suggestions.length === 0) {
    suggestions.push(`Maintain consistent post cadence to reinforce your ${role} positioning.`)
  }

  return { match: Math.max(0, Math.min(100, match)), suggestions: suggestions.slice(0, 3) }
}
