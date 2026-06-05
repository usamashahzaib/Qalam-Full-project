import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/app-session"
import { requirePlan } from "@/lib/server/require-plan"
import { transcribeAudio, analyzeVoiceText, trainVoiceProfile } from "@/lib/voice-analyzer"

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const { userId } = await requireAuth(request)

    // 2. Enforce Solo plan for voice training features
    const planCheck = await requirePlan(request, "Solo")
    if (!planCheck.ok) return planCheck.response
    const { workspaceId } = planCheck

    // 3. Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as Blob | null
    const text = formData.get("text") as string | null

    let contentToAnalyze = ""

    if (file && file.size > 0) {
      // Transcribe the audio file
      try {
        contentToAnalyze = await transcribeAudio(file)
      } catch (err) {
        return NextResponse.json(
          { error: `Transcription error: ${(err as Error).message}` },
          { status: 422 }
        )
      }
    } else if (text && text.trim().length > 0) {
      contentToAnalyze = text.trim()
    } else {
      return NextResponse.json(
        { error: "Please provide either an audio file or a text corpus." },
        { status: 400 }
      )
    }

    if (contentToAnalyze.length < 15) {
      return NextResponse.json(
        { error: "Content is too short to extract a style fingerprint. Please provide at least 15 characters." },
        { status: 400 }
      )
    }

    // 4. Run voice training and persist to database
    const result = await trainVoiceProfile(workspaceId, [contentToAnalyze])

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      profile: result.profile,
      transcribedText: file ? contentToAnalyze : undefined,
    })
  } catch (error) {
    console.error("Voice training failed:", error)
    const msg = (error as Error).message
    return NextResponse.json(
      { error: msg === "auth_required" ? "Please sign in again." : msg },
      { status: msg === "auth_required" ? 401 : 500 }
    )
  }
}
