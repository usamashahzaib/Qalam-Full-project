import { supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"
import { groqApiKey } from "@/lib/server/env"
import { callAi } from "@/lib/ai-router"

export type VoiceAnalysis = {
  tone: string
  length: string
  formatting: string
  emojis: string
  hashtags: string
}

/**
 * Transcribe audio using Groq Whisper API
 */
export async function transcribeAudio(file: Blob): Promise<string> {
  if (!groqApiKey) {
    throw new Error("Groq API key not configured for audio transcription.")
  }

  const formData = new FormData()
  // PostgREST/Fetch requires a file name for audio blobs
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
 * Analyze text corpus using AI to extract style variables
 */
export async function analyzeVoiceText(text: string): Promise<VoiceAnalysis> {
  const systemPrompt = `You are a linguistic analyzer specializing in brand voices and writing style fingerprints for social media, particularly LinkedIn.
Analyze the provided writing sample or spoken transcript. Identify the following five properties:
1. Tone (e.g., bold, witty, academic, conversational, warm, direct)
2. Average length style (e.g., short punchy, medium detailed, long-form storytelling)
3. Formatting structure (e.g., short paragraphs, bulleted lists, single-sentence lines, emoji-led sections)
4. Emoji usage pattern (e.g., frequent, moderate, none, only at starts of bullet points)
5. Hashtag usage pattern (e.g., none, 3-5 tags at the end, inline hashtags, specific industry hashtags)

Return the output as a strict JSON object with exactly these keys: "tone", "length", "formatting", "emojis", "hashtags". Each value must be a concise string summarizing the style.`

  const userMessage = `Writing sample to analyze:\n\n${text}`

  try {
    const resultJson = await callAi(systemPrompt, userMessage, { json: true, temperature: 0.2 })
    const parsed = JSON.parse(resultJson) as VoiceAnalysis
    return {
      tone: String(parsed.tone || "Conversational"),
      length: String(parsed.length || "Medium detailed"),
      formatting: String(parsed.formatting || "Short paragraphs"),
      emojis: String(parsed.emojis || "Moderate"),
      hashtags: String(parsed.hashtags || "None"),
    }
  } catch (e) {
    console.error("Voice analysis AI call failed, using fallback:", e)
    return {
      tone: "Conversational",
      length: "Medium detailed",
      formatting: "Short paragraphs",
      emojis: "Moderate",
      hashtags: "3-5 tags at the end",
    }
  }
}

/**
 * Train and save the voice profile
 */
export async function trainVoiceProfile(workspaceId: string, samples: string[]) {
  const rows = await supabaseSelect<any>("voice_profiles", `workspace_id=eq.${workspaceId}&limit=1`)
  const existing = rows?.[0] ?? {}
  const existingSamples: string[] = Array.isArray(existing.sample_posts) ? existing.sample_posts : []
  const merged = Array.from(new Set([...existingSamples, ...samples.filter((s) => s && s.trim())]))

  // Analyze the merged corpus using AI
  const corpus = merged.join("\n\n")
  const analysis = await analyzeVoiceText(corpus)

  const structuredTone = `Tone: ${analysis.tone} | Length: ${analysis.length} | Formatting: ${analysis.formatting} | Emojis: ${analysis.emojis} | Hashtags: ${analysis.hashtags}`

  const upserted = await supabaseUpsert<any>(
    "voice_profiles",
    {
      workspace_id: workspaceId,
      sample_posts: merged,
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
