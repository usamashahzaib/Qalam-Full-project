// app/api/generate/route.ts
export const maxDuration = 120

import { NextRequest, NextResponse } from "next/server"
import { log } from "@/lib/server/logging"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { checkPlanLimit } from "@/lib/server/plan-limits-v2"
import { generatePost } from "@/lib/use-cases/generate-post"
import { errorToStatus } from "@/lib/errors"
import { canAccessPost } from "@/lib/domain/services/authorization"

const LINKEDIN_MAX_POST_CHARS = 3000

const generateSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters").max(200, "Topic too long"),
  role: z.preprocess((v) => String(v || "").toLowerCase(), z.enum([
    "ai_engineer", "ceo", "hr", "sales", "designer",
    "consultant", "founder", "developer", "director",
    "marketer", "product_manager", "recruiter", "content_creator", "freelancer"
  ])),
  tone: z.string().max(50).optional(),
  format: z.preprocess((v) => String(v || "medium").toLowerCase(), z.enum(["short", "medium", "long"])).default("medium"),
  goal: z.string().max(500, "Goal too long").optional(),
  qualityCheck: z.boolean().default(true),
})

const patchSchema = z.object({
  id: z.string().uuid("Invalid post ID"),
  content: z.string().max(LINKEDIN_MAX_POST_CHARS, "Post exceeds LinkedIn's 3000 character limit.").optional(),
  confirmOnly: z.boolean().optional(),
})


export async function GET() {
  return withAuth(async (_req, user) => {
    const status = await checkPlanLimit(user.id, "drafts")
    return NextResponse.json({
      allowed: status.allowed,
      current: status.current,
      limit: status.limit,
      remaining: status.remaining,
      plan: status.plan,
    })
  })(new NextRequest("http://localhost"))
}

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID()
  return withAuth(async (req, user) => {
    log.info("generate.post.start", { reqId, userId: user.id })
    let body: unknown
    try { body = await req.json() } catch {
      log.warn("generate.post.invalid_body", { reqId })
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }

    const result = await generatePost({
      ...parsed.data,
      userId: user.id,
      authorId: user.id,
      workspaceId: user.workspaceId,
      plan: user.plan,
      reqId,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error.userMessage || result.error.message }, { status: errorToStatus(result.error.code) })
    }

    if (result.data.post.content.length > LINKEDIN_MAX_POST_CHARS) {
      return NextResponse.json({ error: "Generated post exceeds LinkedIn's 3000 character limit." }, { status: 502 })
    }

    log.info("generate.post.done", { reqId, userId: user.id, postId: result.data.post.id, plan: user.plan })
    return NextResponse.json(result.data)
  })(request)
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: post } = await supabase
      .from("posts")
      .select("id, workspace_id")
      .eq("id", parsed.data.id)
      .eq("workspace_id", user.workspaceId)
      .single()

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const access = await canAccessPost(user.id, parsed.data.id)

    if (!access.ok) {
      return NextResponse.json({ error: access.error.userMessage || access.error.message }, { status: errorToStatus(access.error.code) })
    }

    if (!access.data) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    if (parsed.data.confirmOnly) {
      const { data: fullPost } = await supabase
        .from("posts")
        .select("*")
        .eq("id", parsed.data.id)
        .eq("workspace_id", user.workspaceId)
        .single()
      return NextResponse.json({ post: fullPost })
    }

    const { data: updated } = await supabase.from("posts").update({
      content: parsed.data.content,
      updated_at: new Date().toISOString(),
    }).eq("id", parsed.data.id).eq("workspace_id", user.workspaceId).select().single()

    if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    return NextResponse.json({ post: updated })
  })(request)
}
