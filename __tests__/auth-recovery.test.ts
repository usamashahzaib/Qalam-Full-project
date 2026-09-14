import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createFakeSupabase, ok } from "./mocks/supabase-client"

const mocks = vi.hoisted(() => ({
  checkAuthRateLimit: vi.fn(),
  createServiceClient: vi.fn(),
  sendTransactionalEmail: vi.fn(),
}))

vi.mock("@/lib/server/queue", () => ({ checkAuthRateLimit: mocks.checkAuthRateLimit }))
vi.mock("@/lib/server/rate-limit", () => ({ getClientIp: () => "127.0.0.1" }))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: mocks.createServiceClient }))
vi.mock("@/lib/server/email", () => ({ sendTransactionalEmail: mocks.sendTransactionalEmail }))
vi.mock("@/lib/server/password", () => ({
  generateToken: () => "reset-token",
  hashToken: () => "reset-token-hash",
}))
vi.mock("@/lib/seo", () => ({ APP_URL: "https://app.example.com" }))

const { POST } = await import("@/app/api/auth/forgot-password/route")

describe("account recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkAuthRateLimit.mockResolvedValue({ allowed: true })
    mocks.sendTransactionalEmail.mockResolvedValue({ ok: true })
  })

  it("sends a password setup link to an existing LinkedIn-only account", async () => {
    const client = createFakeSupabase({
      tableResponses: {
        users: ok({ id: "user-1", email: "user@example.com", full_name: "User" }),
        password_resets: ok(null),
      },
    })
    mocks.createServiceClient.mockReturnValue(client)

    const response = await POST(new NextRequest("https://app.example.com/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "USER@example.com" }),
    }))

    expect(response.status).toBe(200)
    const resetChain = client.from.mock.results[1].value as { insert: ReturnType<typeof vi.fn> }
    expect(resetChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1",
      token_hash: "reset-token-hash",
    }))
    await vi.waitFor(() => expect(mocks.sendTransactionalEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "user@example.com",
    })))
  })

  it("marks the email verified in the same database transaction as the password change", () => {
    const migration = readFileSync(resolve(
      process.cwd(),
      "supabase/migrations/20260914090000_verify_email_on_password_reset.sql",
    ), "utf8")

    expect(migration).toContain("email_verified = true")
    expect(migration).toContain("password_version = password_version + 1")
  })
})
