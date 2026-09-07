import { beforeEach, describe, expect, it, vi } from "vitest"

const callAi = vi.fn()
const incrementUsage = vi.fn()
const decrementUsage = vi.fn()
const createPost = vi.fn()
const getWorkspaceVoiceProfile = vi.fn()

vi.mock("@/lib/server/ai-router-v2", () => ({
  callAi: (...args: unknown[]) => callAi(...args),
  safeParseJson: <T,>(raw: string): T | null => {
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },
}))
vi.mock("@/lib/server/plan-limits-v2", () => ({
  incrementUsage: (...args: unknown[]) => incrementUsage(...args),
  decrementUsage: (...args: unknown[]) => decrementUsage(...args),
}))
vi.mock("@/lib/server/workspace-usage", () => ({
  incrementWorkspaceUsage: vi.fn(async () => ({ allowed: true, remaining: 10 })),
  decrementWorkspaceUsage: vi.fn(async () => undefined),
}))
vi.mock("@/lib/server/voice-profile", () => ({
  getWorkspaceVoiceProfile: (...args: unknown[]) => getWorkspaceVoiceProfile(...args),
}))
vi.mock("@/lib/server/logging", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock("@/lib/repositories/supabase/SupabasePostRepository", () => ({
  SupabasePostRepository: class {
    create(...args: unknown[]) {
      return createPost(...args)
    }
  },
}))

import { generatePost } from "@/lib/use-cases/generate-post"
import { buildRevisePrompt } from "@/lib/prompts/role-aware-system"

const GOOD_DRAFT = [
  "We moved the nightly reconciliation job off the primary database this week.",
  "",
  "It was taking forty minutes and blocking the morning reports. Running it against a replica dropped it to nine, and nothing downstream noticed the change.",
  "",
  "If your batch jobs and your reporting share one database, that is usually the first thing worth separating.",
].join("\n")

const input = {
  topic: "moving batch jobs off the primary database",
  role: "Engineer",
  format: "medium" as const,
  userId: "user-1",
  authorId: "author-1",
  workspaceId: "ws-1",
  plan: "pro",
}

beforeEach(() => {
  callAi.mockReset()
  incrementUsage.mockReset()
  decrementUsage.mockReset()
  createPost.mockReset()
  getWorkspaceVoiceProfile.mockReset()
  incrementUsage.mockResolvedValue({ allowed: true, remaining: 5 })
  decrementUsage.mockResolvedValue(undefined)
  createPost.mockResolvedValue({ id: "post-1" })
  getWorkspaceVoiceProfile.mockResolvedValue(undefined)
})

const scoreJson = (total: number) =>
  JSON.stringify({ total_score: total, is_good_enough: total >= 82, biggest_weakness: "", fix_instruction: "" })

describe("the humanize pass is no longer unconditional", () => {
  it("does not spend a model call rewriting a draft that has nothing wrong with it", async () => {
    callAi
      .mockResolvedValueOnce(GOOD_DRAFT) // generate
      .mockResolvedValueOnce(scoreJson(88)) // score
      .mockResolvedValueOnce("[]") // hook variants

    const result = await generatePost({ ...input })

    expect(result.ok).toBe(true)
    const tasks = callAi.mock.calls.map((call) => call[0])
    // Previously: generate, humanize, score, hooks. The humanize call ran on
    // every draft, with no voice profile, and rewrote text that was fine.
    expect(tasks).toEqual(["post-generation", "post-scoring", "hook-generation"])
  })

  it("revises when the draft has an objective defect, and names the defect", async () => {
    callAi
      .mockResolvedValueOnce(["Sure, here is your post:", "", GOOD_DRAFT].join("\n"))
      .mockResolvedValueOnce(GOOD_DRAFT)
      .mockResolvedValueOnce(scoreJson(88))
      .mockResolvedValueOnce("[]")

    const result = await generatePost({ ...input })

    const tasks = callAi.mock.calls.map((call) => call[0])
    expect(tasks).toEqual(["post-generation", "post-improvement", "post-scoring", "hook-generation"])

    const revisionSystem = callAi.mock.calls[1][1] as string
    expect(revisionSystem).toContain("narrating preamble")
    expect(revisionSystem).toContain("Delete the introductory line")

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.post.content).not.toContain("here is your post")
  })

  it("keeps the original draft when the revision does not improve it", async () => {
    const bad = "Here is your post:\n\n# Heading\n\n" + GOOD_DRAFT
    callAi
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce("Sure: \n# Still broken\n\n" + GOOD_DRAFT) // worse revision
      .mockResolvedValueOnce(scoreJson(88))
      .mockResolvedValueOnce("[]")

    const result = await generatePost({ ...input })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.post.content).toContain("reconciliation job")
  })
})

