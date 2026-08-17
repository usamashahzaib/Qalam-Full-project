import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { ATS_FACTORS, ATS_FAQS } from "@/lib/ats-methodology"
import { PUBLIC_ROUTES } from "@/lib/seo"

describe("ATS search and answer discovery", () => {
  it("publishes a complete evidence-first methodology", () => {
    expect(ATS_FACTORS).toHaveLength(8)
    expect(ATS_FACTORS.reduce((total, factor) => total + factor.weight, 0)).toBe(100)
    expect(ATS_FAQS.length).toBeGreaterThanOrEqual(5)
  })

  it("exposes the checker and methodology in discovery surfaces", () => {
    const paths = PUBLIC_ROUTES.map((route) => route.path)
    expect(paths).toContain("/free-tools/ats-resume-checker")
    expect(paths).toContain("/methodology/ats-resume-readiness")
    expect(readFileSync(resolve(process.cwd(), "app/robots.ts"), "utf8")).toContain('userAgent: "OAI-SearchBot"')
    expect(readFileSync(resolve(process.cwd(), "app/llms.txt/route.ts"), "utf8")).toContain("Evidence-First Resume Readiness Framework")
  })
})
