import { describe, expect, it } from "vitest"
import { POST_TASK_RULES } from "@/lib/prompts/builders/generate"
import { HOOK_TASK_RULES } from "@/lib/prompts/builders/hooks"
import { CAROUSEL_SYSTEM_PROMPT } from "@/lib/prompts/builders/carousel"
import {
  LINKEDIN_POSITIONING_RULES,
  build7MetricScorePrompt,
  buildGeneratePrompt,
  buildHook5StylesPrompt,
} from "@/lib/prompts/role-aware-system"
import { GROUNDING_RULES, NATURAL_WRITING_RULES } from "@/lib/prompts/writing-policy"
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
    expect(prompt.system).toContain("Never invent a client, employer, metric, credential, event, quote, or first-person experience")
    expect(prompt.system).toContain("GOAL FOR THIS POST: Build authority")
  })

  it("applies the same trust rules to hooks, scoring, and carousels", () => {
    const voice = { professionalContext }
    const hooks = buildHook5StylesPrompt("Hiring systems", "HR Leader", undefined, voice)
    const score = build7MetricScorePrompt("A sample post", "HR Leader", voice)

    expect(hooks.system).toContain("Never ask readers to comment a keyword")
    expect(hooks.system).toContain("only when the author supplied them")
    expect(score.system).toContain("serve the intended audience")
    expect(CAROUSEL_SYSTEM_PROMPT).toContain("No engagement bait")
  })

  it("does not force fabricated numbers or platform promises", () => {
    expect(GROUNDING_RULES).toContain("You may not invent")
    expect(POST_TASK_RULES).toContain("never claim a format guarantees reach")
    expect(LINKEDIN_POSITIONING_RULES).toContain("Do not claim that any format or tactic guarantees reach")
  })
})

describe("the writing policy stops forcing a template", () => {
  // These are the specific instructions that made every draft come out the
  // same shape. Regressing any of them puts the house style back.
  const templateDemands = [
    "pattern interrupt",
    "NEVER use bullet points",
    "ALWAYS emotional trigger",
    "NEVER end with question mark",
    "Be aggressive",
    "must reach 90+",
  ]

  const surfaces = [
    ["post rules", POST_TASK_RULES],
    ["hook rules", HOOK_TASK_RULES],
    ["natural writing rules", NATURAL_WRITING_RULES],
    ["positioning rules", LINKEDIN_POSITIONING_RULES],
  ] as const

  it.each(surfaces)("%s do not mandate a fixed shape", (_name, text) => {
    for (const demand of templateDemands) {
      expect(text.toLowerCase()).not.toContain(demand.toLowerCase())
    }
  })

  it("explicitly permits the shapes the old rules banned", () => {
    expect(NATURAL_WRITING_RULES).toContain("Bullets are fine")
    expect(NATURAL_WRITING_RULES).toContain("Longer sentences are fine")
    expect(NATURAL_WRITING_RULES).toContain("Ordinary professional vocabulary is fine")
    expect(NATURAL_WRITING_RULES).toContain("Nothing in this list is required")
  })

  it("does not ask the model to manufacture authenticity", () => {
    expect(NATURAL_WRITING_RULES).toContain("Do not manufacture roughness")
    expect(GROUNDING_RULES).toContain("A job title tells you what someone does")
  })
})
