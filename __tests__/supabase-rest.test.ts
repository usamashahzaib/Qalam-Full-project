import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sanitizeOrFilterValue } from "@/lib/server/supabase-rest"

describe("sanitizeOrFilterValue", () => {
  it("passes a plain UUID through unchanged", () => {
    expect(sanitizeOrFilterValue("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    )
  })

  it("strips comma/paren metacharacters that would inject an extra PostgREST or() clause", () => {
    // Without stripping, this value would turn
    // `.or(\`id.eq.${value},external_user_id.eq.${value}\`)` into a filter
    // that additionally matches an attacker-chosen column/value pair.
    const malicious = "x,role.eq.admin"
    expect(sanitizeOrFilterValue(malicious)).toBe("xrole.eq.admin")
    expect(sanitizeOrFilterValue(malicious)).not.toContain(",")

    const withParens = "x)or(id.neq.x"
    expect(sanitizeOrFilterValue(withParens)).not.toMatch(/[(),]/)
  })
})

describe("supabaseCount", () => {
  const originalEnv = { ...process.env }
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.resetModules()
    process.env.SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    global.fetch = originalFetch
  })

  it("issues a HEAD request with Prefer: count=exact and reads the total from Content-Range", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { "content-range": "0-24/117" },
      })
    )
    global.fetch = fetchMock as never

    const { supabaseCount } = await import("@/lib/server/supabase-rest")
    const count = await supabaseCount("posts", "workspace_id=eq.ws-1")

    expect(count).toBe(117)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("/rest/v1/posts?workspace_id=eq.ws-1")
    expect(init.method).toBe("HEAD")
    expect(init.headers.Prefer).toBe("count=exact")
  })

  it("returns 0 when Content-Range reports an unknown total", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, { status: 200, headers: { "content-range": "*/*" } })
    )
    global.fetch = fetchMock as never

    const { supabaseCount } = await import("@/lib/server/supabase-rest")
    const count = await supabaseCount("posts", "workspace_id=eq.ws-1")
    expect(count).toBe(0)
  })
})
