import { afterEach, describe, expect, it, vi } from "vitest"

const rpc = vi.fn()
const embed = vi.fn()
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: () => ({ rpc }) }))
vi.mock("@/lib/server/embeddings", () => ({ generateEmbedding: (...args: unknown[]) => embed(...args) }))
vi.mock("@/lib/server/logging", () => ({ log: { info: vi.fn(), warn: vi.fn() } }))
import { retrieveWritingReferences } from "@/lib/server/writing-library"

afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })

describe("shared reference retrieval", () => {
  it("does not call a provider before rollout is enabled", async () => {
    vi.stubEnv("WRITING_REFERENCE_LIBRARY_ENABLED", "false")
    expect(await retrieveWritingReferences("Hiring" )).toBe("")
    expect(embed).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })
  it("uses a query embedding, optional language filter, and bounded reference count", async () => {
    vi.stubEnv("WRITING_REFERENCE_LIBRARY_ENABLED", "true")
    embed.mockResolvedValue([1, 0])
    rpc.mockResolvedValue({ data: [{ final_text: "A reviewed example with a concrete point." }], error: null })
    const result = await retrieveWritingReferences("Hiring", "Russian")
    expect(embed).toHaveBeenCalledWith("Hiring", "RETRIEVAL_QUERY")
    expect(rpc).toHaveBeenCalledWith("match_writing_references", { query_embedding: "[1,0]", requested_language: "russian", match_count: 3 })
    expect(result).toContain("The author's saved voice takes priority")
    expect(result).toContain("A reviewed example")
  })
  it("leaves normal generation available when the migration or provider is unavailable", async () => {
    vi.stubEnv("WRITING_REFERENCE_LIBRARY_ENABLED", "true")
    embed.mockResolvedValue([1, 0])
    rpc.mockResolvedValue({ data: null, error: { code: "42883" } })
    expect(await retrieveWritingReferences("Hiring")).toBe("")
    embed.mockRejectedValue(new Error("offline"))
    expect(await retrieveWritingReferences("Hiring")).toBe("")
  })
})
