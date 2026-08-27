import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
import {
  MATCHES_PER_PERIOD,
  connectionPair,
  periodStart,
  scorePair,
  selectMatches,
  type MatchParticipant,
} from "@/lib/matching"

export const MATCH_DOMAIN = "professional"
export const MATCH_CONSENT_PURPOSE = "peer_matching"
export const MATCH_POLICY_VERSION = "2026-08-25"

// Cap on how much of the opted in pool one scoring pass considers. The engine is
// O(pool) per user and runs on request, so this stays bounded until the pool is
// large enough to justify a precomputed nightly pass.
const POOL_LIMIT = 500

export type MatchProfileRow = {
  workspace_id: string
  user_id: string
  domain: string
  opted_in: boolean
  display_name: string
  headline: string
  industry: string
  seniority: string
  location: string
  expertise: string[]
  audience: string[]
  goals: string[]
  contact_email: string | null
  linkedin_url: string | null
}

export type SuggestionRow = {
  id: string
  candidate_user_id: string
  candidate_workspace_id: string
  score: number
  reasons: string[]
  status: "pending" | "interested" | "passed"
  period_start: string
}

export type SuggestionView = {
  id: string
  status: SuggestionRow["status"]
  score: number
  reasons: string[]
  displayName: string
  headline: string
  industry: string
  seniority: string
  location: string
  expertise: string[]
  connected: boolean
  /** Populated only once both sides have said yes. */
  contactEmail: string | null
  linkedinUrl: string | null
}

const PROFILE_COLUMNS =
  "workspace_id, user_id, domain, opted_in, display_name, headline, industry, seniority, location, expertise, audience, goals, contact_email, linkedin_url"

export const toParticipant = (row: MatchProfileRow): MatchParticipant => ({
  userId: row.user_id,
  workspaceId: row.workspace_id,
  displayName: row.display_name || "Qalam member",
  headline: row.headline || "",
  attributes: {
    industry: row.industry || "",
    seniority: row.seniority || "",
    location: row.location || "",
    expertise: row.expertise || [],
    audience: row.audience || [],
    goals: row.goals || [],
  },
})

export async function loadMatchProfile(workspaceId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("match_profiles")
    .select(PROFILE_COLUMNS)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
  return (data as MatchProfileRow | null) ?? null
}

export async function hasActiveMatchConsent(userId: string) {
  const { data } = await createServiceClient()
    .from("career_consents")
    .select("id")
    .eq("user_id", userId)
    .eq("purpose", MATCH_CONSENT_PURPOSE)
    .eq("granted", true)
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}

async function loadConsentedUserIds(userIds: string[]) {
  if (!userIds.length) return new Set<string>()
  const { data } = await createServiceClient()
    .from("career_consents")
    .select("user_id")
    .in("user_id", userIds)
    .eq("purpose", MATCH_CONSENT_PURPOSE)
    .eq("granted", true)
  return new Set(
    ((data as { user_id: string }[] | null) ?? []).map((row) => row.user_id)
  )
}

async function loadConnectedUserIds(userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("match_connections")
    .select("user_a, user_b")
    .eq("domain", MATCH_DOMAIN)
    .or("user_a.eq." + userId + ",user_b.eq." + userId)
  return new Set(
    ((data as { user_a: string; user_b: string }[] | null) ?? []).map((row) =>
      row.user_a === userId ? row.user_b : row.user_a
    )
  )
}

/**
 * Returns this period's suggestions for a user, generating them on first read.
 *
 * Generation is idempotent through the (user_id, candidate_user_id, period_start)
 * unique constraint: two concurrent reads can both score, but only one set of
 * rows survives, and the second insert failing is not an error worth surfacing.
 */
export async function ensureSuggestions(userId: string, workspaceId: string) {
  const supabase = createServiceClient()
  const period = periodStart()

  const { data: existing } = await supabase
    .from("match_suggestions")
    .select("id")
    .eq("user_id", userId)
    .eq("period_start", period)
    .limit(1)
  if (((existing as unknown[] | null) ?? []).length) return

  const profile = await loadMatchProfile(workspaceId)
  if (!profile || !profile.opted_in || !(await hasActiveMatchConsent(userId))) return

  const { data: poolRows } = await supabase
    .from("match_profiles")
    .select(PROFILE_COLUMNS)
    .eq("domain", MATCH_DOMAIN)
    .eq("opted_in", true)
    .order("updated_at", { ascending: false })
    .limit(POOL_LIMIT)

  const optedInProfiles = (poolRows as MatchProfileRow[] | null) ?? []
  const consentedUserIds = await loadConsentedUserIds(optedInProfiles.map((row) => row.user_id))
  const pool = optedInProfiles
    .filter((row) => consentedUserIds.has(row.user_id))
    .map(toParticipant)
  if (pool.length < 2) return

  // Never resurface someone the user has already been shown, in any period.
  const { data: seenRows } = await supabase
    .from("match_suggestions")
    .select("candidate_user_id")
    .eq("user_id", userId)
  const exclude = new Set(
    ((seenRows as { candidate_user_id: string }[] | null) ?? []).map((row) => row.candidate_user_id)
  )
  for (const connected of await loadConnectedUserIds(userId)) exclude.add(connected)

  const matches = selectMatches(toParticipant(profile), pool, { exclude, limit: MATCHES_PER_PERIOD })
  if (!matches.length) return

  await supabase.from("match_suggestions").insert(
    matches.map((match) => ({
      domain: MATCH_DOMAIN,
      period_start: period,
      user_id: userId,
      workspace_id: workspaceId,
      candidate_user_id: match.participant.userId,
      candidate_workspace_id: match.participant.workspaceId,
      score: match.score,
      reasons: match.reasons,
    }))
  )
}

