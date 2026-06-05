import { supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"
import { groqApiKey } from "@/lib/server/env"
import { callAi } from "./server/ai-router"

export interface VoiceAnalysis {
  tone: string
  sentenceLength: string
  formatting: string
  emojiUsage: string
  hashtagUsage: string
  vocabulary: string[]
  patterns: string[]
  samplePosts: string[]
}

export async function analyzeVoiceWithAi(posts: string[]): Promise<VoiceAnalysis> {
  const combinedPosts = posts.slice(0, 10).join("\n\n---\n\n")

  const systemPrompt = `Analyze the writing style of these LinkedIn posts. Return JSON with:
{
  "tone": "descriptive label (e.g., 'direct and contrarian', 'empathetic and data-driven')",
  "sentenceLength": "short/medium/long/mixed",
  "formatting": "how they structure posts (paragraphs, bullets, line breaks)",
  "emojiUsage": "none/light/moderate/heavy",
  "hashtagUsage": "none/light/moderate/heavy",
  "vocabulary": ["5-10 distinctive words or phrases they use"],
  "patterns": ["3-5 recurring writing patterns"]
}`

  const result = await callAi(systemPrompt, combinedPosts, { json: true, timeout: 10000 })
  const parsed = JSON.parse(result)

  return {
    tone: parsed.tone || "professional",
    sentenceLength: parsed.sentenceLength || "medium",
    formatting: parsed.formatting || "paragraphs",
    emojiUsage: parsed.emojiUsage || "light",
    hashtagUsage: parsed.hashtagUsage || "light",
    vocabulary: parsed.vocabulary || [],
    patterns: parsed.patterns || [],
    samplePosts: posts.slice(0, 20),
  }
}

/**
 * Transcribe audio using Groq Whisper API
 */
export async function transcribeAudio(file: Blob): Promise<string> {
  if (!groqApiKey) {
    throw new Error("Groq API key not configured for audio transcription.")
  }

  const formData = new FormData()
  formData.append("file", file, "audio.mp3")
  formData.append("model", "whisper-large-v3")

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Groq Whisper transcription failed: ${errText}`)
  }

  const data = await response.json()
  return data.text || ""
}

/**
 * Train and save the voice profile from post samples or transcribed audio
 */
export async function trainVoiceProfile(workspaceId: string, samples: string[]) {
  const rows = await supabaseSelect<{ sample_posts?: string[]; name?: string; title?: string; industry?: string; goals?: string[] }>(
    "voice_profiles",
    `workspace_id=eq.${workspaceId}&limit=1`
  )
  const existing = rows?.[0] ?? {}
  const existingSamples: string[] = Array.isArray(existing.sample_posts) ? existing.sample_posts : []
  const merged = Array.from(new Set([...existingSamples, ...samples.filter((s) => s && s.trim())]))

  const analysis = await analyzeVoiceWithAi(merged)

  const structuredTone = [
    `Tone: ${analysis.tone}`,
    `Sentence length: ${analysis.sentenceLength}`,
    `Formatting: ${analysis.formatting}`,
    `Emojis: ${analysis.emojiUsage}`,
    `Hashtags: ${analysis.hashtagUsage}`,
    analysis.vocabulary.length ? `Vocabulary: ${analysis.vocabulary.join(", ")}` : "",
    analysis.patterns.length ? `Patterns: ${analysis.patterns.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join(" | ")

  const upserted = await supabaseUpsert(
    "voice_profiles",
    {
      workspace_id: workspaceId,
      sample_posts: analysis.samplePosts.length ? analysis.samplePosts : merged,
      name: existing.name ?? "Trained Voice",
      title: existing.title ?? null,
      industry: existing.industry ?? null,
      tone: structuredTone,
      goals: existing.goals ?? [],
      updated_at: new Date().toISOString(),
    },
    "workspace_id"
  )

  return {
    profile: upserted?.[0] ?? null,
    analysis,
  }
}
