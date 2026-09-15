import "server-only"

import { supabaseDelete, supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"
import { isUuid } from "@/lib/server/agency/ids"
import type { VoicePassportPrompt } from "@/lib/prompts/role-profiles"

export const PASSPORT_KINDS = ["do", "dont", "banned_phrase", "correction"] as const
export type PassportKind = (typeof PASSPORT_KINDS)[number]
export const MAX_PASSPORT_ENTRIES = 150

export type PassportEntry = {
  id: string
  workspace_id: string
  kind: PassportKind
  body: string
  note: string | null
  source_approval_id: string | null
  created_by: string | null
  created_at: string
}

const COLUMNS = "id,workspace_id,kind,body,note,source_approval_id,created_by,created_at"

export async function getVoicePassport(workspaceId: string) {
  const [entries, workspaces] = await Promise.all([
    supabaseSelect<PassportEntry>("voice_passport_entries", `workspace_id=eq.${workspaceId}&select=${COLUMNS}&order=created_at.desc&limit=${MAX_PASSPORT_ENTRIES}`),
    supabaseSelect<{ voice_passport_summary: string | null }>("workspaces", `id=eq.${workspaceId}&select=voice_passport_summary&limit=1`),
  ])
  return { summary: workspaces?.[0]?.voice_passport_summary ?? null, entries: entries || [] }
}

export async function addPassportEntry(input: { workspaceId: string; kind: PassportKind; body: string; note?: string | null; sourceApprovalId?: string | null; createdBy: string }) {
  const existing = await supabaseSelect<{ id: string }>("voice_passport_entries", `workspace_id=eq.${input.workspaceId}&select=id&limit=${MAX_PASSPORT_ENTRIES}`)
  if ((existing?.length ?? 0) >= MAX_PASSPORT_ENTRIES) throw new Error("passport_full")
  if (input.sourceApprovalId) {
    const approvals = await supabaseSelect<{ id: string }>("approvals", `id=eq.${input.sourceApprovalId}&workspace_id=eq.${input.workspaceId}&select=id&limit=1`)
    if (!approvals?.length) throw new Error("invalid_input")
  }
  const rows = await supabaseInsert<PassportEntry>("voice_passport_entries", {
    workspace_id: input.workspaceId,
    kind: input.kind,
    body: input.body,
    note: input.note || null,
    source_approval_id: input.sourceApprovalId || null,
    created_by: input.createdBy,
  })
  if (!rows?.[0]) throw new Error("passport_entry_failed")
  return rows[0]
}

export async function deletePassportEntry(workspaceId: string, entryId: string, actor: { userId: string; canManage: boolean }) {
  if (!isUuid(entryId)) throw new Error("not_found")
  const rows = await supabaseSelect<PassportEntry>("voice_passport_entries", `id=eq.${entryId}&workspace_id=eq.${workspaceId}&select=${COLUMNS}&limit=1`)
  const entry = rows?.[0]
  if (!entry) throw new Error("not_found")
  if (!actor.canManage && entry.created_by !== actor.userId) throw new Error("forbidden")
  await supabaseDelete("voice_passport_entries", `id=eq.${entryId}&workspace_id=eq.${workspaceId}`)
}

export async function updatePassportSummary(workspaceId: string, summary: string | null) {
  const rows = await supabasePatch<{ voice_passport_summary: string | null }>("workspaces", `id=eq.${workspaceId}`, {
    voice_passport_summary: summary,
    updated_at: new Date().toISOString(),
  })
  if (!rows?.length) throw new Error("not_found")
  return rows[0].voice_passport_summary
}

/**
 * Prompt-ready passport. Never throws: a generation must not fail because
 * the passport table is unavailable, it just runs without the rules.
 */
export async function getPromptPassport(workspaceId?: string | null): Promise<VoicePassportPrompt | undefined> {
  if (!isUuid(workspaceId)) return undefined
  try {
    const { summary, entries } = await getVoicePassport(workspaceId)
    const pick = (kind: PassportKind) => entries.filter((entry) => entry.kind === kind).slice(0, 25)
    const passport: VoicePassportPrompt = {
      summary: summary || undefined,
      do: pick("do").map((entry) => entry.body),
      dont: pick("dont").map((entry) => entry.body),
      bannedPhrases: pick("banned_phrase").map((entry) => entry.body),
      corrections: pick("correction").map((entry) => entry.note ? `${entry.body} (${entry.note})` : entry.body),
    }
    const empty = !passport.summary && !passport.do.length && !passport.dont.length && !passport.bannedPhrases.length && !passport.corrections.length
    return empty ? undefined : passport
  } catch (error) {
    log.warn("voice_passport.prompt_load_failed", { workspaceId, error: (error as Error).message })
    return undefined
  }
}