export async function listSuggestions(userId: string): Promise<SuggestionView[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("match_suggestions")
    .select("id, candidate_user_id, candidate_workspace_id, score, reasons, status, period_start")
    .eq("user_id", userId)
    .eq("period_start", periodStart())
    .order("score", { ascending: false })

  const suggestions = (data as SuggestionRow[] | null) ?? []
  if (!suggestions.length) return []

  const { data: profileRows } = await supabase
    .from("match_profiles")
    .select(PROFILE_COLUMNS)
    .in("workspace_id", suggestions.map((row) => row.candidate_workspace_id))
    .eq("opted_in", true)

  const visibleProfiles = (profileRows as MatchProfileRow[] | null) ?? []
  const consentedUserIds = await loadConsentedUserIds(visibleProfiles.map((row) => row.user_id))

  const profiles = new Map(
    visibleProfiles
      .filter((row) => consentedUserIds.has(row.user_id))
      .map((row) => [row.workspace_id, row])
  )
  const connected = await loadConnectedUserIds(userId)

  return suggestions.flatMap((suggestion) => {
    const profile = profiles.get(suggestion.candidate_workspace_id)
    if (!profile) return []
    const isConnected = connected.has(suggestion.candidate_user_id)
    return [{
      id: suggestion.id,
      status: suggestion.status,
      score: suggestion.score,
      reasons: suggestion.reasons || [],
      displayName: profile?.display_name || "Qalam member",
      headline: profile?.headline || "",
      industry: profile?.industry || "",
      seniority: profile?.seniority || "",
      location: profile?.location || "",
      expertise: profile?.expertise || [],
      connected: isConnected,
      // Contact details stay hidden until both sides opt in to the introduction.
      contactEmail: isConnected ? profile?.contact_email ?? null : null,
      linkedinUrl: isConnected ? profile?.linkedin_url ?? null : null,
    }]
  })
}

export type RespondResult =
  | { ok: false; reason: "not_found" }
  | { ok: true; connected: boolean }

/**
 * Records one side of the double opt in.
 *
 * On "interested" the reciprocal suggestion is created if it does not exist yet,
 * so the other person actually gets a chance to answer instead of the interest
 * silently expiring. A connection is only written when both rows say interested.
 */
export async function respondToSuggestion(
  userId: string,
  suggestionId: string,
  action: "interested" | "passed"
): Promise<RespondResult> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("match_suggestions")
    .select("id, candidate_user_id, candidate_workspace_id, workspace_id, period_start, status, score, reasons")
    .eq("id", suggestionId)
    .eq("user_id", userId)
    .maybeSingle()

  const suggestion = data as (SuggestionRow & { workspace_id: string }) | null
  if (!suggestion) return { ok: false, reason: "not_found" }

  const [viewer, candidate, viewerConsented, candidateConsented] = await Promise.all([
    loadMatchProfile(suggestion.workspace_id),
    loadMatchProfile(suggestion.candidate_workspace_id),
    hasActiveMatchConsent(userId),
    hasActiveMatchConsent(suggestion.candidate_user_id),
  ])
  if (!viewer?.opted_in || !candidate?.opted_in || !viewerConsented || !candidateConsented) {
    return { ok: false, reason: "not_found" }
  }

  await supabase
    .from("match_suggestions")
    .update({ status: action, responded_at: new Date().toISOString() })
    .eq("id", suggestion.id)

  if (action === "passed") return { ok: true, connected: false }

  const { data: reciprocalRow } = await supabase
    .from("match_suggestions")
    .select("id, status")
    .eq("user_id", suggestion.candidate_user_id)
    .eq("candidate_user_id", userId)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle()

  const reciprocal = reciprocalRow as { id: string; status: string } | null

  if (!reciprocal) {
    const reverse = scorePair(toParticipant(candidate), toParticipant(viewer))
    await supabase.from("match_suggestions").insert({
      domain: MATCH_DOMAIN,
      period_start: periodStart(),
      user_id: candidate.user_id,
      workspace_id: candidate.workspace_id,
      candidate_user_id: viewer.user_id,
      candidate_workspace_id: viewer.workspace_id,
      score: reverse.score,
      reasons: reverse.reasons,
    })
    return { ok: true, connected: false }
  }

  if (reciprocal.status !== "interested") return { ok: true, connected: false }

  const { userA, userB } = connectionPair(userId, suggestion.candidate_user_id)
  await supabase
    .from("match_connections")
    .upsert({ domain: MATCH_DOMAIN, user_a: userA, user_b: userB }, { onConflict: "domain,user_a,user_b" })
  return { ok: true, connected: true }
}
