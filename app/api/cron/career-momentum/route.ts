import { NextResponse } from "next/server"
import { APP_URL } from "@/lib/seo"
import { sendTransactionalEmail } from "@/lib/server/email"
import { createNotification } from "@/lib/server/notifications"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { verifyCronAuth } from "@/lib/server/verify-cron"
import { toLocalDateKey } from "@/lib/career-momentum"
import { runTrackedCron } from "@/lib/server/cron-health"

export const maxDuration = 30

type PreferenceRow = {
  id: string
  workspace_id: string
  user_id: string
  reminder_hour: number
  timezone_offset: number
  last_reminded_on: string | null
  users: { email: string; full_name: string | null }[] | { email: string; full_name: string | null } | null
}

const joinedUser = (row: PreferenceRow) => Array.isArray(row.users) ? row.users[0] : row.users

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  return runTrackedCron("career-momentum", async () => {
    const supabase = createServiceClient()
    const now = new Date()
    const { data, error } = await supabase
    .from("career_habit_preferences")
    .select("id,workspace_id,user_id,reminder_hour,timezone_offset,last_reminded_on,users:user_id(email,full_name)")
    .eq("reminder_enabled", true)
    .limit(250)

    if (error) return NextResponse.json({ error: "Reminder preferences could not be loaded." }, { status: 500 })

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const preference of (data || []) as unknown as PreferenceRow[]) {
    const shifted = new Date(now.getTime() - preference.timezone_offset * 60_000)
    const localHour = shifted.getUTCHours()
    const localDate = toLocalDateKey(now, preference.timezone_offset)
    if (localHour !== preference.reminder_hour || preference.last_reminded_on === localDate) {
      skipped += 1
      continue
    }

    const { count } = await supabase
      .from("career_daily_signals")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", preference.workspace_id)
      .eq("user_id", preference.user_id)
      .eq("signal_date", localDate)

    if ((count || 0) > 0) {
      skipped += 1
      continue
    }

    const { data: claimed } = await supabase
      .from("career_habit_preferences")
      .update({ last_reminded_on: localDate, updated_at: now.toISOString() })
      .eq("id", preference.id)
      .or(`last_reminded_on.is.null,last_reminded_on.neq.${localDate}`)
      .select("id")
      .maybeSingle()

    if (!claimed) {
      skipped += 1
      continue
    }

    const user = joinedUser(preference)
    if (!user?.email) {
      skipped += 1
      continue
    }

    const firstName = user.full_name?.trim().split(/\s+/)[0] || "there"
    const subject = "Keep one win from today"
    const text = [
      `Hi ${firstName},`,
      "",
      "Save one result, decision, or lesson from today in Qalam.",
      "",
      "It usually takes under 30 seconds and strengthens the proof behind your resume, LinkedIn, and interviews.",
      "",
      `${APP_URL}/dashboard#daily-proof`,
      "",
      "You chose this reminder in Qalam. You can turn it off from your dashboard at any time.",
    ].join("\n")

    const emailResult = await sendTransactionalEmail({ to: user.email, subject, text }).catch(() => ({ ok: false }))
    if (!emailResult.ok) {
      failed += 1
      continue
    }
    await createNotification({
      userId: preference.user_id,
      workspaceId: preference.workspace_id,
      type: "career_momentum_reminder",
      title: subject,
      body: "Save one result, decision, or lesson before the day ends.",
      link: "/dashboard#daily-proof",
    })
    sent += 1
    }

    return NextResponse.json({ sent, skipped, failed })
  })
}
