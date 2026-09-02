import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { authorizeRole } from "@/lib/server/roles"
import { fetchCareerMomentum } from "@/lib/server/career-momentum"
import { requirePlan } from "@/lib/server/require-plan"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { clampTimezoneOffset, toLocalDateKey } from "@/lib/career-momentum"

const querySchema = z.object({
  timezoneOffset: z.coerce.number().int().min(-840).max(840).default(0),
})

const captureSchema = z.object({
  note: z.string().trim().min(3).max(500),
  promptKey: z.string().trim().min(1).max(40),
  timezoneOffset: z.number().int().min(-840).max(840).default(0),
})

const reminderSchema = z.object({
  enabled: z.boolean(),
  hour: z.number().int().min(0).max(23),
  timezoneOffset: z.number().int().min(-840).max(840),
})

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "viewer")
    if (roleError) return roleError

    const parsed = querySchema.safeParse({
      timezoneOffset: req.nextUrl.searchParams.get("timezoneOffset") ?? 0,
    })
    if (!parsed.success) return NextResponse.json({ error: "Invalid timezone." }, { status: 400 })

    try {
      const momentum = await fetchCareerMomentum(planCheck.workspaceId, user.id, parsed.data.timezoneOffset)
      return NextResponse.json({ momentum })
    } catch {
      return NextResponse.json({ error: "Your progress could not be loaded." }, { status: 500 })
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = captureSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Write one clear sentence, up to 500 characters." }, { status: 400 })
    }

    const timezoneOffset = clampTimezoneOffset(parsed.data.timezoneOffset)
    const signalDate = toLocalDateKey(new Date(), timezoneOffset)
    const { data, error } = await createScopedClient(planCheck.workspaceId)
      .from("career_daily_signals")
      .insert({
        user_id: user.id,
        signal_date: signalDate,
        prompt_key: parsed.data.promptKey,
        note: parsed.data.note,
      })
      .select("id,note,signal_date,created_at")
      .single()

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json({ error: "Today's win is already saved." }, { status: 409 })
      }
      return NextResponse.json({ error: "Today's win could not be saved." }, { status: 500 })
    }

    try {
      const momentum = await fetchCareerMomentum(planCheck.workspaceId, user.id, timezoneOffset)
      return NextResponse.json({ signal: data, momentum }, { status: 201 })
    } catch {
      return NextResponse.json({ signal: data }, { status: 201 })
    }
  })(request)
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = reminderSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Check the reminder settings." }, { status: 400 })

    const { error } = await createScopedClient(planCheck.workspaceId)
      .from("career_habit_preferences")
      .upsert({
        user_id: user.id,
        reminder_enabled: parsed.data.enabled,
        reminder_hour: parsed.data.hour,
        timezone_offset: clampTimezoneOffset(parsed.data.timezoneOffset),
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,user_id" })

    if (error) return NextResponse.json({ error: "Reminder settings could not be saved." }, { status: 500 })
    return NextResponse.json({ reminder: { enabled: parsed.data.enabled, hour: parsed.data.hour } })
  })(request)
}
