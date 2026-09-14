import { describe, expect, it } from "vitest"
import { writingReferenceSchema, referenceGuidance } from "@/lib/writing-library"
import { authorSplit, referenceRow, trainingExample } from "@/lib/server/writing-library"
import { rankSemanticExamples, rankVoiceExamples } from "@/lib/server/embeddings"

const input = {
  authorKey: "author-one", source: "Owned original document", permissionEvidence: "Written permission for reference use only.",
  referenceAllowed: true, trainingAllowed: false, language: "English", country: "", industry: "Software",
  audience: "Engineers", purpose: "Explain a tradeoff", brief: "Explain why backups need restore tests.", facts: "No personal facts supplied.",
  originalDraft: "Backups are useful but testing them matters too.",
  finalText: "A backup is useful only if you can restore it. Test the restore before you need it.",
  editorNotes: "Replaced vague importance with a concrete action.", reviewed: true,
}

describe("permissioned writing library", () => {
  it("requires reviewed material and explicit permissions", () => {
    expect(writingReferenceSchema.safeParse(input).success).toBe(true)
    expect(writingReferenceSchema.safeParse({ ...input, reviewed: false }).success).toBe(false)
    expect(writingReferenceSchema.safeParse({ ...input, referenceAllowed: false }).success).toBe(false)
    expect(writingReferenceSchema.safeParse({ ...input, permissionExpiresAt: "2020-01-01T00:00:00Z" }).success).toBe(false)
  })
  it("keeps normalized author identities in the same split and detects normalized duplicates", () => {
    expect(authorSplit(" Author-ONE ")).toBe(authorSplit("author-one"))
    const row = referenceRow(writingReferenceSchema.parse(input), "admin@example.test")
    const duplicate = referenceRow(writingReferenceSchema.parse({ ...input, finalText: input.finalText.toUpperCase().replaceAll(" ", "  ") }), "admin@example.test")
    expect(row.content_hash).toBe(duplicate.content_hash)
    expect(row.training_allowed).toBe(false)
    expect(row.author_key).not.toContain("author-one")
  })
  it("exports only the brief, supplied facts and final answer, not invented background", () => {
    const row = referenceRow(writingReferenceSchema.parse(input), "admin@example.test")
    const exported = trainingExample(row, "Write clearly.")
    expect(exported.messages[1].content).toContain(input.facts)
    expect(exported.messages[2].content).toBe(input.finalText)
    expect(JSON.stringify(exported)).not.toContain(input.permissionEvidence)
    expect(referenceGuidance([input.finalText])).toContain("not the author's voice or personal history")
  })
})

describe("semantic voice selection", () => {
  it("ranks by meaning vectors even without shared words and handles serialized vectors", () => {
    expect(rankSemanticExamples([
      { content: "hiring hiring hiring", embedding: [0, 1] },
      { content: "Finding the right person for the team", embedding: "[2,0]" },
      { content: "Missing vector" },
    ], [1, 0], 2)).toEqual(["Finding the right person for the team", "hiring hiring hiring"])
  })
  it("handles invalid and zero vectors without breaking ordering", () => {
    expect(rankSemanticExamples([{ content: "invalid", embedding: "[" }, { content: "zero", embedding: [0, 0] }, { content: "good", embedding: [1, 0] }], [1, 0], 1)).toEqual(["good"])
  })
  it("matches non-Latin words in fallback search", () => {
    expect(rankVoiceExamples(["A general example.", "Команда обсуждает разработку продукта"], "разработку продукта", 1)).toEqual(["Команда обсуждает разработку продукта"])
  })
})
