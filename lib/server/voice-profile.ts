import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
import { retrieveVoiceExamples } from "@/lib/server/embeddings"
import type { VoiceProfile } from "@/lib/prompts/role-aware-system"
import { parseProfessionalContext } from "@/lib/professional-context"
import { getPromptPassport } from "@/lib/server/agency/voice-passport"
import { measureVoice } from "@/lib/voice-measure"

type VoiceRow = {
  tone?: string | null
  brand_tone?: string | null
  sample_posts?: unknown
  voice_fingerprint?: unknown
  characteristics?: unknown
  example_posts?: string | null
  title?: string | null
  industry?: string | null
  goals?: string | null
}

type OldCharacteristics = {
  tone?: string
  sentenceLength?: string
  vocabulary?: unknown
  ctaStyle?: string
  commonPhrases?: string[]
  transitions?: string[]
  professionalContext?: unknown
}

type Fingerprint = {
  signature_phrases?: string[]
  typical_sentence_length?: string
  argument_structure?: string
  unique_verbal_tics?: string[]
  storytelling_approach?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const text = (value: unknown, max = 300) => typeof value === "string" ? value.trim().slice(0, max) : ""

/**
 * Voice training (samples, analysis, passport) is a Pro feature at save time, so it is a Pro
 * feature at generation time too. The basic profile every plan can save (title, industry,
 * goals, tone) is used for everyone: that is the "Basic Voice Profile" the Free plan lists.
 * Without a plan the caller gets everything, which is what internal callers expect.
 */
export const voiceTrainingAllowed = (plan?: string) => {
  if (plan === undefined) return true
  const tier = plan.toLowerCase()
  return tier === "pro" || tier.startsWith("agency")
}

export const toPromptVoiceProfile = (row?: VoiceRow | null, options: { training?: boolean } = {}): VoiceProfile | undefined => {
  if (!row) return undefined
  const { training = true } = options
  const identity = {
    title: text(row.title, 120) || undefined,
    industry: text(row.industry, 120) || undefined,
    goals: text(row.goals, 400) || undefined,
  }
  const hasIdentity = Boolean(identity.title || identity.industry || identity.goals)

  if (!training) {
    const tone = text(row.brand_tone, 120) || text(row.tone, 120)
    return tone || hasIdentity
      ? { tone, sentenceLength: "", vocabulary: [], patterns: [], formatting: "", identity: hasIdentity ? identity : undefined }
      : undefined
  }

  const chars = isRecord(row.characteristics) ? row.characteristics as OldCharacteristics : null
  const fp = isRecord(row.voice_fingerprint) ? row.voice_fingerprint as Fingerprint : null
  const tone = chars?.tone || row.tone || row.brand_tone || ""
  const vocabulary = chars?.commonPhrases || fp?.signature_phrases || []
  const patterns = chars?.transitions || fp?.unique_verbal_tics || []
  const sentenceLength = chars?.sentenceLength || fp?.typical_sentence_length || ""
  const formatting = fp?.argument_structure || fp?.storytelling_approach || ""
  const professionalContext = parseProfessionalContext(chars?.professionalContext)
  // The analysis stores these two and nothing used to read them.
  const vocabularyLevel = text(chars?.vocabulary, 40)
  const closingStyle = text(chars?.ctaStyle, 40)
  const measured = measureVoice(row.example_posts)

  return tone || sentenceLength || vocabulary.length || patterns.length || formatting || professionalContext || hasIdentity || measured
    ? {
        tone, sentenceLength, vocabulary, patterns, formatting,
        professionalContext: professionalContext || undefined,
        identity: hasIdentity ? identity : undefined,
        vocabularyLevel: vocabularyLevel || undefined,
        closingStyle: closingStyle || undefined,
        measured,
      }
    : undefined
}

export const getWorkspaceVoiceProfile = async (workspaceId?: string | null, query?: string, plan?: string): Promise<VoiceProfile | undefined> => {
  if (!workspaceId) return undefined
  const training = voiceTrainingAllowed(plan)
  const [profileResult, examples, passport] = await Promise.all([
    createServiceClient()
      .from("voice_profiles")
      .select("tone, brand_tone, characteristics, voice_fingerprint, sample_posts, example_posts, title, industry, goals")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle(),
    training ? retrieveVoiceExamples(workspaceId, query, 3).catch(() => [] as string[]) : Promise.resolve([] as string[]),
    training ? getPromptPassport(workspaceId) : Promise.resolve(undefined),
  ])
  const base = toPromptVoiceProfile(profileResult.data as VoiceRow | null, { training })
  if (!base && !examples.length && !passport) return undefined
  return {
    ...(base ?? { tone: "", sentenceLength: "", vocabulary: [], patterns: [], formatting: "" }),
    examples: examples.length ? examples : undefined,
    passport,
  }
}
