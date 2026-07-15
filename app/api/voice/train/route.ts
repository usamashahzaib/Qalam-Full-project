import { NextRequest, NextResponse } from "next/server"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { trainVoiceProfile } from "@/lib/use-cases/train-voice-profile"
import type { VoiceSampleAnalysis } from "@/lib/use-cases/train-voice-profile"

type VoiceSample = {
  text: string
  analysis: VoiceSampleAnalysis
  added_at: string
}

const getProfile = async (workspaceId: string, userId: string) => {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("voice_profiles")
    .select("id, sample_posts, voice_fingerprint")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle()
  if (data) return data

  const fallback = await supabase
    .from("voice_profiles")
    .select("id, sample_posts, voice_fingerprint")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()
  return fallback.data
}

const saveProfile = async (
  userId: string,
  workspaceId: string,
  samples: VoiceSample[],
  fingerprint: unknown,
  analysis: unknown,
  sampleText: string
) => {
  const supabase = createServiceClient()
  const row = await getProfile(workspaceId, userId)
  const payload = {
    user_id: userId,
    workspace_id: workspaceId,
    sample_posts: samples,
    voice_fingerprint: fingerprint || {},
    characteristics: analysis || {},
    updated_at: new Date().toISOString(),
  }

  const result = row?.id
    ? await supabase.from("voice_profiles").update(payload).eq("id", row.id)
    : await supabase.from("voice_profiles").insert(payload)

  if (result.error) return result.error
  try {
    await supabase.from("voice_training_logs").insert({
      user_id: userId,
      sample_text: sampleText,
      ai_analysis: analysis || {},
    })
  } catch {
    // Training history is non-critical.
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const planCheck = await requirePlan(request, "Pro")
    if (!planCheck.ok) return NextResponse.json({ error: "upgrade_required", upgradeCta: "Upgrade to Pro for more voice training", requiredPlan: "Pro" }, { status: 403 })

    const data = await getProfile(planCheck.workspaceId, planCheck.session.supabaseUserId)
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
    if (!planCheck.ok) return NextResponse.json({ error: "upgrade_required", upgradeCta: "Upgrade to Pro for more voice training", requiredPlan: "Pro" }, { status: 403 })
    await requireRole(req, planCheck.workspaceId, "editor")
    const userId = planCheck.session.supabaseUserId
    const body = await req.json()
    const examples = Array.isArray(body.examplePosts) ? body.examplePosts.map(String) : []
    const cleanSample = String(body.sampleText || examples.at(-1) || "").trim()

    if (cleanSample.length < 50) {
      return NextResponse.json({ error: "Sample must be at least 50 characters" }, { status: 400 })
    }

    const existing = await getProfile(planCheck.workspaceId, userId)

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

    const error = await saveProfile(userId, planCheck.workspaceId, updatedSamples, fingerprint, analysis, cleanSample)

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
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : errorToStatus(message) })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const planCheck = await requirePlan(request, "Pro")
    if (!planCheck.ok) return NextResponse.json({ error: "upgrade_required", upgradeCta: "Upgrade to Pro for more voice training", requiredPlan: "Pro" }, { status: 403 })
    await requireRole(request, planCheck.workspaceId, "editor")
    const supabase = createServiceClient()
    const row = await getProfile(planCheck.workspaceId, planCheck.session.supabaseUserId)
    const { error } = row?.id
      ? await supabase
          .from("voice_profiles")
          .update({ sample_posts: [], voice_fingerprint: {}, characteristics: {}, workspace_id: planCheck.workspaceId, updated_at: new Date().toISOString() })
          .eq("id", row.id)
      : await supabase
          .from("voice_profiles")
          .insert({ user_id: planCheck.session.supabaseUserId, workspace_id: planCheck.workspaceId, sample_posts: [], voice_fingerprint: {}, characteristics: {} })
    if (error) throw new Error(error.message)
    try {
      await supabase.from("voice_training_logs").delete().eq("user_id", planCheck.session.supabaseUserId)
    } catch {
      // Training history is non-critical.
    }
    return NextResponse.json({ success: true, samples_count: 0, samples: [], fingerprint: {} })
  } catch (error) {
    const message = (error as Error).message || "Failed to clear voice profile"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : errorToStatus(message) })
  }
}
