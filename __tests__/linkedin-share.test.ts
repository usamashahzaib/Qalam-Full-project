import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/circuit-breaker", () => ({
  checkCircuit: vi.fn().mockResolvedValue(true),
  recordFailure: vi.fn().mockResolvedValue(undefined),
  recordSuccess: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/server/linkedin-credentials", () => ({
  markLinkedInTokenInvalid: vi.fn().mockResolvedValue(undefined),
}))

import { shareToLinkedIn } from "@/lib/server/linkedin"

describe("LinkedIn sharing endpoint selection", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, {
      status: 201,
      headers: { "x-restli-id": "urn:li:ugcPost:123" },
    }))
  })

  afterEach(() => vi.restoreAllMocks())

  it("uses the approved Share on LinkedIn UGC endpoint for text posts", async () => {
    await shareToLinkedIn({ accessToken: "token", authorId: "member", content: "Ready to publish" })

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(url).toBe("https://api.linkedin.com/v2/ugcPosts")
    expect(JSON.parse(String(options?.body))).toMatchObject({
      author: "urn:li:person:member",
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: "Ready to publish" },
          shareMediaCategory: "NONE",
        },
      },
    })
  })

  it("keeps document posts on the document-compatible Posts endpoint", async () => {
    await shareToLinkedIn({
      accessToken: "token",
      authorId: "member",
      content: "Document post",
      media: { id: "urn:li:document:123", title: "Deck" },
    })

    expect(vi.mocked(globalThis.fetch).mock.calls[0][0]).toBe("https://api.linkedin.com/rest/posts")
  })
})
