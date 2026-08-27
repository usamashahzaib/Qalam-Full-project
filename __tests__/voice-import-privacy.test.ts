import { readFileSync } from "node:fs"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const route = readFileSync("app/api/voice/import-document/route.ts", "utf8")

const { requireAuthApi } = vi.hoisted(() => ({ requireAuthApi: vi.fn() }))
vi.mock("@/lib/server/auth", () => ({
  requireAuthApi,
  withAuth: (handler: (req: NextRequest, user: unknown) => Promise<Response>) =>
    async (req: NextRequest) => {
      const { error, session } = await requireAuthApi(req)
      if (error) return error
      return handler(req, session)
    },
}))

const { requirePlan } = vi.hoisted(() => ({ requirePlan: vi.fn() }))
vi.mock("@/lib/server/require-plan", () => ({ requirePlan }))

const { authorizeRole } = vi.hoisted(() => ({ authorizeRole: vi.fn() }))
vi.mock("@/lib/server/roles", () => ({ authorizeRole }))

const { checkRateLimit, getClientIp } = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "1.2.3.4"),
}))
vi.mock("@/lib/server/rate-limit", () => ({ checkRateLimit, getClientIp }))

const { extractResumePdfText } = vi.hoisted(() => ({ extractResumePdfText: vi.fn() }))
vi.mock("@/lib/server/resume-pdf", () => ({
  MAX_RESUME_MULTIPART_BYTES: 10 * 1024 * 1024,
  extractResumePdfText,
}))

const { callAi, safeParseJson } = vi.hoisted(() => ({ callAi: vi.fn(), safeParseJson: vi.fn() }))
vi.mock("@/lib/server/ai-router-v2", () => ({ callAi, safeParseJson }))

const { parseImportedProfessionalContext } = vi.hoisted(() => ({ parseImportedProfessionalContext: vi.fn() }))
vi.mock("@/lib/professional-context", () => ({ parseImportedProfessionalContext }))

beforeEach(() => {
  vi.clearAllMocks()
  requireAuthApi.mockResolvedValue({
    userId: "user-1",
    externalUserId: "ext-1",
    error: null,
    session: { id: "user-1", workspaceId: "ws-1" },
  })
  requirePlan.mockResolvedValue({ ok: true, plan: "Pro", workspaceId: "ws-1" })
  authorizeRole.mockResolvedValue(null)
  checkRateLimit.mockResolvedValue({ allowed: true })
})

const postImport = async (form?: FormData) => {
  const mod = await import("@/app/api/voice/import-document/route")
  const request = new NextRequest("http://localhost/api/voice/import-document", {
    method: "POST",
    body: form,
  })
  return mod.POST(request)
}

describe("voice document import privacy", () => {
  it("does not use persistent file or object storage", () => {
    expect(route).not.toMatch(/storage\.from|createWriteStream|writeFile|writeFileSync/)
  })

  it("blocks the route below Pro", async () => {
    requirePlan.mockResolvedValue({ ok: false, response: Response.json({ error: "upgrade_required" }, { status: 403 }) })

    const res = await postImport(new FormData())

    expect(res.status).toBe(403)
    expect(authorizeRole).not.toHaveBeenCalled()
  })

  it("blocks a Pro user below editor role", async () => {
    authorizeRole.mockResolvedValue(Response.json({ error: "forbidden" }, { status: 403 }))

    const res = await postImport(new FormData())

    expect(res.status).toBe(403)
  })

  it("enforces the import rate limit", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false })
    const form = new FormData()
    form.set("document", new File(["x"], "resume.pdf", { type: "application/pdf" }))

    const res = await postImport(form)

    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: "rate_limit_exceeded" })
  })

  it("rejects a request with no document attached", async () => {
    const res = await postImport(new FormData())

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "resume_pdf_missing" })
  })

  it("never persists the extracted text: response reports it discarded, and the AI call runs uncached", async () => {
    const form = new FormData()
    form.set("document", new File(["x"], "resume.pdf", { type: "application/pdf" }))
    extractResumePdfText.mockResolvedValue({ text: "resume text", totalPages: 2 })
    callAi.mockResolvedValue('{"ok":true}')
    safeParseJson.mockReturnValue({ suggestedName: "Ada", suggestedLinkedinUrl: "" })
    parseImportedProfessionalContext.mockReturnValue({
      primaryRole: "Engineer",
      industry: "Tech",
      contentGoals: ["Grow reach"],
    })

    const res = await postImport(form)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sourceDeleted).toBe(true)
    expect(body.rawTextStored).toBe(false)
    expect(callAi).toHaveBeenCalledWith(
      "voice-profile",
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ cache: false })
    )
  })
})
