import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"
import { groqApiKey } from "@/lib/server/env"

type CarouselProjectRow = {
  id: string
  workspace_id: string
  post_id: string | null
  theme: string | null
  created_at: string
  updated_at: string
}

type CarouselSlideDraft = {
  title?: string
  content?: string
}

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

/** GET /api/carousel — list all carousel projects in the workspace */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const rows = await supabaseSelect<CarouselProjectRow>(
      "carousel_projects",
      `workspace_id=eq.${workspaceId}&order=created_at.desc&limit=50`
    )
    return NextResponse.json({ carousels: rows || [] })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: msg === "auth_required" ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const body = await request.json()
    const { postId, content } = body as { postId?: string | null; content?: string }

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 })
    }
    if (!groqApiKey) {
      return NextResponse.json({ error: "AI generation is not configured" }, { status: 503 })
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are an expert LinkedIn carousel designer. Convert the user's text into a 5-10 slide carousel structure. Output MUST be a strict JSON array of objects with 'title' (short headline) and 'content' (1-2 sentences max). No markdown wrappers, no other text.",
          },
          { role: "user", content: `Convert this post into carousel slides:\n\n${content}` },
        ],
        temperature: 0.4,
      }),
    })

    const data = (await response.json()) as GroqResponse
    let slidesData: CarouselSlideDraft[] = []
    try {
      const text = data.choices?.[0]?.message?.content || "[]"
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as unknown
      slidesData = Array.isArray(parsed) ? (parsed as CarouselSlideDraft[]) : []
    } catch {
      slidesData = [{ title: "Slide 1", content: content.slice(0, 100) }]
    }

    const projectRows = await supabaseInsert<CarouselProjectRow>(
      "carousel_projects",
      {
        workspace_id: workspaceId,
        post_id: postId || null,
        theme: "default",
      },
      "return=representation"
    )
    const projectId = projectRows?.[0]?.id
    if (!projectId) throw new Error("carousel_project_create_failed")

    const slidesToInsert = slidesData.map((slide, index) => ({
      carousel_id: projectId,
      order_index: index,
      title: slide.title || `Slide ${index + 1}`,
      content: slide.content || "",
    }))

    const slides = await supabaseInsert(
      "carousel_slides",
      slidesToInsert,
      "return=representation"
    )

    return NextResponse.json({ projectId, slides })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
