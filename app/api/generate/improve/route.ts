import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { log } from "@/lib/server/logging"
import { improvePost } from "@/lib/use-cases/improve-post"
import { errorToStatus } from "@/lib/errors"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const result = await improvePost({
      content: String(body.content || "").trim(),
      role: String(body.role || ""),
      scores: (body.scores || {}) as Record<string, number>,
      userId: user.id,
      internalUserId: user.id,
      plan: user.plan,
    })

    if (!result.ok) {
      log.warn("generate.improve.limited", { userId: user.id })
      return NextResponse.json({ error: result.error.userMessage || result.error.message, remaining: 0 }, { status: errorToStatus(result.error.code) })
    }

    log.info("generate.improve.done", { userId: user.id })
    return NextResponse.json(result.data)
  })(request)
}
