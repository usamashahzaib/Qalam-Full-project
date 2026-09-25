import { beforeEach, describe, expect, it, vi } from "vitest"

const counters = new Map<string, number>()
const redis = {
  incr: vi.fn(async (key: string) => { counters.set(key, (counters.get(key) ?? 0) + 1); return counters.get(key)! }),
  decr: vi.fn(async (key: string) => { counters.set(key, (counters.get(key) ?? 0) - 1); return counters.get(key)! }),
  pexpire: vi.fn(async () => 1),
}
const state = { redis: redis as typeof redis | null }
vi.mock("@/lib/server/env", () => ({ env: { authSecret: "test-secret" } }))
vi.mock("@/lib/server/redis", () => ({ getRedis: () => state.redis }))

import { claimIncludedScore, releaseIncludedScore, SCORES_PER_DRAFT, signDraftToken, verifyDraftToken } from "@/lib/server/draft-token"

beforeEach(() => { counters.clear(); state.redis = redis })

describe("draft token", () => {
  it("verifies for the user and workspace it was issued to", () => {
    const token = signDraftToken("user-1", "ws-1")
    expect(verifyDraftToken(token, "user-1", "ws-1")).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("rejects another user, another workspace, tampering and junk", () => {
    const token = signDraftToken("user-1", "ws-1")
    expect(verifyDraftToken(token, "user-2", "ws-1")).toBeNull()
    expect(verifyDraftToken(token, "user-1", "ws-2")).toBeNull()
    const decoded = Buffer.from(token, "base64url").toString("utf8").replace("user-1", "user-2")
    expect(verifyDraftToken(Buffer.from(decoded).toString("base64url"), "user-2", "ws-1")).toBeNull()
    expect(verifyDraftToken("not-a-token", "user-1", "ws-1")).toBeNull()
    expect(verifyDraftToken(undefined, "user-1", "ws-1")).toBeNull()
  })

  it("expires", () => {
    vi.useFakeTimers()
    const token = signDraftToken("user-1", null)
    vi.advanceTimersByTime(25 * 60 * 60 * 1000)
    expect(verifyDraftToken(token, "user-1", null)).toBeNull()
    vi.useRealTimers()
  })
})

describe("included scores", () => {
  it("covers a fixed number of scores per draft, then falls back to paid analyses", async () => {
    const results = []
    for (let i = 0; i < SCORES_PER_DRAFT + 1; i++) results.push(await claimIncludedScore("draft-a"))
    expect(results.slice(0, SCORES_PER_DRAFT).every(Boolean)).toBe(true)
    expect(results.at(-1)).toBe(false)
    expect(await claimIncludedScore("draft-b")).toBe(true)
  })

  it("gives a failed score back", async () => {
    for (let i = 0; i < SCORES_PER_DRAFT; i++) await claimIncludedScore("draft-c")
    await releaseIncludedScore("draft-c")
    expect(await claimIncludedScore("draft-c")).toBe(true)
  })

  it("charges normally when the counter is unavailable", async () => {
    state.redis = null
    expect(await claimIncludedScore("draft-d")).toBe(false)
  })
})
