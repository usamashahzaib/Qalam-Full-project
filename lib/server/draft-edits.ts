import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"

// What the author changes between the AI draft and the post they keep is the most honest voice
// signal Qalam gets. The AI draft is saved in posts.metadata.aiDraft next to the final content,
// and the newest pairs go back into the next generation as examples of how this person edits.

export const MAX_AI_DRAFT_CHARS = 6000
export type DraftEdit = { before: string; after: string }

export function cleanAiDraft(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, MAX_AI_DRAFT_CHARS) : undefined
}

const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []

/** Share of words that differ between two versions, 0 (same) to 1 (nothing shared). */
export function editRatio(before: string, after: string): number {
  const a = words(before)
  const b = words(after)
  if (!a.length && !b.length) return 0
  const counts = new Map<string, number>()
  for (const word of a) counts.set(word, (counts.get(word) ?? 0) + 1)
  let shared = 0
  for (const word of b) {
    const left = counts.get(word) ?? 0
    if (left > 0) { shared++; counts.set(word, left - 1) }
  }
  return 1 - shared / Math.max(a.length, b.length)
}

// Under 3% is a typo fix. Over 85% is a different post, not an edit of this one.
export const isTeachingEdit = ({ before, after }: DraftEdit) => {
  const ratio = editRatio(before, after)
  return ratio >= 0.03 && ratio <= 0.85
}

const KEPT_STATUSES = ["approved", "scheduled", "notified", "published"]

export async function getRecentDraftEdits(workspaceId: string, limit = 2): Promise<DraftEdit[]> {
  const { data, error } = await createServiceClient()
    .from("posts")
    .select("content, metadata")
    .eq("workspace_id", workspaceId)
    .in("status", KEPT_STATUSES)
    .not("metadata->>aiDraft", "is", null)
    .order("updated_at", { ascending: false })
    .limit(10)
  if (error) {
    log.warn("draft_edits.read_failed", { error: error.message })
    return []
  }
  return (data ?? [])
    .map((row) => ({
      before: cleanAiDraft((row.metadata as { aiDraft?: unknown } | null)?.aiDraft) ?? "",
      after: typeof row.content === "string" ? row.content.trim() : "",
    }))
    .filter((pair) => pair.before && pair.after && isTeachingEdit(pair))
    .slice(0, limit)
}
