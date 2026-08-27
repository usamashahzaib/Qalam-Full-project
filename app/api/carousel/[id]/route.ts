import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { createScopedClient } from "@/lib/server/supabase-rest"

type DbSlide = { title: string; bullets: string[]; designHint?: string }

function mapSlides(carouselId: string, rawSlides: unknown) {
  if (!Array.isArray(rawSlides)) return []
  return rawSlides.map((s: DbSlide, i: number) => ({
    id: String(i),
    carousel_id: carouselId,
    order_index: i,
    title: s?.title || `Slide ${i + 1}`,
    // designHint is an internal layout keyword, never slide copy - a slide
    // with no bullets simply has no body text.
    content: Array.isArray(s?.bullets) && s.bullets.length ? s.bullets.join("\n") : null,
    design_hint: s?.designHint || null,
    image_url: null,
  }))
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    const { id } = await context.params

    let workspaceId: string
    try {
      workspaceId = await resolveWorkspaceId(req)
      await requireRole(req, workspaceId, "viewer")
    } catch (error) {
      const msg = (error as Error).message
      return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
    }

    // select("*") so optional columns (theme_id, design_settings) are picked
    // up when present without erroring on databases missing migration 0050.
    const { data: dataRaw, error } = await createScopedClient(workspaceId)
      .from("carousels")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("[carousel GET]", id, error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!dataRaw) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }
    const data = dataRaw as unknown as {
      id: string
      tone: string | null
      role: string | null
      theme_id: string | null
      design_settings: unknown
      created_at: string
      updated_at: string
      linkedin_post_urn: string | null
      published_at: string | null
      slides: unknown
    }

    return NextResponse.json({
      project: {
        id: data.id,
        workspace_id: null,
        post_id: null,
        theme: data.tone || data.role || null,
        themeId: data.theme_id ?? null,
        designSettings: data.design_settings ?? null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        linkedinPostUrn: data.linkedin_post_urn ?? null,
        publishedAt: data.published_at ?? null,
      },
      slides: mapSlides(data.id, data.slides),
    })
  })(request)
}

const DESIGN_SETTING_KEYS = ["authorName", "designation", "accentOverride", "customAccent", "bgOverride", "customBg"] as const

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    const { id } = await context.params

    let workspaceId: string
    try {
      workspaceId = await resolveWorkspaceId(req)
      await requireRole(req, workspaceId, "editor")
    } catch (error) {
      const msg = (error as Error).message
      return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
    }

    let body: { themeId?: unknown; designSettings?: unknown }
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.themeId === "string" && body.themeId.length <= 40) {
      update.theme_id = body.themeId
    }
    if (body.designSettings && typeof body.designSettings === "object") {
      const clean: Record<string, string> = {}
      for (const key of DESIGN_SETTING_KEYS) {
        const value = (body.designSettings as Record<string, unknown>)[key]
        if (typeof value === "string" && value.length <= 200) clean[key] = value
      }
      update.design_settings = clean
    }
    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const { error } = await createScopedClient(workspaceId)
      .from("carousels")
      .update(update)
      .eq("id", id)

    if (error) {
      // Columns from migration 0050 may not exist yet - treat as a soft
      // failure so the editor keeps working without persistence.
      if (error.message?.includes("theme_id") || error.message?.includes("design_settings")) {
        return NextResponse.json({ ok: false, _columnsNotReady: true })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    const { id } = await context.params

    let workspaceId: string
    try {
      workspaceId = await resolveWorkspaceId(req)
      await requireRole(req, workspaceId, "editor")
    } catch (error) {
      const msg = (error as Error).message
      return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
    }

    const { error } = await createScopedClient(workspaceId)
      .from("carousels")
      .delete()
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  })(request)
}
