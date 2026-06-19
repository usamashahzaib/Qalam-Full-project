import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { generateHooks } from "@/lib/use-cases/generate-hooks"
import { errorToStatus } from "@/lib/errors"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    const body = await req.json()
    const topic = String(body.topic || body.content || "").trim()
    if (!topic) return NextResponse.json({ error: "topic_required" }, { status: 400 })

    const result = await generateHooks({
      topic,
      role: String(body.role || body.style || ""),
      userId: user.id,
      plan: planCheck.plan,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error.userMessage ?? result.error.message },
        { status: errorToStatus(result.error.code) }
      )
    }

    return NextResponse.json(result.data)
  })(request)
}
