import { describe, expect, it } from "vitest"
import { toPostArtifact } from "@/lib/use-cases/post-artifact"

const validPost = `I stopped trusting perfect hiring scorecards.

They looked clean.

But every miss came from the same gap: nobody wrote down the tradeoff.

So we changed the process.

Every final round now includes one line on what we are accepting, one line on what we are rejecting, and one line on what would make us reverse the decision.

The review is slower by five minutes.

The post-hire surprises dropped because the risk was visible before the offer.

Candidates also got clearer feedback because the team was no longer hiding behind vague culture language.

That single habit made the hiring bar more honest.

It did not make every decision easy.

It made every decision explainable.

#hiring #leadership`

describe("toPostArtifact", () => {
  it("accepts post-shaped content", () => {
    const artifact = toPostArtifact(validPost)
    expect(artifact?.content).toContain("I stopped trusting")
    expect(artifact?.wordCount).toBeGreaterThan(80)
  })

  it("rejects score json as content", () => {
    expect(toPostArtifact(JSON.stringify({
      hook: 91,
      readability: 88,
      authority: 84,
      specificity: 79,
      cta: 82,
      human: 90,
      voiceFit: 86,
      overall: 86,
      tips: {},
      hashtags: ["#hiring"],
    }))).toBeNull()
  })
})
