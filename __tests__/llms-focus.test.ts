import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const read = async (path: "@/app/llms.txt/route" | "@/app/llms-full.txt/route") => {
  vi.resetModules()
  const { GET } = await import(path)
  return (await GET()).text()
}

describe("llms files while Career and Agency are paused", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_UNFROZEN_SURFACES", ""))
  afterEach(() => vi.unstubAllEnvs())

  it("describes the LinkedIn writer and nothing that now redirects", async () => {
    const index = await read("@/app/llms.txt/route")
    expect(index).toContain("asks the author a few questions")
    expect(index).toContain("feeds the two most recent real edits")
    for (const gone of ["/ats-resume-builder", "/career-visibility", "/free-tools/ats-resume-checker", "/use-cases/job-seekers", "/use-cases/agencies", "ATS Career Engine", "Client workspaces:"]) {
      expect(index, gone).not.toContain(gone)
    }
    expect(index).not.toContain("does not learn automatically from edits")
  })

  it("leaves the resume framework out of the full corpus", async () => {
    const full = await read("@/app/llms-full.txt/route")
    expect(full).not.toContain("Evidence-First Resume Readiness Framework")
    expect(full).not.toContain("Career Outcome Operating System")
    expect(full).not.toContain("/use-cases/job-seekers")
  })
})

describe("llms files with every surface back", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_UNFROZEN_SURFACES", "all"))
  afterEach(() => vi.unstubAllEnvs())

  it("restores the career and agency sections", async () => {
    const index = await read("@/app/llms.txt/route")
    expect(index).toContain("ATS Career Engine")
    expect(index).toContain("/use-cases/job-seekers")
    expect(await read("@/app/llms-full.txt/route")).toContain("Evidence-First Resume Readiness Framework")
  })
})
