import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { comingSoon, comingSoonHref, frozenSurfaceFor, isFrozenPath, withoutFrozen } from "@/lib/frozen-surfaces"

describe("frozen surfaces", () => {
  // vitest.config.ts unfreezes everything for the rest of the suite.
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_UNFROZEN_SURFACES", ""))
  afterEach(() => vi.unstubAllEnvs())

  it("freezes paused pages and their APIs, not their neighbours", () => {
    expect(frozenSurfaceFor("/career/resumes/abc")).toBe("career")
    expect(frozenSurfaceFor("/api/agency/clients")).toBe("agency")
    expect(frozenSurfaceFor("/free-tools/viral-checker")).toBe("prediction-tools")
    expect(isFrozenPath("/careers")).toBe(false)
    expect(isFrozenPath("/writer")).toBe(false)
    expect(isFrozenPath("/api/jobs")).toBe(false)
    expect(isFrozenPath("/free-tools/hook-generator")).toBe(false)
  })

  it("lets a surface back in through NEXT_PUBLIC_UNFROZEN_SURFACES", () => {
    vi.stubEnv("NEXT_PUBLIC_UNFROZEN_SURFACES", "agency, chat")
    expect(isFrozenPath("/agency")).toBe(false)
    expect(isFrozenPath("/chat")).toBe(false)
    expect(isFrozenPath("/career")).toBe(true)
    vi.stubEnv("NEXT_PUBLIC_UNFROZEN_SURFACES", "all")
    expect(isFrozenPath("/career")).toBe(false)
  })

  it("filters link lists by relative or absolute href", () => {
    const links = [{ href: "/writer" }, { href: "https://www.byqalam.com/ats-resume-builder" }, { href: "/use-cases/founders" }]
    expect(withoutFrozen(links, (link) => link.href)).toEqual([{ href: "/writer" }, { href: "/use-cases/founders" }])
  })
})

describe("coming soon", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_UNFROZEN_SURFACES", ""))

  it("lists paused surfaces but not the prediction tools", () => {
    const names = comingSoon().map((item) => item.surface)
    expect(names).toEqual(["agency", "career", "chat", "competitors"])
  })

  it("drops a surface once it is unfrozen", () => {
    vi.stubEnv("NEXT_PUBLIC_UNFROZEN_SURFACES", "agency")
    expect(comingSoon().map((item) => item.surface)).not.toContain("agency")
    vi.stubEnv("NEXT_PUBLIC_UNFROZEN_SURFACES", "all")
    expect(comingSoon()).toEqual([])
  })

  it("sends a paused page to its note, and has no note for the prediction tools", () => {
    expect(comingSoonHref("/agency/clients")).toBe("/coming-soon#agency")
    expect(comingSoonHref("/ats-resume-builder")).toBe("/coming-soon#career")
    expect(comingSoonHref("/free-tools/viral-checker")).toBeNull()
    expect(comingSoonHref("/writer")).toBeNull()
  })
})
