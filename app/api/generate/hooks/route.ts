import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { generateHooks } from "@/lib/use-cases/generate-hooks"
import { errorToStatus } from "@/lib/errors"

const BodySchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  role: z.string().optional().default(""),
})

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const raw = body as Record<string, unknown>
    const parsed = BodySchema.safeParse({
      topic: raw.topic ?? raw.content,
      role: raw.role ?? raw.style,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const result = await generateHooks({
      topic: parsed.data.topic,
      role: parsed.data.role,
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
