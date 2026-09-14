import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminRequest } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { generateEmbedding } from "@/lib/server/embeddings"
import { referenceRow, trainingExample } from "@/lib/server/writing-library"
import { writingReferenceSchema } from "@/lib/writing-library"
import { WRITING_POLICY } from "@/lib/prompts/writing-policy"

export const maxDuration = 60
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
const privateHeaders = { "Cache-Control": "private, no-store" }

export async function GET(request: NextRequest) {
  try { await requireAdminRequest(request) } catch { return fail("not_found", 404) }
  const split = request.nextUrl.searchParams.get("export")
  const db = createServiceClient()
  if (split) {
    if (split !== "train" && split !== "test") return fail("Choose train or test.", 400)
    const rows: { id: string; brief: string; facts: string; final_text: string }[] = []
    // Paginate rather than silently exporting only PostgREST's first 1,000 records.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db.from("writing_references")
        .select("id, brief, facts, final_text").eq("split", split).eq("training_allowed", true)
        .is("revoked_at", null).or(`permission_expires_at.is.null,permission_expires_at.gt.${new Date().toISOString()}`)
        .order("id").range(offset, offset + 499)
      if (error) return fail("Export unavailable. Check the writing library migration.", 503)
      rows.push(...(data ?? []))
      if (!data || data.length < 500) break
      if (rows.length >= 10000) return fail("Export exceeds 10,000 records. Export a smaller versioned dataset before training.", 413)
    }
    if (!rows.length) return fail("No eligible examples in this split yet.", 409)
    return new NextResponse(rows.map((row) => JSON.stringify(trainingExample(row, WRITING_POLICY))).join("\n") + "\n", {
      headers: { ...privateHeaders, "Content-Type": "application/x-ndjson", "Content-Disposition": `attachment; filename="qalam-writing-${split}.jsonl"` },
    })
  }
  const page = Math.max(0, Math.min(100000, Number(request.nextUrl.searchParams.get("page")) || 0))
  const { data, error, count } = await db.from("writing_references")
    .select("id, language, country, industry, audience, purpose, split, reference_allowed, training_allowed, revoked_at, permission_expires_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false }).range(page * 50, page * 50 + 49)
  if (error) return fail("Writing library unavailable. Apply its database migration first.", 503)
  return NextResponse.json({ references: data, count }, { headers: privateHeaders })
}

export async function POST(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdminRequest>>
  try { admin = await requireAdminRequest(request) } catch { return fail("not_found", 404) }
  const parsed = writingReferenceSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Check the example.", 400)
  const row = referenceRow(parsed.data, admin.email)
  const embedding = await generateEmbedding(`${row.language}\n${row.industry}\n${row.audience}\n${row.purpose}\n${row.final_text}`)
  if (!embedding) return fail("Could not prepare this example for search. Check Gemini access and retry.", 503)
  const { data, error } = await createServiceClient().from("writing_references")
    .insert({ ...row, embedding: JSON.stringify(embedding) }).select("id, split").single()
  if (error?.code === "23505") return fail("This draft or final text is already in the library. Do not add the same material to another split.", 409)
  if (error) return fail("Example could not be saved. Check the writing library migration.", 503)
  return NextResponse.json({ reference: data }, { status: 201, headers: privateHeaders })
}

export async function DELETE(request: NextRequest) {
  try { await requireAdminRequest(request) } catch { return fail("not_found", 404) }
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail("A valid example ID is required.", 400)
  // Remove content and embeddings, not just the ability to search them.
  const { error } = await createServiceClient().from("writing_references").delete().eq("id", parsed.data.id)
  if (error) return fail("Example could not be removed.", 503)
  return NextResponse.json({ ok: true }, { headers: privateHeaders })
}