describe("voice propagation through the pipeline", () => {
  it("passes the voice profile into generation, revision and hook variants", async () => {
    getWorkspaceVoiceProfile.mockResolvedValue({
      tone: "flat and technical",
      sentenceLength: "medium",
      vocabulary: ["replica lag", "cutover"],
    })

    callAi
      .mockResolvedValueOnce("Here is your post:\n\n" + GOOD_DRAFT) // triggers revision
      .mockResolvedValueOnce(GOOD_DRAFT)
      .mockResolvedValueOnce(scoreJson(88))
      .mockResolvedValueOnce("[]")

    await generatePost({ ...input })

    const generationSystem = callAi.mock.calls[0][1] as string
    const revisionSystem = callAi.mock.calls[1][1] as string
    const hooksSystem = callAi.mock.calls[3][1] as string

    expect(generationSystem).toContain("flat and technical")
    // Regression: buildHumanizePrompt(rawPost, role) took no voice profile at
    // all, so the pass that touched every draft did not know how the author
    // writes.
    expect(revisionSystem).toContain("flat and technical")
    expect(revisionSystem).toContain("replica lag")
    expect(hooksSystem).toContain("flat and technical")
  })

  it("tells the revision to preserve wording that already sounds like the author", () => {
    const { system } = buildRevisePrompt(
      GOOD_DRAFT,
      "Engineer",
      [{ code: "long_dash", detail: "Contains a long dash.", repair: "Use a hyphen." }],
      { tone: "flat and technical" }
    )

    expect(system).toContain("FIX EXACTLY THESE PROBLEMS AND NOTHING ELSE")
    expect(system).toContain("Use a hyphen")
    expect(system).toContain("Untouched is the correct outcome for most of the post")
    expect(system).toContain("Do not add a new claim")
  })
})

describe("final validation and bounded work", () => {
  it("validates the candidate after the score-driven rewrite, not just the first draft", async () => {
    const rewritten = GOOD_DRAFT.replace("forty minutes", "forty minutes flat")
    callAi
      .mockResolvedValueOnce(GOOD_DRAFT)
      .mockResolvedValueOnce(JSON.stringify({ total_score: 60, fix_instruction: "Name the job", biggest_weakness: "vague" }))
      .mockResolvedValueOnce(rewritten)
      .mockResolvedValueOnce(scoreJson(88))
      .mockResolvedValueOnce("[]")

    const result = await generatePost({ ...input })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.post.content).toContain("forty minutes flat")
    expect(createPost).toHaveBeenCalledTimes(1)
  })

  it("does not let an empty rewrite replace a usable draft", async () => {
    callAi
      .mockResolvedValueOnce(GOOD_DRAFT)
      .mockResolvedValueOnce(JSON.stringify({ total_score: 60, fix_instruction: "Sharpen it", biggest_weakness: "vague" }))
      .mockResolvedValueOnce("   ")
      .mockResolvedValueOnce("[]")

    const result = await generatePost({ ...input })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.post.content).toContain("reconciliation job")
  })

  it("caps the score-driven rewrite loop at two attempts", async () => {
    callAi.mockImplementation(async (task: string) => {
      if (task === "post-generation") return GOOD_DRAFT
      if (task === "post-scoring") return JSON.stringify({ total_score: 40, fix_instruction: "Fix it", biggest_weakness: "weak" })
      if (task === "hook-generation") return "[]"
      return GOOD_DRAFT + " Extra sentence to keep it changing."
    })

    await generatePost({ ...input })

    const improvementCalls = callAi.mock.calls.filter((call) => call[0] === "post-improvement")
    expect(improvementCalls.length).toBeLessThanOrEqual(2)
  })

  it("refunds the draft credit when generation fails instead of shipping filler", async () => {
    callAi.mockImplementation(async () => {
      throw new Error("provider down")
    })

    const result = await generatePost({ ...input })

    expect(result.ok).toBe(false)
    expect(decrementUsage).toHaveBeenCalledWith("user-1", "drafts")
    expect(createPost).not.toHaveBeenCalled()
  })
})
