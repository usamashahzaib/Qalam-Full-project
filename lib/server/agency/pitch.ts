import "server-only"

import { env } from "@/lib/server/env"
import { callAi, safeParseJson, sanitizeOutput } from "@/lib/server/ai-router-v2"
import { createServiceClient, supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"
import { LANGUAGE_RULE, WRITING_POLICY, fitSourceText, sourceMaterial } from "@/lib/prompts/writing-policy"
import { hashPublicToken, isUuid, issuePublicToken } from "@/lib/server/agency/access"
import { SupabasePostRepository } from "@/lib/repositories/supabase/SupabasePostRepository"
import { log } from "@/lib/server/logging"

const PITCH_TTL_DAYS = 30
export const PITCH_MONTHLY_LIMIT = 30

export type PitchSample = { angle: string; content: string }

type PitchRow = {
  id: string
  owner_id: string
  agency_name: string
  prospect_name: string
  prospect_role: string | null
  samples: PitchSample[]
  expires_at: string
  revoked_at: string | null
  view_count: number
  last_viewed_at: string | null
  converted_at: string | null
  converted_workspace_id: string | null
  created_at: string
}

const COLUMNS = "id,owner_id,agency_name,prospect_name,prospect_role,samples,expires_at,revoked_at,view_count,last_viewed_at,converted_at,converted_workspace_id,created_at"

const PITCH_TASK = `
TASK:
You are preparing sample LinkedIn posts that show a prospective client what their own posts could sound like if a skilled team wrote them.
- Read the prospect's own posts to learn how they write: rhythm, vocabulary, formality, sentence length, how they open and close.
- Write exactly 3 new posts in that voice, each on a different angle that sits inside the themes they already write about (or the focus topics, when supplied).
- Each post is 500 to 1300 characters, written in first person as the prospect.
- Do not copy sentences from their posts and do not reuse their specific stories, clients, numbers, or events. A sample may reflect a view they clearly hold. Anything else must be framed as a general observation, never as something that happened to them.
- "angle" is a short plain label (3 to 8 words) describing what the post is about.

Return JSON only: {"samples":[{"angle":"...","content":"..."},{"angle":"...","content":"..."},{"angle":"...","content":"..."}]}
`.trim()

function parsePitchSamples(raw: string): PitchSample[] | null {
  const parsed = safeParseJson<{ samples?: unknown }>(raw)
  if (!parsed || !Array.isArray(parsed.samples)) return null
  const samples = parsed.samples
    .map((item) => ({
      angle: sanitizeOutput(String((item as PitchSample)?.angle ?? "")).slice(0, 80),
      content: sanitizeOutput(String((item as PitchSample)?.content ?? "")).slice(0, 3000),
    }))
    .filter((item) => item.angle.length >= 3 && item.content.length >= 200)
  return samples.length >= 3 ? samples.slice(0, 3) : null
}

export async function generatePitchSamples(input: { prospectName: string; prospectRole: string | null; sourcePosts: string; focus: string | null; userId: string; plan: string }) {
  const source = fitSourceText(input.sourcePosts, 9000)
  const user = [
    `Prospect: ${input.prospectName}${input.prospectRole ? `, ${input.prospectRole}` : ""}`,
    input.focus ? `Focus topics requested by the agency: ${input.focus}` : "",
    sourceMaterial("The prospect's own public LinkedIn posts", source.text),
  ].filter(Boolean).join("\n\n")

  const system = [WRITING_POLICY, LANGUAGE_RULE, PITCH_TASK].join("\n\n")
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callAi("post-generation", system, user, {
      json: true,
      temperature: attempt ? 0.6 : 0.75,
      maxTokens: 3000,
      timeout: 40_000,
      userId: input.userId,
      plan: input.plan,
      cache: false,
    })
    const samples = parsePitchSamples(raw)
    if (samples) return samples
  }
  throw new Error("pitch_generation_invalid")
}

export async function countRecentPitches(ownerId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const rows = await supabaseSelect<{ id: string }>("pitch_previews", `owner_id=eq.${ownerId}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${PITCH_MONTHLY_LIMIT + 1}`)
  return rows?.length ?? 0
}

