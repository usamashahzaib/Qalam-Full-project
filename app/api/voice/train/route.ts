import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAuth } from "@/lib/server/workspace"
import { requirePlan } from "@/lib/server/require-plan"
import { trainVoiceProfile } from "@/lib/use-cases/train-voice-profile"
import type { VoiceSampleAnalysis } from "@/lib/use-cases/train-voice-profile"

type VoiceSample = {
  text: string
  analysis: VoiceSampleAnalysis
  added_at: string
}

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

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
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const userId = planCheck.session.supabaseUserId
    const body = await req.json()
    const examples = Array.isArray(body.examplePosts) ? body.examplePosts.map(String) : []
    const cleanSample = String(body.sampleText || examples.at(-1) || "").trim()

    if (cleanSample.length < 50) {
      return NextResponse.json({ error: "Sample must be at least 50 characters" }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const { data: existing } = await supabase
      .from("voice_profiles")
      .select("sample_posts")
      .eq("user_id", userId)
      .maybeSingle()

    const prevSamples = Array.isArray(existing?.sample_posts) ? (existing.sample_posts as VoiceSample[]) : []
    const prevTexts = prevSamples.slice(-19).map((s) => s.text)
    const allPostTexts = [...prevTexts, cleanSample]

    const result = await trainVoiceProfile({ examplePosts: allPostTexts })
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.userMessage ?? result.error.message },
        { status: result.error.code === "AI_UNAVAILABLE" ? 503 : 400 }
      )
    }

    const { analysis, fingerprint } = result.data.characteristics
    const updatedSamples: VoiceSample[] = [
      ...prevSamples.slice(-19),
      { text: cleanSample, analysis, added_at: new Date().toISOString() },
    ]

    const { error } = await supabase.rpc("save_voice_training_sample", {
      p_user_id: userId,
      p_samples: updatedSamples,
      p_fingerprint: fingerprint,
      p_sample_text: cleanSample,
      p_analysis: analysis,
    })

    if (error) {
      console.error("voice_profile_save_failed", error)
      return NextResponse.json({ success: true, samples_count: updatedSamples.length, samples: updatedSamples, analysis, fingerprint, characteristics: result.data.characteristics, warning: "voice_profile_save_failed" })
    }

    return NextResponse.json({
      success: true,
      samples_count: updatedSamples.length,
      samples: updatedSamples,
      analysis,
      fingerprint,
      characteristics: result.data.characteristics,
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
