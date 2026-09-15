import { beforeEach, describe, expect, it, vi } from "vitest"

const { supabasePatch, supabaseSelect, rpc, createPost } = vi.hoisted(() => ({
  supabasePatch: vi.fn(),
  supabaseSelect: vi.fn(),
  rpc: vi.fn(),
  createPost: vi.fn(),
}))

vi.mock("@/lib/server/supabase-rest", () => ({
  supabasePatch,
  supabaseSelect,
  supabaseInsert: vi.fn(),
  createServiceClient: () => ({ rpc }),
}))
vi.mock("@/lib/repositories/supabase/SupabasePostRepository", () => ({
  SupabasePostRepository: class { create = createPost },
}))
vi.mock("@/lib/server/ai-router-v2", () => ({ callAi: vi.fn(), safeParseJson: vi.fn(), sanitizeOutput: (value: string) => value }))
vi.mock("@/lib/server/logging", () => ({ log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }))
vi.mock("@/lib/server/env", () => ({ env: { frontendOrigin: "https://app.byqalam.com" } }))
vi.mock("@/lib/server/agency/access", () => ({
  isUuid: (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value),
  hashPublicToken: vi.fn(),
  issuePublicToken: vi.fn(),
}))

const OWNER = "11111111-1111-4111-8111-111111111111"
const PITCH_ID = "22222222-2222-4222-8222-222222222222"
const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333"

const pitch = {
  id: PITCH_ID,
  owner_id: OWNER,
  prospect_name: "Sara Malik",
  samples: [
    { angle: "Hiring for judgment", content: "a".repeat(300) },
    { angle: "Operations under pressure", content: "b".repeat(300) },
    { angle: "Keeping customers", content: "c".repeat(300) },
  ],
}

const convert = async () => {
  const { convertPitchToClient } = await import("@/lib/server/agency/pitch")
  return convertPitchToClient({ ownerId: OWNER, pitchId: PITCH_ID, maxClients: 5 })
}

beforeEach(() => {
  vi.clearAllMocks()
  supabasePatch.mockResolvedValue([pitch])
  rpc.mockResolvedValue({ data: WORKSPACE_ID, error: null })
  createPost.mockResolvedValue({ id: "post" })
})

describe("pitch to client conversion", () => {
  it("claims the pitch, creates the workspace within the client limit, and carries every sample over as a draft", async () => {
    const result = await convert()

    expect(supabasePatch).toHaveBeenNthCalledWith(1, "pitch_previews", `id=eq.${PITCH_ID}&owner_id=eq.${OWNER}&converted_at=is.null`, expect.objectContaining({ converted_at: expect.any(String) }))
    expect(rpc).toHaveBeenCalledWith("create_client_workspace_with_limit", expect.objectContaining({ p_user_id: OWNER, p_name: "Sara Malik", p_max_clients: 5 }))
    expect(createPost).toHaveBeenCalledTimes(3)
    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: WORKSPACE_ID, title: "Hiring for judgment", status: "draft" }))
    expect(supabasePatch).toHaveBeenLastCalledWith("pitch_previews", `id=eq.${PITCH_ID}`, { converted_workspace_id: WORKSPACE_ID })
    expect(result).toEqual({ workspaceId: WORKSPACE_ID, workspaceName: "Sara Malik", drafts: 3 })
  })

  it("refuses a second conversion without creating another workspace", async () => {
    supabasePatch.mockResolvedValueOnce([])
    supabaseSelect.mockResolvedValueOnce([{ id: PITCH_ID, converted_workspace_id: WORKSPACE_ID }])

    await expect(convert()).rejects.toThrow("pitch_already_converted")
    expect(rpc).not.toHaveBeenCalled()
  })

  it("releases the claim when the client limit is reached", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "client_workspace_limit_reached" } })

    await expect(convert()).rejects.toThrow("workspace_limit_reached")
    expect(supabasePatch).toHaveBeenLastCalledWith("pitch_previews", `id=eq.${PITCH_ID}`, { converted_at: null })
    expect(createPost).not.toHaveBeenCalled()
  })

  it("rejects ids that are not UUIDs before touching the database", async () => {
    const { convertPitchToClient } = await import("@/lib/server/agency/pitch")
    await expect(convertPitchToClient({ ownerId: OWNER, pitchId: "abc", maxClients: 5 })).rejects.toThrow("not_found")
    expect(supabasePatch).not.toHaveBeenCalled()
  })
})
