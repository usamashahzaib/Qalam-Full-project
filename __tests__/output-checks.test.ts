import { describe, expect, it } from "vitest"
import { checkText, checkVariants, similarity, repairBrief } from "@/lib/prompts/output-checks"

const EN_DASH = String.fromCharCode(0x2013)

describe("checkText", () => {
  it("passes ordinary prose that uses common professional words", () => {
    // The old hasAiSlop() rejected any text containing "leverage" or "foster".
    // Objective checks must not make that judgment.
    const text = "We leverage the existing index instead of building a second one. It costs less to maintain and the query plan is easier to read."
    expect(checkText(text)).toEqual([])
  })

  it("flags an empty response", () => {
    expect(checkText("   ").map((d) => d.code)).toEqual(["empty"])
  })

  it("flags long dashes, markdown and narrating preambles", () => {
    const text = `Here is your post:\n\n## The heading\n\nA sentence ${EN_DASH} with a dash.`
    const codes = checkText(text).map((d) => d.code)
    expect(codes).toContain("long_dash")
    expect(codes).toContain("markdown_heading")
    expect(codes).toContain("preamble")
  })

  it("flags length violations in both directions", () => {
    expect(checkText("short", { minChars: 50 }).map((d) => d.code)).toContain("too_short")
    expect(checkText("x".repeat(40), { maxChars: 20 }).map((d) => d.code)).toContain("too_long")
  })

  it("gives every defect a repair instruction", () => {
    const defects = checkText(`Sure: \n# Heading`)
    expect(defects.length).toBeGreaterThan(0)
    for (const defect of defects) expect(defect.repair.length).toBeGreaterThan(10)
    expect(repairBrief(defects)).toContain("-")
  })
})

describe("checkVariants", () => {
  it("treats a synonym swap as a duplicate", () => {
    const a = "The migration timeline is the part everyone underestimates on these projects."
    const b = "The migration timeline is the piece everyone underestimates on these projects."
    expect(similarity(a, b)).toBeGreaterThan(0.6)

    const result = checkVariants([a, b], { expectedCount: 2 })
    expect(result.duplicateIndexes).toEqual([1])
    expect(result.defects.some((d) => d.code === "duplicate_variant")).toBe(true)
  })

  it("keeps genuinely different thoughts about the same post", () => {
    const variants = [
      "Curious how you handled the rollback path when the schema changed under load.",
      "The part about running both writes for a week is the bit most teams skip.",
      "Congratulations. Two years is a long time to carry that migration.",
    ]
    const result = checkVariants(variants, { expectedCount: 3 })
    expect(result.duplicateIndexes).toEqual([])
    expect(result.defects).toEqual([])
  })

  it("reports a short count so the caller can repair rather than ship two of three", () => {
    const result = checkVariants(["One thought about the post that stands on its own."], { expectedCount: 3 })
    expect(result.defects.some((d) => d.code === "wrong_count")).toBe(true)
  })
})
