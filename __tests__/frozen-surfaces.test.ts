import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { frozenSurfaceFor, isFrozenPath, withoutFrozen } from "@/lib/frozen-surfaces"

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
