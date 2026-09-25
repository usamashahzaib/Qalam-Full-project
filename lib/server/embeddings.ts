import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
import { chunkExamplePosts } from "@/lib/voice-measure"

export { chunkExamplePosts } from "@/lib/voice-measure"

// Generate a text embedding via Gemini embedding.
// Returns null if GEMINI_API_KEY is not set or the call fails (graceful degradation).
export async function generateEmbedding(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(5000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: text.slice(0, 8000) }] },
          taskType,
          outputDimensionality: 768,
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json() as { embedding?: { values?: number[] } }
    const values = data.embedding?.values
    if (!values || values.length !== 768 || !values.every(Number.isFinite)) return null
    const norm = Math.hypot(...values)
    return norm > 0 ? values.map((value) => value / norm) : null
  } catch {
    return null
  }
}

// Upserts chunked voice examples into voice_examples table.
// Embeddings are generated and stored when pgvector + Gemini are available.
// Falls back silently when voice_examples table doesn't exist yet (migration pending).
export async function storeVoiceExamples(
  workspaceId: string,
  userId: string,
  rawExamplePosts: string,
): Promise<void> {
  const chunks = chunkExamplePosts(rawExamplePosts)
  if (!chunks.length) return

  const supabase = createServiceClient()

  // Remove old examples for this workspace before inserting new ones
  const { error: delErr } = await supabase.from("voice_examples").delete().eq("workspace_id", workspaceId)
  // 42P01 = table doesn't exist (migration pending) - skip silently
  if (delErr?.code === "42P01") return

  const rows = await Promise.all(
    chunks.map(async (content) => {
      const embedding = await generateEmbedding(content)
      const row: Record<string, unknown> = { workspace_id: workspaceId, user_id: userId, content }
      if (embedding) row.embedding = JSON.stringify(embedding)
      return row
    })
  )

  await supabase.from("voice_examples").insert(rows)
}

// Retrieves the top-N most relevant voice examples for a given query.
// Falls back to empty array when voice_examples table doesn't exist yet (migration pending).
export async function retrieveVoiceExamples(
  workspaceId: string,
  query?: string,
  topN = 3,
): Promise<string[]> {
  const supabase = createServiceClient()
  let { data, error } = await supabase
    .from("voice_examples")
    .select("content, embedding")
    .eq("workspace_id", workspaceId)
    .limit(20)
  if (error?.code === "42703" || error?.code === "PGRST204") {
    const fallback = await supabase.from("voice_examples").select("content").eq("workspace_id", workspaceId).limit(20)
    data = fallback.data as typeof data
    error = fallback.error
  }
  // 42P01 = table doesn't exist yet - degrade to empty (profile characteristics still used)
  if (error?.code === "42P01") return []
  const rows = (data ?? []) as { content: string; embedding?: unknown }[]
  if (query?.trim() && rows.some((row) => parseEmbedding(row.embedding))) {
    const queryVector = await generateEmbedding(query, "RETRIEVAL_QUERY")
    if (queryVector) return rankSemanticExamples(rows, queryVector, topN)
  }
  const examples = rows.map((row) => row.content)
  return rankVoiceExamples(examples, query, topN)
}

export function rankVoiceExamples(examples: string[], query?: string, topN = 3): string[] {
  const normalizedQuery = query?.trim().toLowerCase() ?? ""
  if (!normalizedQuery) return examples.slice(0, topN)

  const terms = [...new Set(normalizedQuery.match(/[\p{L}\p{N}]{2,}/gu) ?? [])]
  if (!terms.length) return examples.slice(0, topN)

  return examples
    .map((content, index) => {
      const haystack = content.toLowerCase()
      const overlap = terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0)
      return { content, index, score: overlap }
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, topN)
    .map(({ content }) => content)
}

function parseEmbedding(value: unknown): number[] | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every((n) => typeof n === "number" && Number.isFinite(n)) ? parsed : null
  } catch { return null }
}

export function rankSemanticExamples(rows: { content: string; embedding?: unknown }[], query: number[], topN = 3): string[] {
  return rows.map((row, index) => {
    const vector = parseEmbedding(row.embedding)
    const norm = vector ? Math.hypot(...vector) * Math.hypot(...query) : 0
    const score = vector?.length === query.length && norm > 0
      ? vector.reduce((sum, value, i) => sum + value * query[i], 0) / norm : -2
    return { content: row.content, score, index }
  }).sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, topN)).map((row) => row.content)
}
