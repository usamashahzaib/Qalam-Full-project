import { describe, expect, it } from "vitest"
import { GENERATE_CRITICAL_RULES } from "@/lib/prompts/builders/generate"
import { CAROUSEL_SYSTEM_PROMPT } from "@/lib/prompts/builders/carousel"
import {
  LINKEDIN_POSITIONING_RULES,
  build7MetricScorePrompt,
  buildGeneratePrompt,
  buildHook5StylesPrompt,
} from "@/lib/prompts/role-aware-system"
import type { ProfessionalContext } from "@/lib/professional-context"

const professionalContext: ProfessionalContext = {
  primaryRole: "Head of People",
  seniority: "Executive",
  industry: "Technology",
  expertise: ["Workforce planning", "Hiring systems"],
  audience: ["Startup founders"],
  contentPillars: ["Hiring", "People operations", "Leadership"],
  proofPoints: ["Reduced time to hire by 30%"],
  careerHighlights: ["Built people functions across four startups"],
  avoidedTopics: ["Legal advice"],
  contentGoals: ["Build founder trust"],
  confidence: 0.94,
  source: "linkedin_pdf",
}

describe("LinkedIn positioning prompt contract", () => {
  it("keeps generated posts aligned to audience, pillars, and supplied proof", () => {
    const prompt = buildGeneratePrompt(
      "HR Leader",
      "Why startup onboarding breaks",
      "medium",
      "Build authority with one useful, evidence-led idea",
      { professionalContext }
    )

    expect(prompt.system).toContain("Audience: Startup founders")
    expect(prompt.system).toContain("Content pillars: Hiring; People operations; Leadership")
    expect(prompt.system).toContain("Every post needs one intent: Authority, Personal, or Offer")
    expect(prompt.system).toContain("Never invent a client, employer, metric, credential, event, quote, or first-person experience")
    expect(prompt.system).toContain("GOAL FOR THIS POST: Build authority")
  })

  it("applies the same trust rules to hooks, scoring, and carousels", () => {
    const voice = { professionalContext }
    const hooks = buildHook5StylesPrompt("Hiring systems", "HR Leader", undefined, voice)
    const score = build7MetricScorePrompt("A sample post", "HR Leader", voice)

    expect(hooks.system).toContain("Never ask readers to comment a keyword")
    expect(hooks.system).toContain("only when supplied by the user or profile context")
    expect(score.system).toContain("clearly serves the intended audience")
    expect(CAROUSEL_SYSTEM_PROMPT).toContain("No engagement bait")
  })

  it("does not force fabricated numbers or platform promises", () => {
    expect(GENERATE_CRITICAL_RULES).toContain("only when the user supplied them")
    expect(GENERATE_CRITICAL_RULES).toContain("Never promise reach, virality, impressions, or algorithmic distribution")
    expect(LINKEDIN_POSITIONING_RULES).toContain("Do not claim that any format or tactic guarantees reach")
  })
})
