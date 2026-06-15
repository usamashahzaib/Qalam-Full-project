import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { scorePost } from "@/lib/use-cases/score-post"
import { errorToStatus } from "@/lib/errors"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const result = await scorePost({
      content: String(body.content || body.postContent || ""),
      role: String(body.role || ""),
      userId: user.id,
      plan: user.plan,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.userMessage ?? result.error.message },
        { status: errorToStatus(result.error.code) }
      )
    }

    const { scores, overall, tips, hashtags } = result.data
    return NextResponse.json({ scores: { ...scores, overall }, overall, tips, hashtags })
  })(request)
}
