import "server-only"
import { createHash } from "node:crypto"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { generateEmbedding } from "@/lib/server/embeddings"
import { log } from "@/lib/server/logging"
import { referenceGuidance, type WritingReferenceInput } from "@/lib/writing-library"

const normalizeWriting = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim()
const digest = (value: string) => createHash("sha256").update(normalizeWriting(value)).digest("hex")

// All records by the same author remain in one split. Keep the salt stable.
export function authorSplit(authorKey: string): "train" | "test" {
  return parseInt(digest(`qalam-writing-v1:${normalizeWriting(authorKey)}`).slice(0, 8), 16) % 5 === 0 ? "test" : "train"
}

export function referenceRow(input: WritingReferenceInput, reviewer: string) {
  return {
    author_key: digest(input.authorKey), source: input.source,
    permission_evidence: input.permissionEvidence, permission_expires_at: input.permissionExpiresAt,
    reference_allowed: input.referenceAllowed, training_allowed: input.trainingAllowed,
    language: input.language.toLowerCase(), country: input.country, industry: input.industry,
    audience: input.audience, purpose: input.purpose, brief: input.brief, facts: input.facts,
    original_draft: input.originalDraft, final_text: input.finalText, editor_notes: input.editorNotes,
    content_hash: digest(input.finalText), original_hash: digest(input.originalDraft),
    split: authorSplit(input.authorKey), reviewed_by: reviewer,
  }
}

export async function retrieveWritingReferences(query: string, language?: string): Promise<string> {
  // Rollout requires a populated, permissioned library. No private examples are imported here.
  if (process.env.WRITING_REFERENCE_LIBRARY_ENABLED !== "true" || !query.trim()) return ""
  try {
    const embedding = await generateEmbedding(query, "RETRIEVAL_QUERY")
    if (!embedding) return ""
    const { data, error } = await createServiceClient().rpc("match_writing_references", {
      query_embedding: JSON.stringify(embedding), requested_language: language?.toLowerCase() || null,
      match_count: 3,
    })
    if (error) {
      log.warn("writing-library.retrieval_unavailable", { code: error.code })
      return ""
    }
    const rows = (data ?? []) as { final_text: string }[]
    log.info("writing-library.retrieved", { count: rows.length })
    return referenceGuidance(rows.map((row) => row.final_text))
  } catch {
    log.warn("writing-library.retrieval_failed")
    return ""
  }
}

export function trainingExample(row: { brief: string; facts: string; final_text: string }, system: string) {
  return { messages: [
    { role: "system", content: system },
    { role: "user", content: `Brief:\n${row.brief}\n\nSupplied facts:\n${row.facts}` },
    { role: "assistant", content: row.final_text },
  ] }
}
