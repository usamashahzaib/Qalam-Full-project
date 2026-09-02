import "server-only"

import {
  calculateCurrentStreak,
  calculateMomentumScore,
  calculateProfileCompletion,
  type CareerMomentumView,
  localDateKeys,
  toLocalDateKey,
} from "@/lib/career-momentum"
import { createScopedClient } from "@/lib/server/supabase-rest"

type SignalRow = {
  id: string
  note: string
  signal_date: string
  created_at: string
}

type DateRow = { created_at: string }
type ApplicationEventRow = { event_type: string; occurred_at: string }
type ApplicationRow = { status: string }

const PROMPTS = [
  { key: "result", copy: "What changed because of your work today?" },
  { key: "problem", copy: "What problem did you make smaller today?" },
  { key: "decision", copy: "What useful decision did you make today?" },
  { key: "learning", copy: "What did today teach you that is worth keeping?" },
  { key: "help", copy: "Who did you help today, and how?" },
  { key: "progress", copy: "What moved forward today that was stuck before?" },
  { key: "craft", copy: "What did you do better today than last time?" },
]

const requireData = <T>(result: { data: T | null; error: unknown }, message: string): T => {
  if (result.error) throw new Error(message)
  return result.data as T
}

export async function fetchCareerMomentum(
  workspaceId: string,
  userId: string,
  timezoneOffset: number
): Promise<CareerMomentumView> {
  const client = createScopedClient(workspaceId)
  const now = new Date()
  const lookback = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString()
  const monthLookback = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [signalsResult, evidenceResult, postsResult, applicationsResult, eventsResult, profileResult, reminderResult] =
    await Promise.all([
      client.from("career_daily_signals").select("id,note,signal_date,created_at").eq("user_id", userId).gte("created_at", lookback).order("created_at", { ascending: false }).limit(120).returns<SignalRow[]>(),
      client.from("career_evidence").select("id,verification_status,created_at").eq("user_id", userId).gte("created_at", lookback).returns<Array<DateRow & { verification_status: string }>>(),
      client.from("posts").select("id,status,created_at").eq("user_id", userId).gte("created_at", lookback).returns<Array<DateRow & { status: string }>>(),
      client.from("career_applications").select("status").eq("user_id", userId).returns<ApplicationRow[]>(),
      client.from("career_application_events").select("event_type,occurred_at").eq("user_id", userId).gte("occurred_at", lookback).returns<ApplicationEventRow[]>(),
      client.from("career_profiles").select("target_role,target_industry,summary,skills,achievements").returns<Record<string, unknown>[]>().maybeSingle(),
      client.from("career_habit_preferences").select("reminder_enabled,reminder_hour").eq("user_id", userId).returns<Array<{ reminder_enabled: boolean; reminder_hour: number }>>().maybeSingle(),
    ])

  const signals = requireData<SignalRow[]>(signalsResult, "Daily signals could not be loaded.") || []
  const evidence = requireData<Array<DateRow & { verification_status: string }>>(evidenceResult, "Career evidence could not be loaded.") || []
  const posts = requireData<Array<DateRow & { status: string }>>(postsResult, "Posts could not be loaded.") || []
  const applications = requireData<ApplicationRow[]>(applicationsResult, "Applications could not be loaded.") || []
  const events = requireData<ApplicationEventRow[]>(eventsResult, "Application activity could not be loaded.") || []
  const profile = requireData<Record<string, unknown> | null>(profileResult, "Career profile could not be loaded.")
  const reminder = requireData<{ reminder_enabled: boolean; reminder_hour: number } | null>(reminderResult, "Reminder preferences could not be loaded.")

  const activityDates = new Set<string>()
  signals.forEach((row) => activityDates.add(row.signal_date))
  evidence.forEach((row) => activityDates.add(toLocalDateKey(row.created_at, timezoneOffset)))
  posts.forEach((row) => activityDates.add(toLocalDateKey(row.created_at, timezoneOffset)))
  events.forEach((row) => activityDates.add(toLocalDateKey(row.occurred_at, timezoneOffset)))

  const lastSevenDates = localDateKeys(7, timezoneOffset, now)
  const today = lastSevenDates[0]
  const activeDaysLast7 = lastSevenDates.filter((date) => activityDates.has(date)).length
  const activeApplications = applications.filter((row) => !["accepted", "rejected", "withdrawn", "archived"].includes(row.status)).length
  const interviews = applications.filter((row) => ["interview", "offer", "accepted"].includes(row.status)).length
  const profileCompletion = calculateProfileCompletion(profile)
  const publishedPostsLast30Days = posts.filter((row) => row.status === "published" && row.created_at >= monthLookback).length
  const documentedEvidenceCount = evidence.filter((row) => row.verification_status !== "self_reported").length
  const score = calculateMomentumScore({
    signalCount: signals.length,
    evidenceCount: evidence.length,
    documentedEvidenceCount,
    profileCompletion,
    publishedPostsLast30Days,
    activeApplications,
    interviews,
    activeDaysLast7,
  })

  const promptIndex = Number(today.replaceAll("-", "")) % PROMPTS.length
  const prompt = PROMPTS[promptIndex]
  const proofCapturedToday = signals.some((row) => row.signal_date === today)

  const nextAction = !proofCapturedToday
    ? { label: "Save today's win", href: "#daily-proof", reason: "Keep one useful result, decision, or lesson from today." }
    : profileCompletion < 60
      ? { label: "Complete your direction", href: "/career", reason: "A clearer target role improves every generated asset." }
      : documentedEvidenceCount < 2
        ? { label: "Document one claim", href: "/career/evidence", reason: "A source turns a claim into credible proof." }
        : activeApplications < 1
          ? { label: "Add a target role", href: "/career/applications", reason: "A live opportunity gives your proof somewhere to work." }
          : publishedPostsLast30Days < 1
            ? { label: "Turn proof into a post", href: "/writer", reason: "Visibility compounds when useful evidence becomes a story." }
            : { label: "Save stronger evidence", href: "/career/evidence", reason: "Document the result most relevant to your next role." }

  return {
    today,
    prompt,
    proofCapturedToday,
    activeToday: activityDates.has(today),
    currentStreak: calculateCurrentStreak(activityDates, timezoneOffset, now),
    activeDaysLast7,
    week: lastSevenDates.slice().reverse().map((date) => ({ date, active: activityDates.has(date) })),
    score: score.score,
    breakdown: score.breakdown,
    counts: {
      signals: signals.length,
      evidence: evidence.length,
      documentedEvidence: documentedEvidenceCount,
      publishedPostsLast30Days,
      activeApplications,
    },
    recentSignals: signals.slice(0, 4).map(({ id, note, signal_date }) => ({ id, note, date: signal_date })),
    nextAction,
    reminder: {
      enabled: reminder?.reminder_enabled ?? false,
      hour: reminder?.reminder_hour ?? 17,
    },
    measurementNote: "Progress only reflects useful actions saved in Qalam. It is not an employability score. It does not predict hiring.",
  }
}
