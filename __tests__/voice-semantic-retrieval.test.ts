import { afterEach, describe, expect, it, vi } from "vitest"

const from = vi.fn()
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: () => ({ from }) }))
import { retrieveVoiceExamples } from "@/lib/server/embeddings"

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks() })

describe("workspace semantic retrieval", () => {
  it("keeps the workspace filter and uses retrieval query embeddings", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key")
    const queryVector = [1, ...Array(767).fill(0)]
    const query = { select: vi.fn(), eq: vi.fn(), limit: vi.fn() }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [
      { content: "Unrelated", embedding: [0, 1, ...Array(766).fill(0)] },
      { content: "Relevant meaning", embedding: queryVector },
    ], error: null })
    from.mockReturnValue(query)
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ embedding: { values: queryVector } }) }))
    vi.stubGlobal("fetch", fetchMock)
    expect(await retrieveVoiceExamples("workspace-one", "A topic", 1)).toEqual(["Relevant meaning"])
    expect(query.eq).toHaveBeenCalledWith("workspace_id", "workspace-one")
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.taskType).toBe("RETRIEVAL_QUERY")
  })
  it("falls back to keywords when the provider fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key")
    const query = { select: vi.fn(), eq: vi.fn(), limit: vi.fn() }
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [{ content: "General note", embedding: [1, 0] }, { content: "Hiring process" }], error: null })
    from.mockReturnValue(query)
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))
    expect(await retrieveVoiceExamples("workspace-one", "Hiring", 1)).toEqual(["Hiring process"])
  })
})
