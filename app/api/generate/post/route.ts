import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { log } from "@/lib/server/logging"
import { generatePostFromHook } from "@/lib/use-cases/generate-post-from-hook"
import { errorToStatus } from "@/lib/errors"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const topic = String(body.topic || "").trim()
    const hook = String(body.hook || "").trim()

    if (!topic || topic.length < 3) return NextResponse.json({ error: "Topic must be at least 3 characters" }, { status: 400 })
    if (!hook) return NextResponse.json({ error: "A hook is required" }, { status: 400 })

    const result = await generatePostFromHook({
      topic,
      hook,
      role: String(body.role || ""),
      format: String(body.format || ""),
      goal: String(body.goal || "").trim() || undefined,
      userId: user.externalId,
      workspaceId: user.workspaceId,
      plan: user.plan,
    })

    if (!result.ok) {
      log.warn("generate.post-from-hook.limited", { userId: user.id })
      return NextResponse.json({ error: result.error.userMessage || result.error.message }, { status: errorToStatus(result.error.code) })
    }

    log.info("generate.post-from-hook.done", { userId: user.id, wordCount: result.data.wordCount })
    return NextResponse.json(result.data)
  })(request)
}
