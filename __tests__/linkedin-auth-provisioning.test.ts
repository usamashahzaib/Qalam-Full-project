import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  config: null as Record<string, unknown> | null,
  ensureSupabaseUser: vi.fn(),
  ensureWorkspaceForUser: vi.fn(),
  storeLinkedInToken: vi.fn(),
  storeLinkedInPublishingAccount: vi.fn(),
}))

vi.mock("next-auth", () => ({
  default: (config: Record<string, unknown>) => {
    mocks.config = config
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }
  },
}))

vi.mock("next-auth/providers/linkedin", () => ({ default: (options: unknown) => ({ id: "linkedin", options }) }))
vi.mock("next-auth/providers/credentials", () => ({ default: (options: unknown) => ({ id: "credentials", options }) }))
vi.mock("@/auth.config", () => ({ authConfig: {} }))
vi.mock("@/lib/server/identity", () => ({
  ensureSupabaseUser: mocks.ensureSupabaseUser,
  ensureWorkspaceForUser: mocks.ensureWorkspaceForUser,
}))
vi.mock("@/lib/server/linkedin-credentials", () => ({
  storeLinkedInToken: mocks.storeLinkedInToken,
  storeLinkedInPublishingAccount: mocks.storeLinkedInPublishingAccount,
}))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/server/password", () => ({ verifyPassword: vi.fn() }))
vi.mock("@/lib/server/logging", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

await import("@/auth")

function callbacks() {
  return (mocks.config as { callbacks: Record<string, (...args: never[]) => Promise<unknown>> }).callbacks
}

describe("LinkedIn authentication provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureSupabaseUser.mockResolvedValue("internal-user-id")
    mocks.ensureWorkspaceForUser.mockResolvedValue("workspace-id")
  })

  it("provisions the dashboard account even when no publishing token is returned", async () => {
    const result = await callbacks().signIn({
      user: { id: "profile-id", email: "USER@EXAMPLE.COM", name: "User", image: null },
      account: { provider: "linkedin", providerAccountId: "linkedin-id", type: "oidc" },
    } as never)

    expect(result).toBe(true)
    expect(mocks.ensureSupabaseUser).toHaveBeenCalledWith({
      userId: "linkedin-id",
      email: "user@example.com",
      fullName: "User",
      imageUrl: null,
    })
    expect(mocks.ensureWorkspaceForUser).toHaveBeenCalledWith({
      userId: "internal-user-id",
      email: "user@example.com",
    })
    expect(mocks.storeLinkedInToken).not.toHaveBeenCalled()
  })

  it("does not issue an unusable session when account provisioning fails", async () => {
    mocks.ensureSupabaseUser.mockRejectedValueOnce(new Error("database unavailable"))

    const result = await callbacks().signIn({
      user: { id: "profile-id", email: "user@example.com", name: "User", image: null },
      account: { provider: "linkedin", providerAccountId: "linkedin-id", type: "oidc" },
    } as never)

    expect(result).toBe(false)
  })

  it("stores the stable LinkedIn account ID in the session token", async () => {
    const token = await callbacks().jwt({
      token: {},
      user: { id: "profile-id", email: "user@example.com", name: "User", image: null },
      account: { provider: "linkedin", providerAccountId: "linkedin-id", type: "oidc" },
      trigger: "signIn",
    } as never) as { id: string }

    expect(token.id).toBe("linkedin-id")
  })
})
