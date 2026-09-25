import { describe, expect, it, vi } from "vitest"
import { detectAiPatterns, isFlatRhythm, proseLeaves } from "@/lib/prompts/ai-patterns"
import { enforceHumanWriting } from "@/lib/prompts/enforce-human-writing"

const HUMAN = `We shipped the billing fix on Tuesday. Took three tries.

The first attempt broke refunds for anyone on an annual plan, which nobody caught because our test accounts are all monthly. I found out from a support ticket at 11pm.

So now every release gets one annual account run through it by hand. Boring. It works.`

const SLOP = `In today's fast-paced world, content has emerged as a pivotal tool for founders.

It's not just about posting, it's about building trust. This approach helps teams stay consistent, ensuring that every post lands. This means brands can be fast, flexible, and powerful while staying clear, concise, and focused.

Ultimately, the key is finding what works best for you.`

const codes = (text: string) => detectAiPatterns(text).map((d) => d.code)

describe("detectAiPatterns", () => {
  it("leaves plain human writing alone", () => {
    expect(codes(HUMAN)).toEqual([])
  })

  it("flags the machine patterns from every layer", () => {
    const found = codes(SLOP)
    expect(found).toEqual(expect.arrayContaining(["ai_phrase", "ai_participial_tail", "ai_triad", "ai_this_opener", "ai_summary_closer"]))
  })

  it("quotes what it found so the repair pass knows what to change", () => {
    const phrase = detectAiPatterns(SLOP).find((d) => d.code === "ai_phrase")
    expect(phrase?.detail).toContain("pivotal")
    expect(phrase?.repair).toBeTruthy()
  })

  it("ignores quoted text, which is someone else's words", () => {
    expect(codes('Your hook says "a game-changer that will delve into the realm of growth". Cut it to the actual claim.')).toEqual([])
  })

  it("does not flag a single ordinary professional word", () => {
    expect(codes("We leverage the existing search index, so the new page loads in under a second.")).toEqual([])
  })

  it("flags stacked stock vocabulary", () => {
    expect(codes("We leverage robust, holistic tooling to empower stakeholders.")).toContain("ai_vocabulary_cluster")
  })

  it("leaves Roman Urdu alone", () => {
    expect(codes("Kal client ne poocha ke post kab jayegi. Maine kaha jab tak draft theek nahi hota, tab tak nahi.")).toEqual([])
  })

  it("counts only real three-item lists, not the end of a longer list", () => {
    expect(codes("Each workspace has its own voice profile, drafts, hooks, carousels, archive, and analytics. Roles are owner, admin, editor, client reviewer, or viewer.")).toEqual([])
  })

  it("does not read list nouns or product names as trailing clauses or boilerplate", () => {
    expect(codes("Client facts, resume versions, positioning decisions, and action plans get scattered.")).toEqual([])
    expect(codes("Agencies use Qalam as an AI ghostwriting tool for client work.")).toEqual([])
    expect(codes("The rollout slipped, allowing the team to fix billing first.")).toContain("ai_participial_tail")
  })

  it("does not count HTML entities as semicolons", () => {
    expect(codes("A tool that writes in anybody&rsquo;s voice is writing in nobody&rsquo;s.")).toEqual([])
  })

  it("catches boilerplate and unfilled placeholders", () => {
    expect(codes("Certainly! Here is a note for [Client Name]. I hope this helps.")).toEqual(expect.arrayContaining(["ai_boilerplate", "ai_placeholder"]))
    expect(detectAiPatterns("Cut costs by [% cost saved].", { allowPlaceholders: true })).toEqual([])
  })
})

describe("isFlatRhythm", () => {
  it("flags a flatline of same-length sentences", () => {
    const flat = Array.from({ length: 7 }, (_, i) => `Our team reviewed the quarterly numbers again today and found item ${i} unchanged.`).join(" ")
    expect(isFlatRhythm(flat).flat).toBe(true)
  })

  it("accepts varied rhythm", () => {
    expect(isFlatRhythm(HUMAN).flat).toBe(false)
  })
})

const parseJson = (raw: string) => { try { return JSON.parse(raw) } catch { return null } }

describe("enforceHumanWriting", () => {
  it("keeps a repair that removes the patterns", async () => {
    const repair = vi.fn().mockResolvedValue(HUMAN)
    const result = await enforceHumanWriting(SLOP, { json: false, repair, parseJson })
    expect(result.content).toBe(HUMAN)
    expect(result.repaired).toBe(true)
    expect(repair).toHaveBeenCalledTimes(1)
  })

  it("rejects a repair that is no cleaner and keeps the original", async () => {
    const repair = vi.fn().mockResolvedValue(SLOP)
    const result = await enforceHumanWriting(SLOP, { json: false, repair, parseJson })
    expect(result.content).toBe(SLOP)
    expect(result.repaired).toBe(false)
    expect(result.remaining.length).toBeGreaterThan(0)
  })

  it("does not call the model for clean text", async () => {
    const repair = vi.fn()
    await enforceHumanWriting(HUMAN, { json: false, repair, parseJson })
    expect(repair).not.toHaveBeenCalled()
  })

  it("replaces only flagged JSON fields and never touches numbers", async () => {
    const original = { score: 71, tip: "Keep the second paragraph exactly as it is, it already works.", rewrite: "Let's delve into why a robust, holistic, scalable plan matters." }
    const clean = "Here is why the plan matters to your team this quarter."
    const repair = vi.fn().mockResolvedValue(JSON.stringify({ rewrite: clean, tip: "changed", score: 5 }))
    const result = await enforceHumanWriting(JSON.stringify(original), { json: true, repair, parseJson })
    const out = JSON.parse(result.content)
    expect(out).toEqual({ ...original, rewrite: clean })
    expect(proseLeaves(out).map((l) => l.path)).toEqual(["tip", "rewrite"])
  })
})