export async function savePitch(input: { ownerId: string; agencyName: string; prospectName: string; prospectRole: string | null; samples: PitchSample[] }) {
  const { token, hash } = issuePublicToken()
  const rows = await supabaseInsert<PitchRow>("pitch_previews", {
    owner_id: input.ownerId,
    agency_name: input.agencyName,
    prospect_name: input.prospectName,
    prospect_role: input.prospectRole,
    samples: input.samples,
    token_hash: hash,
    expires_at: new Date(Date.now() + PITCH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  })
  if (!rows?.[0]) throw new Error("pitch_save_failed")
  return { pitch: rows[0], url: `${env.frontendOrigin}/pitch/${token}` }
}

export async function listPitches(ownerId: string) {
  return (await supabaseSelect<PitchRow>("pitch_previews", `owner_id=eq.${ownerId}&select=${COLUMNS}&order=created_at.desc&limit=30`)) || []
}

export async function revokePitch(ownerId: string, pitchId: string) {
  if (!isUuid(pitchId)) throw new Error("not_found")
  const rows = await supabasePatch("pitch_previews", `id=eq.${pitchId}&owner_id=eq.${ownerId}&revoked_at=is.null`, { revoked_at: new Date().toISOString() })
  if (!rows?.length) throw new Error("not_found")
}

/**
 * Claim first, create second: the conditional PATCH on converted_at is the
 * single-use guard, and it is released if the workspace cannot be created.
 */
export async function convertPitchToClient(input: { ownerId: string; pitchId: string; maxClients: number | null }) {
  if (!isUuid(input.pitchId)) throw new Error("not_found")
  const claimed = await supabasePatch<PitchRow>(
    "pitch_previews",
    `id=eq.${input.pitchId}&owner_id=eq.${input.ownerId}&converted_at=is.null`,
    { converted_at: new Date().toISOString() }
  )
  const pitch = claimed?.[0]
  if (!pitch) {
    const existing = await supabaseSelect<PitchRow>("pitch_previews", `id=eq.${input.pitchId}&owner_id=eq.${input.ownerId}&select=id,converted_workspace_id&limit=1`)
    if (existing?.[0]) throw new Error("pitch_already_converted")
    throw new Error("not_found")
  }

  const { data: workspaceId, error } = await createServiceClient().rpc("create_client_workspace_with_limit", {
    p_user_id: input.ownerId,
    p_name: pitch.prospect_name,
    p_client_contact_name: pitch.prospect_name,
    p_client_contact_email: null,
    p_max_clients: input.maxClients,
  })
  if (error || !workspaceId) {
    await supabasePatch("pitch_previews", `id=eq.${pitch.id}`, { converted_at: null }).catch(() => undefined)
    throw new Error(error?.message?.includes("client_workspace_limit_reached") ? "workspace_limit_reached" : "workspace_create_failed")
  }

  const posts = new SupabasePostRepository()
  let drafts = 0
  for (const sample of pitch.samples) {
    const created = await posts.create({
      userId: input.ownerId,
      workspaceId: String(workspaceId),
      authorId: input.ownerId,
      title: sample.angle,
      content: sample.content,
      type: "linkedin",
      status: "draft",
    }).catch((caught) => {
      log.error("agency.pitch_convert_draft_failed", { pitchId: pitch.id, error: (caught as Error).message })
      return null
    })
    if (created) drafts++
  }

  await supabasePatch("pitch_previews", `id=eq.${pitch.id}`, { converted_workspace_id: workspaceId })
  return { workspaceId: String(workspaceId), workspaceName: pitch.prospect_name, drafts }
}

export async function loadPublicPitch(token: string) {
  const hash = hashPublicToken(token)
  if (!hash) return null
  const rows = await supabaseSelect<PitchRow>("pitch_previews", `token_hash=eq.${hash}&select=${COLUMNS}&limit=1`)
  const row = rows?.[0]
  if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) return null
  await createServiceClient().rpc("record_public_view", { p_table: "pitch_previews", p_id: row.id }).then(undefined, () => undefined)
  return {
    agencyName: row.agency_name,
    prospectName: row.prospect_name,
    prospectRole: row.prospect_role,
    samples: row.samples,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}
