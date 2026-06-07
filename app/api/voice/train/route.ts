import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAuth } from "@/lib/server/auth-helpers"
import { callAi } from "@/lib/server/ai-router"

type VoiceSample = {
  text: string
  analysis: VoiceAnalysis
  added_at: string
}

type VoiceAnalysis = {
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

type VoiceFingerprint = {
  signature_phrases: string[]
  typical_sentence_length: string
  emotional_range: string
  argument_structure: string
  unique_verbal_tics: string[]
  confidence_level: string
  storytelling_approach: string
}

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

const parseJson = <T>(raw: string): T => {
  const text = raw.trim()
  const match = text.match(/\{[\s\S]*\}/)
  return JSON.parse(match ? match[0] : text) as T
}

export async function GET() {
  try {
    const userId = await requireAuth()
    const { data, error } = await supabaseAdmin()
      .from("voice_profiles")
      .select("sample_posts, voice_fingerprint")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    const samples = Array.isArray(data?.sample_posts) ? data.sample_posts : []
    return NextResponse.json({
      samples,
      samples_count: samples.length,
      fingerprint: data?.voice_fingerprint || {},
    })
  } catch (error) {
    const message = (error as Error).message || "Failed to load voice profile"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth()
    const { sampleText } = await req.json()
    const cleanSample = String(sampleText || "").trim()

    if (cleanSample.length < 50) {
      return NextResponse.json({ error: "Sample must be at least 50 characters" }, { status: 400 })
    }

    const analysisPrompt = `Analyze this LinkedIn post sample and extract voice characteristics.

SAMPLE:
${cleanSample}

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
}`
    const analysis = parseJson<VoiceAnalysis>(
      await callAi("Return strict JSON only.", analysisPrompt, { json: true, temperature: 0.3, timeout: 15000 })
    )

    const supabase = supabaseAdmin()
    const { data: existing } = await supabase
      .from("voice_profiles")
      .select("sample_posts")
      .eq("user_id", userId)
      .maybeSingle()

    const samples = Array.isArray(existing?.sample_posts) ? existing.sample_posts as VoiceSample[] : []
    const updatedSamples = [
      ...samples.slice(-19),
      { text: cleanSample, analysis, added_at: new Date().toISOString() },
    ]

    const fingerprintPrompt = `Based on these ${updatedSamples.length} writing samples, create a unified voice fingerprint.

SAMPLES:
${updatedSamples.map((s, i) => `Sample ${i + 1}: ${s.text.substring(0, 200)}...`).join("\n")}

OUTPUT JSON:
{
  "signature_phrases": ["phrase 1", "phrase 2"],
  "typical_sentence_length": "short/medium/long/mixed",
  "emotional_range": "what emotions they convey",
  "argument_structure": "how they build arguments",
  "unique_verbal_tics": ["tic 1", "tic 2"],
  "confidence_level": "humble/assertive/aggressive/mixed",
  "storytelling_approach": "personal/anecdotal/data-driven"
}`
    const fingerprint = parseJson<VoiceFingerprint>(
      await callAi("Return strict JSON only.", fingerprintPrompt, { json: true, temperature: 0.3, timeout: 15000 })
    )

    const { error } = await supabase.rpc("save_voice_training_sample", {
      p_user_id: userId,
      p_samples: updatedSamples,
      p_fingerprint: fingerprint,
      p_sample_text: cleanSample,
      p_analysis: analysis,
    })

    if (error) {
      console.error("voice_profile_save_failed", error)
      return NextResponse.json({ error: "Failed to save voice profile" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      samples_count: updatedSamples.length,
      samples: updatedSamples,
      analysis,
      fingerprint,
    })
  } catch (error) {
    console.error("voice_training_failed", error)
    const message = (error as Error).message || "Failed to train voice"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}

export async function DELETE() {
  try {
    const userId = await requireAuth()
    const supabase = supabaseAdmin()
    const { error } = await supabase.rpc("clear_voice_training_samples", { p_user_id: userId })
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, samples_count: 0, samples: [], fingerprint: {} })
  } catch (error) {
    const message = (error as Error).message || "Failed to clear voice profile"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
