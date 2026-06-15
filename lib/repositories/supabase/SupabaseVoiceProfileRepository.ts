import "server-only"
import { supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import type {
  IVoiceProfileRepository,
  VoiceProfileData,
  VoiceProfileInput,
  VoiceAnalysis,
} from "@/lib/repositories/interfaces"

type DbVoiceProfile = {
  id: string
  workspace_id: string
  name: string | null
  title: string | null
  industry: string | null
  tone: string | null
  goals: string[] | null
  sample_posts: string[] | null
  linkedin_url?: string | null
  updated_at: string
}

const toClientProfile = (row?: DbVoiceProfile | null): VoiceProfileData => ({
  name: row?.name ?? "",
  title: row?.title ?? "",
  industry: row?.industry ?? "",
  tone: row?.tone ?? "",
  goals: Array.isArray(row?.goals) ? row!.goals : [],
  samplePosts: Array.isArray(row?.sample_posts) ? row!.sample_posts : [],
  linkedinUrl: row?.linkedin_url ?? "",
})

export class SupabaseVoiceProfileRepository implements IVoiceProfileRepository {
  async get(workspaceId: string): Promise<VoiceProfileData | null> {
    const rows = await supabaseSelect<DbVoiceProfile>(
      "voice_profiles",
      `workspace_id=eq.${workspaceId}&limit=1`
    )
    return rows?.[0] ? toClientProfile(rows[0]) : null
  }

  async save(workspaceId: string, data: VoiceProfileInput): Promise<VoiceProfileData> {
    const payload = {
      workspace_id: workspaceId,
      name: data.name ?? null,
      title: data.title ?? null,
      industry: data.industry ?? null,
      tone: data.tone ?? null,
      goals: Array.isArray(data.goals) ? data.goals.filter(Boolean) : [],
      sample_posts: Array.isArray(data.samplePosts) ? data.samplePosts : [],
      linkedin_url: data.linkedinUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    }
    let rows: DbVoiceProfile[] | null = null
    try {
      rows = await supabaseUpsert<DbVoiceProfile>("voice_profiles", payload, "workspace_id")
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("linkedin_url")) throw error
      const { linkedin_url: _lnUrl, ...fallback } = payload
      rows = await supabaseUpsert<DbVoiceProfile>("voice_profiles", fallback, "workspace_id")
    }
    return toClientProfile(rows?.[0] ?? null)
  }

  async analyze(examplePosts: string, userId: string, plan: string): Promise<VoiceAnalysis> {
    const system = `You are a voice analysis expert for LinkedIn content. Return only valid JSON. No markdown.`
    const userMsg = `Analyze the writing voice from these LinkedIn post examples and extract characteristics.

POSTS:
${examplePosts.slice(0, 3000)}

Return JSON:
{
  "tone": "one adjective (e.g. Direct, Empathetic, Technical, Bold)",
  "sentenceLength": "short | medium | long",
  "vocabulary": "simple | moderate | advanced",
  "commonPhrases": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"],
  "transitions": ["transition 1", "transition 2", "transition 3"],
  "ctaStyle": "question | direct | soft"
}`
    const raw = await callAi(system, userMsg, {
      json: true, temperature: 0.3, maxTokens: 600,
      userId, plan, cache: false,
    })
    const analysis = safeParseJson<VoiceAnalysis>(raw)
    if (!analysis) throw new Error("AI_UNAVAILABLE")
    return analysis
  }
}
