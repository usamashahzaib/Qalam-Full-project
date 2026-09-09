import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

// A job description used to be mandatory, so anyone who wanted a clean
// ATS-safe resume without a specific posting in hand hit a generic 400 that
// named no field. These cover the two halves of that fix: generation succeeds
// with no job description, and a genuinely invalid field is named.

const insertedRows: Record<string, unknown>[] = []

const mocks = vi.hoisted(() => ({
  requirePlan: vi.fn(),
  authorizeRole: vi.fn(),
  callAi: vi.fn(),
  consumeCareerUsage: vi.fn(),
  refundCareerUsage: vi.fn(),
  claimExtraResumeCredit: vi.fn(),
  releaseExtraResumeCredit: vi.fn(),
}))

vi.mock("@/lib/server/auth", () => ({
  withAuth:
    (handler: (request: NextRequest, user: { id: string }) => Promise<Response>) =>
    (request: NextRequest) =>
      handler(request, { id: "user-1" }),
}))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan: mocks.requirePlan }))
vi.mock("@/lib/server/roles", () => ({ authorizeRole: mocks.authorizeRole }))
vi.mock("@/lib/server/ai-router-v2", () => ({
  callAi: mocks.callAi,
  safeParseJson: (raw: string) => JSON.parse(raw),
}))
vi.mock("@/lib/server/career-usage", () => ({
  consumeCareerUsage: mocks.consumeCareerUsage,
  refundCareerUsage: mocks.refundCareerUsage,
  claimExtraResumeCredit: mocks.claimExtraResumeCredit,
  releaseExtraResumeCredit: mocks.releaseExtraResumeCredit,
}))
vi.mock("@/lib/server/supabase-rest", () => ({
  createScopedClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.maybeSingle = async () => ({ data: null, error: null })
      chain.single = async () => ({ data: { id: "resume-1" }, error: null })
      chain.delete = () => chain
      chain.insert = (row: Record<string, unknown>) => {
        insertedRows.push({ table, ...row })
        return chain
      }
      chain.raw = {
        insert: async (row: Record<string, unknown>) => {
          insertedRows.push({ table, ...row })
          return { data: null, error: null }
        },
      }
      return chain
    },
  }),
}))

const aiResponse = JSON.stringify({
  resume: {
    fullName: "",
    email: "[email removed]",
    phone: "",
    location: "",
    linkedinUrl: "",
    headline: "Senior Backend Engineer",
    summary: "Backend engineer with eight years across payments and infrastructure.",
    skills: ["Go", "PostgreSQL"],
    experience: [
      { title: "Backend Engineer", organization: "Acme", location: "", startDate: "2020", endDate: "2024", bullets: ["Shipped the payments API."] },
    ],
    education: [],
    certifications: [],
    projects: [],
  },
  analysis: { overall_score: 82, scores: { ats: 88, relevance: 80, impact: 75, clarity: 84, career_progression: 70 } },
})

const body = (overrides: Record<string, unknown> = {}) => ({
  title: "Backend engineer resume",
  templateKey: "clean",
  targetRole: "Senior Backend Engineer",
  sourceResume: "Backend engineer. ".repeat(20),
  ...overrides,
})

const post = async (payload: Record<string, unknown>) => {
  const { POST } = await import("@/app/api/career/resumes/generate/route")
  return POST(
    new NextRequest("http://localhost/api/career/resumes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  insertedRows.length = 0
  mocks.requirePlan.mockResolvedValue({ ok: true, workspaceId: "workspace-1", plan: "Pro" })
  mocks.authorizeRole.mockResolvedValue(null)
  mocks.consumeCareerUsage.mockResolvedValue({ allowed: true })
  mocks.callAi.mockResolvedValue(aiResponse)
})

describe("targeted resume generation without a job description", () => {
  it("generates a role-targeted resume when no job description is supplied", async () => {
    const response = await post(body())

    expect(response.status).toBe(201)
    const prompt = String(mocks.callAi.mock.calls[0][2])
    expect(prompt).toContain("There is no job posting to match against")
    expect(prompt).toContain("Senior Backend Engineer")
  })

  it("targets the posting when a job description is supplied", async () => {
    const response = await post(body({ jobDescription: "We are hiring a senior backend engineer. ".repeat(4) }))

    expect(response.status).toBe(201)
    expect(String(mocks.callAi.mock.calls[0][2])).toContain("Create a targeted ATS resume for this role")
  })

  it("merges the parsed contact block back in and drops redaction placeholders", async () => {
    const response = await post(
      body({ contact: { fullName: "Ayesha Khan", email: "ayesha@example.com", phone: "+92 300 1234567", location: "Lahore, Pakistan", linkedinUrl: "https://linkedin.com/in/ayesha" } })
    )

    expect(response.status).toBe(201)
    const saved = await response.json()
    expect(saved.resumeData.fullName).toBe("Ayesha Khan")
    expect(saved.resumeData.email).toBe("ayesha@example.com")
    expect(saved.resumeData.email).not.toContain("removed")
  })

  it("clears a redaction placeholder when no contact block was parsed", async () => {
    const response = await post(body())
    const saved = await response.json()

    expect(saved.resumeData.email).toBe("")
  })

  it("names the offending field instead of returning one generic message", async () => {
    const response = await post(body({ sourceResume: "too short" }))

    expect(response.status).toBe(400)
    const error = await response.json()
    expect(error.field).toBe("sourceResume")
    expect(error.error).toContain("200 characters")
  })

  it("rejects a job description that is present but unusably short", async () => {
    const response = await post(body({ jobDescription: "backend engineer" }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ field: "jobDescription" })
  })
})
