import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const state = vi.hoisted(() => ({
  membership: { data: null as unknown, error: null as unknown },
  user: { data: null as unknown, error: null as unknown },
  inserts: [] as string[],
}))

vi.mock("@/auth", () => ({ auth: vi.fn() }))

vi.mock("@/lib/server/logging", () => ({ log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))

vi.mock("@/lib/server/supabase-rest", () => {
  const builder = (table: string) => {
    const chain: Record<string, unknown> = {}
    for (const name of ["select", "eq", "order", "limit", "is"]) chain[name] = () => chain
    chain.maybeSingle = async () => (table === "workspace_members" ? state.membership : state.user)
    chain.insert = () => {
      state.inserts.push(table)
      return { select: () => ({ single: async () => ({ data: { id: "new-ws" }, error: null }) }) }
    }
    return chain
  }
  return { createServiceClient: () => ({ from: builder }) }
})

import { fetchWithRetry } from "@/lib/server/retry-fetch"
import { ensureWorkspaceForUser } from "@/lib/server/identity"
import { isSessionCurrent } from "@/lib/server/session-revocation"
import { isTransientError } from "@/lib/server/transient-errors"
import { errorToStatus } from "@/lib/server/roles"

describe("fetchWithRetry", () => {
  it("retries a read through gateway errors", async () => {
    const base = vi.fn()
      .mockResolvedValueOnce(new Response("<html>Bad Gateway</html>", { status: 502 }))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("[]", { status: 200 }))
    const res = await fetchWithRetry("https://db.example/rest/v1/users", { method: "GET" }, base as typeof fetch)
    expect(res.status).toBe(200)
    expect(base).toHaveBeenCalledTimes(3)
  })

  it("never repeats a write", async () => {
    const base = vi.fn().mockResolvedValue(new Response("", { status: 502 }))
    const res = await fetchWithRetry("https://db.example/rest/v1/users", { method: "POST", body: "{}" }, base as typeof fetch)
    expect(res.status).toBe(502)
    expect(base).toHaveBeenCalledTimes(1)
  })

  it("returns real client errors immediately", async () => {
    const base = vi.fn().mockResolvedValue(new Response("", { status: 401 }))
    await fetchWithRetry("https://db.example/x", undefined, base as typeof fetch)
    expect(base).toHaveBeenCalledTimes(1)
  })
})

describe("workspace boot under a database outage", () => {
  beforeEach(() => {
    state.inserts = []
    state.membership = { data: null, error: null }
    state.user = { data: null, error: null }
  })

  it("does not create a duplicate workspace when the membership lookup fails", async () => {
    state.membership = { data: null, error: { message: "Bad Gateway" } }
    await expect(ensureWorkspaceForUser({ userId: "u1" })).rejects.toThrow("failed_to_lookup_workspace")
    expect(state.inserts).toEqual([])
  })

  it("still creates the first workspace for a genuinely new user", async () => {
    await expect(ensureWorkspaceForUser({ userId: "u1" })).resolves.toBe("new-ws")
  })

  it("reports a failed session lookup as transient instead of revoking the session", async () => {
    state.user = { data: null, error: { message: "Bad Gateway" } }
    const error = await isSessionCurrent({ user: { id: "ext-1" }, expires: "" } as never).catch((e) => e)
    expect(isTransientError(error)).toBe(true)
    expect(errorToStatus((error as Error).message)).toBe(503)
  })

  it("still revokes a session whose user no longer exists", async () => {
    await expect(isSessionCurrent({ user: { id: "ext-2" }, expires: "" } as never)).resolves.toBe(false)
  })
})
