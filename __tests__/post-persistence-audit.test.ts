import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFakeSupabase, ok } from "./mocks/supabase-client"

const mocks = vi.hoisted(() => ({ client: vi.fn() }))
vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: mocks.client }))
import { SupabasePostRepository } from "@/lib/repositories/supabase/SupabasePostRepository"

describe("post persistence integrity", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(["pending_approval", "approved", "rejected", "failed", "draft"])("persists and returns the same %s status", async (status) => {
    const client = createFakeSupabase({ tableResponses: { posts: ok({ id: "new-post" }) } })
    mocks.client.mockReturnValue(client)
    const result = await new SupabasePostRepository().create({ userId: "user", authorId: "user", workspaceId: "workspace", title: "Post", type: "linkedin", status })
    const chain = client.from.mock.results[0].value
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ status }))
    expect(result.status).toBe(status)
  })

  it("returns the fallback status actually stored for an invalid input", async () => {
    const client = createFakeSupabase({ tableResponses: { posts: ok({ id: "new-post" }) } })
    mocks.client.mockReturnValue(client)
    const result = await new SupabasePostRepository().create({ userId: "user", authorId: "user", workspaceId: "workspace", title: "Post", type: "linkedin", status: "invalid" })
    expect(result.status).toBe("draft")
  })

  it("preserves the stored carousel type when duplicating a post", async () => {
    let call = 0
    const client = createFakeSupabase({ tableResponses: { posts: () => ++call === 1
      ? ok([{ id: "source", title: "Carousel", content: "slides", metadata: { type: "linkedin-carousel" } }])
      : ok({ id: "copy" }) } })
    mocks.client.mockReturnValue(client)
    const copy = await new SupabasePostRepository().duplicate("source", "workspace", "user", "user")
    expect(copy.type).toBe("linkedin-carousel")
    expect(client.from.mock.results[1].value.insert).toHaveBeenCalledWith(expect.objectContaining({ metadata: { type: "linkedin-carousel", authorId: "user" } }))
  })
})
