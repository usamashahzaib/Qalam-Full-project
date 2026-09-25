import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: vi.fn() }))

import { sanitizeGeneratedText } from "@/lib/content-guard"
import { chunkExamplePosts } from "@/lib/server/embeddings"

describe("sanitizeGeneratedText", () => {
  it("keeps a hashtag that starts a line", () => {
    expect(sanitizeGeneratedText("Body.\n\n#StartupReality #HiringTruth")).toBe("Body.\n\n#StartupReality #HiringTruth")
  })

  it("still strips markdown headings", () => {
    expect(sanitizeGeneratedText("## The plan\nBody")).toBe("The plan\nBody")
  })

  it("normalises gpt-oss hyphens, narrow spaces and trailing spaces", () => {
    expect(sanitizeGeneratedText("mis‑picks fell to 0.9 %.  \nNext line")).toBe("mis-picks fell to 0.9 %.\nNext line")
  })
})

describe("chunkExamplePosts", () => {
  const post1 = "Our pick accuracy went up when we took a scanner away.\n\nThe boring answer is usually the right one.\n\nThat's the post."
  const post2 = "We spent 40k on a WMS module last year. Used it for six weeks.\n\nWalk the floor before you sign the PO.\n\nThat's the post."

  it("keeps whole posts, including short sign-offs, when posts are divided", () => {
    expect(chunkExamplePosts(`${post1}\n---\n${post2}`)).toEqual([post1, post2])
    expect(chunkExamplePosts(`${post1}\r\n\r\n***\r\n\r\n${post2}`)).toEqual([post1, post2])
  })

  it("groups paragraphs instead of storing each one alone when there are no dividers", () => {
    const chunks = chunkExamplePosts(`${post1}\n\n${post2}`)
    expect(chunks.length).toBeLessThan(3)
    expect(chunks.join("\n\n")).toContain("That's the post.")
  })
})
