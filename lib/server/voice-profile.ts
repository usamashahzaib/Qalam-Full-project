import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
import type { VoiceProfile } from "@/lib/prompts/role-aware-system"

type VoiceRow = {
  tone?: string | null
  brand_tone?: string | null
  sample_posts?: unknown
  voice_fingerprint?: unknown
  characteristics?: unknown
}

type OldCharacteristics = {
  tone?: string
  sentenceLength?: string
  commonPhrases?: string[]
  transitions?: string[]
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

export const toPromptVoiceProfile = (row?: VoiceRow | null): VoiceProfile | undefined => {
  if (!row) return undefined
  const chars = isRecord(row.characteristics) ? row.characteristics as OldCharacteristics : null
  const fp = isRecord(row.voice_fingerprint) ? row.voice_fingerprint as Fingerprint : null
  const tone = chars?.tone || row.tone || row.brand_tone || ""
  const vocabulary = chars?.commonPhrases || fp?.signature_phrases || []
  const patterns = chars?.transitions || fp?.unique_verbal_tics || []
  const sentenceLength = chars?.sentenceLength || fp?.typical_sentence_length || ""
  const formatting = fp?.argument_structure || fp?.storytelling_approach || ""

  return tone || sentenceLength || vocabulary.length || patterns.length || formatting
    ? { tone, sentenceLength, vocabulary, patterns, formatting }
    : undefined
}

export const getWorkspaceVoiceProfile = async (workspaceId?: string | null) => {
  if (!workspaceId) return undefined
  const { data } = await createServiceClient()
    .from("voice_profiles")
    .select("tone, brand_tone, characteristics, voice_fingerprint, sample_posts")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle()
  return toPromptVoiceProfile(data)
}
