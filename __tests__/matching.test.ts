import { describe, expect, it } from "vitest"
import {
  MIN_MATCH_SCORE,
  connectionPair,
  periodStart,
  scorePair,
  selectMatches,
  seniorityRank,
  type MatchParticipant,
} from "@/lib/matching"

const participant = (
  userId: string,
  attributes: Partial<MatchParticipant["attributes"]> = {}
): MatchParticipant => ({
  userId,
  workspaceId: `ws-${userId}`,
  displayName: userId,
  headline: "",
  attributes: {
    industry: "",
    seniority: "",
    location: "",
    expertise: [],
    audience: [],
    goals: [],
    ...attributes,
  },
})

describe("scorePair", () => {
  it("rewards a candidate whose expertise is the viewer's audience", () => {
    const viewer = participant("a", { audience: ["Founders"] })
    const candidate = participant("b", { expertise: ["founders"] })
    const result = scorePair(viewer, candidate)
    expect(result.score).toBeGreaterThanOrEqual(15)
    expect(result.reasons[0]).toContain("audience you write for")
  })

  it("is directional: reversing the pair does not produce the same reasons", () => {
    const viewer = participant("a", { audience: ["founders"] })
    const candidate = participant("b", { expertise: ["founders"] })
    expect(scorePair(viewer, candidate).reasons).not.toEqual(scorePair(candidate, viewer).reasons)
  })

  it("penalises two people with near identical expertise", () => {
    const attributes = { industry: "fintech", expertise: ["compliance", "risk", "aml"] }
    const overlapping = scorePair(participant("a", attributes), participant("b", attributes))
    const adjacent = scorePair(
      participant("a", { industry: "fintech", expertise: ["compliance", "risk", "aml"] }),
      participant("b", { industry: "fintech", expertise: ["compliance", "design", "growth"] })
    )
    expect(adjacent.score).toBeGreaterThan(overlapping.score)
  })

  it("penalises a large seniority gap", () => {
    const near = scorePair(
      participant("a", { industry: "saas", seniority: "senior engineer" }),
      participant("b", { industry: "saas", seniority: "lead engineer" })
    )
    const far = scorePair(
      participant("a", { industry: "saas", seniority: "intern" }),
      participant("b", { industry: "saas", seniority: "chief technology officer" })
    )
    expect(near.score).toBeGreaterThan(far.score)
  })

  it("caps the score at 100 and never returns a negative score", () => {
    const rich = {
      industry: "fintech",
      seniority: "senior",
      location: "lahore",
      expertise: ["payments", "compliance"],
      audience: ["payments", "compliance"],
      goals: ["hiring"],
    }
    const result = scorePair(participant("a", rich), participant("b", rich))
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.score).toBeGreaterThanOrEqual(0)
  })

  it("caps reasons at three so a card never overflows", () => {
    const rich = {
      industry: "fintech",
      seniority: "senior",
      location: "lahore",
      expertise: ["payments"],
      audience: ["payments"],
      goals: ["hiring"],
    }
    expect(scorePair(participant("a", rich), participant("b", rich)).reasons.length).toBeLessThanOrEqual(3)
  })
})

describe("seniorityRank", () => {
  it("returns -1 for an unknown or empty seniority", () => {
    expect(seniorityRank("")).toBe(-1)
    expect(seniorityRank("wizard")).toBe(-1)
  })

  it("ranks a founder above a junior", () => {
    expect(seniorityRank("co-founder")).toBeGreaterThan(seniorityRank("junior analyst"))
  })
})

describe("selectMatches", () => {
  const viewer = participant("me", { industry: "fintech", audience: ["compliance"] })
  const strong = participant("strong", { industry: "fintech", expertise: ["compliance", "audit"] })
  const weak = participant("weak", { industry: "retail", expertise: ["merchandising"] })

  it("never returns the viewer", () => {
    expect(selectMatches(viewer, [viewer, strong]).map((match) => match.participant.userId)).toEqual(["strong"])
  })

  it("drops candidates below the score floor", () => {
    expect(selectMatches(viewer, [weak], { minScore: MIN_MATCH_SCORE })).toEqual([])
  })

  it("honours the exclude set", () => {
    expect(selectMatches(viewer, [strong], { exclude: ["strong"] })).toEqual([])
  })

  it("is deterministic for the same pool", () => {
    const pool = [strong, participant("other", { industry: "fintech", expertise: ["compliance"] })]
    const first = selectMatches(viewer, pool).map((match) => match.participant.userId)
    const second = selectMatches(viewer, [...pool].reverse()).map((match) => match.participant.userId)
    expect(first).toEqual(second)
  })

  it("drops disqualified candidates before scoring, whatever they score", () => {
    expect(selectMatches(viewer, [strong], { disqualify: () => true })).toEqual([])
    expect(selectMatches(viewer, [strong], { disqualify: () => false })).toHaveLength(1)
  })

  it("respects the limit", () => {
    const pool = ["one", "two", "three", "four"].map((id) =>
      participant(id, { industry: "fintech", expertise: ["compliance"] })
    )
    expect(selectMatches(viewer, pool, { limit: 2 })).toHaveLength(2)
  })
})

describe("periodStart", () => {
  it("returns the Monday of the containing UTC week", () => {
    expect(periodStart(new Date("2026-08-25T23:00:00Z"))).toBe("2026-08-24")
    expect(periodStart(new Date("2026-08-24T00:00:00Z"))).toBe("2026-08-24")
    expect(periodStart(new Date("2026-08-30T23:59:00Z"))).toBe("2026-08-24")
    expect(periodStart(new Date("2026-08-31T00:00:00Z"))).toBe("2026-08-31")
  })
})

describe("connectionPair", () => {
  it("orders the pair identically whichever side responds second", () => {
    expect(connectionPair("b", "a")).toEqual(connectionPair("a", "b"))
    expect(connectionPair("a", "b").userA).toBe("a")
  })
})
