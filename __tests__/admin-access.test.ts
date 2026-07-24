import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  env: { appAdminEmails: "owner@example.com" },
}))

vi.mock("@/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/server/env", () => ({ env: mocks.env }))

const { requireAdminPage } = await import("@/lib/server/workspace")

describe("admin page access", () => {
  beforeEach(() => {
    mocks.env.appAdminEmails = "owner@example.com"
    mocks.auth.mockReset()
  })

  it("redirects an authenticated non-admin to the dashboard", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "member@example.com" },
    })

    await expect(requireAdminPage()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT;replace;/dashboard"),
    })
  })

  it("fails loudly when the admin allowlist is unset", async () => {
    mocks.env.appAdminEmails = ""
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "member@example.com" },
    })

    await expect(requireAdminPage()).rejects.toThrow("APP_ADMIN_EMAILS is required")
  })

  it("allows an email in the configured admin allowlist", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "admin-1", email: "OWNER@example.com" },
    })

    await expect(requireAdminPage()).resolves.toEqual({
      email: "owner@example.com",
      userId: "admin-1",
    })
  })
})
