import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFakeSupabase, ok } from "./mocks/supabase-client"

const createServiceClient = vi.fn()

vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient }))
vi.mock("@/lib/server/logging", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { ensureSupabaseUser } = await import("@/lib/server/identity")

describe("OAuth identity linking", () => {
  beforeEach(() => vi.clearAllMocks())

  it("reconnects an existing LinkedIn account when its provider subject changes", async () => {
    let userQuery = 0
    const client = createFakeSupabase({
      tableResponses: {
        users: () => {
          userQuery += 1
          if (userQuery === 1) return ok(null)
          if (userQuery === 2) {
            return ok({ id: "internal-user", external_user_id: "old-subject", auth_provider: "linkedin" })
          }
          return ok({ id: "internal-user", external_user_id: "new-subject" })
        },
      },
    })
    createServiceClient.mockReturnValue(client)

    await expect(ensureSupabaseUser({
      userId: "new-subject",
      email: "user@example.com",
      fullName: "User",
      imageUrl: null,
      verifiedOAuthProvider: "linkedin",
    })).resolves.toBe("internal-user")

    const updateChain = client.from.mock.results[2].value as { update: ReturnType<typeof vi.fn> }
    expect(updateChain.update).toHaveBeenCalledWith({
      external_user_id: "new-subject",
      full_name: "User",
      image_url: null,
    })
  })

  it("reconnects a LinkedIn subject change even when auth_provider is still 'email' (originally signed up with a password, LinkedIn linked later)", async () => {
    let userQuery = 0
    const client = createFakeSupabase({
      tableResponses: {
        users: () => {
          userQuery += 1
          if (userQuery === 1) return ok(null)
          if (userQuery === 2) {
            return ok({ id: "internal-user", external_user_id: "old-subject", auth_provider: "email" })
          }
          return ok({ id: "internal-user", external_user_id: "new-subject" })
        },
      },
    })
    createServiceClient.mockReturnValue(client)

    await expect(ensureSupabaseUser({
      userId: "new-subject",
      email: "user@example.com",
      fullName: "User",
      imageUrl: null,
      verifiedOAuthProvider: "linkedin",
    })).resolves.toBe("internal-user")
  })

  it("strips a stranger's password when a verified LinkedIn login links onto an unverified account", async () => {
    let userQuery = 0
    const client = createFakeSupabase({
      tableResponses: {
        users: () => {
          userQuery += 1
          if (userQuery === 1) return ok(null)
          if (userQuery === 2) {
            return ok({ id: "internal-user", external_user_id: null, email_verified: false, password_hash: "attacker-hash", password_version: 2 })
          }
          return ok({ id: "internal-user", external_user_id: "linkedin-subject" })
        },
      },
    })
    createServiceClient.mockReturnValue(client)

    await expect(ensureSupabaseUser({
      userId: "linkedin-subject",
      email: "victim@example.com",
      fullName: "Victim",
      imageUrl: null,
      verifiedOAuthProvider: "linkedin",
    })).resolves.toBe("internal-user")

    const updateChain = client.from.mock.results[2].value as { update: ReturnType<typeof vi.fn> }
    expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      external_user_id: "linkedin-subject",
      password_hash: null,
      email_verified: true,
      password_version: 3,
    }))
  })

  it("keeps a verified account's password when LinkedIn links onto it", async () => {
    let userQuery = 0
    const client = createFakeSupabase({
      tableResponses: {
        users: () => {
          userQuery += 1
          if (userQuery === 1) return ok(null)
          if (userQuery === 2) {
            return ok({ id: "internal-user", external_user_id: null, email_verified: true, password_hash: "owner-hash", password_version: 0 })
          }
          return ok({ id: "internal-user", external_user_id: "linkedin-subject" })
        },
      },
    })
    createServiceClient.mockReturnValue(client)

    await ensureSupabaseUser({
      userId: "linkedin-subject",
      email: "owner@example.com",
      fullName: "Owner",
      imageUrl: null,
      verifiedOAuthProvider: "linkedin",
    })

    const updateChain = client.from.mock.results[2].value as { update: ReturnType<typeof vi.fn> }
    expect(updateChain.update).toHaveBeenCalledWith({
      external_user_id: "linkedin-subject",
      full_name: "Owner",
      image_url: null,
    })
  })

  it("refuses to link an unverified OAuth email onto someone else's account", async () => {
    let userQuery = 0
    createServiceClient.mockReturnValue(createFakeSupabase({
      tableResponses: {
        users: () => {
          userQuery += 1
          return userQuery === 1
            ? ok(null)
            : ok({ id: "internal-user", external_user_id: null, email_verified: true, password_hash: "owner-hash" })
        },
      },
    }))

    await expect(ensureSupabaseUser({
      userId: "linkedin-subject",
      email: "owner@example.com",
      fullName: "Someone",
      imageUrl: null,
    })).rejects.toThrow("oauth_email_unverified")
  })

  it("still lets a password session self-link its own row on every request", async () => {
    let userQuery = 0
    const client = createFakeSupabase({
      tableResponses: {
        users: () => {
          userQuery += 1
          if (userQuery === 1) return ok(null)
          if (userQuery === 2) {
            return ok({ id: "internal-user", external_user_id: null, email_verified: true, password_hash: "owner-hash" })
          }
          return ok({ id: "internal-user", external_user_id: "internal-user" })
        },
      },
    })
    createServiceClient.mockReturnValue(client)

    await expect(ensureSupabaseUser({
      userId: "internal-user",
      email: "owner@example.com",
      fullName: "Owner",
      imageUrl: null,
    })).resolves.toBe("internal-user")
  })

  it("keeps mismatched identities blocked outside a verified LinkedIn login", async () => {
    let userQuery = 0
    createServiceClient.mockReturnValue(createFakeSupabase({
      tableResponses: {
        users: () => {
          userQuery += 1
          return userQuery === 1
            ? ok(null)
            : ok({ id: "internal-user", external_user_id: "old-subject", auth_provider: "linkedin" })
        },
      },
    }))

    await expect(ensureSupabaseUser({
      userId: "new-subject",
      email: "user@example.com",
      fullName: "User",
      imageUrl: null,
    })).rejects.toThrow("oauth_identity_mismatch")
  })
})
