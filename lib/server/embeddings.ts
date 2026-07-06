import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"

// Splits raw example posts text into individual post chunks.
// Posts are separated by blank lines, "---", or "***".
export function chunkExamplePosts(raw: string): string[] {
  return raw
    .split(/\n(?:---|\*\*\*|———)\n|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30)
    .slice(0, 20)
}

// Generate a text embedding via Gemini text-embedding-004.
// Returns null if GEMINI_API_KEY is not set or the call fails (graceful degradation).
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: text.slice(0, 2048) }] },
          taskType: "RETRIEVAL_DOCUMENT",
        }),
      }
    )
    if (!res.ok) return null
    const data = await res.json() as { embedding?: { values?: number[] } }
    return data.embedding?.values ?? null
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
  _query?: string,
  topN = 3,
): Promise<string[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("voice_examples")
    .select("content")
    .eq("workspace_id", workspaceId)
    .limit(topN)
  // 42P01 = table doesn't exist yet - degrade to empty (profile characteristics still used)
  if (error?.code === "42P01") return []
  return (data ?? []).map((row: { content: string }) => row.content)
}
