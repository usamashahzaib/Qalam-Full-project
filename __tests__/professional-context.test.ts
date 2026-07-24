import { describe, expect, it } from "vitest"
import {
  parseImportedProfessionalContext,
  parseProfessionalContext,
  professionalContextPrompt,
  redactSensitiveResumeText,
  type ProfessionalContext,
} from "@/lib/professional-context"
import { buildGeneratePrompt, buildHook5StylesPrompt } from "@/lib/prompts/role-aware-system"
import { toPromptVoiceProfile } from "@/lib/server/voice-profile"

const context: ProfessionalContext = {
  primaryRole: "Head of People",
  seniority: "Executive",
  industry: "Technology",
  expertise: ["Talent acquisition", "Culture"],
  audience: ["Founders", "HR leaders"],
  contentPillars: ["Hiring", "Leadership"],
  proofPoints: ["Scaled a team from 40 to 180"],
  careerHighlights: ["Led people operations at a SaaS company"],
  avoidedTopics: ["Payroll compliance"],
  contentGoals: ["Build authority"],
  confidence: 0.92,
  source: "resume_pdf",
}

describe("professional context", () => {
  it("redacts direct contact and national ID data", () => {
    const redacted = redactSensitiveResumeText(`
      Jane Doe
      jane@example.com
      +92 300 1234567
      35202-1234567-1
      Head of People
    `)

    expect(redacted).not.toContain("jane@example.com")
    expect(redacted).not.toContain("300 1234567")
    expect(redacted).not.toContain("35202-1234567-1")
    expect(redacted).toContain("Head of People")
  })

  it("rejects oversized or malformed saved context", () => {
    expect(parseProfessionalContext(context)).toEqual(context)
    expect(parseProfessionalContext({ ...context, confidence: 2 })).toBeNull()
    expect(parseProfessionalContext({ ...context, expertise: Array(20).fill("x") })).toBeNull()
  })

  it("normalizes incomplete AI import output without weakening saved context validation", () => {
    const imported = parseImportedProfessionalContext({
      primaryRole: "  Head of People  ",
      expertise: ["Talent acquisition", 42, "", ...Array(15).fill("Leadership")],
      confidence: "92%",
    }, "resume_pdf")

    expect(imported).toMatchObject({
      primaryRole: "Head of People",
      seniority: "",
      industry: "",
      confidence: 0.92,
      source: "resume_pdf",
    })
    expect(imported?.expertise).toHaveLength(12)
    expect(imported?.audience).toEqual([])
    expect(parseImportedProfessionalContext([], "resume_pdf")).toBeNull()
  })

  it("adds factual professional context only when available", () => {
    const legacyPrompt = buildGeneratePrompt("Founder", "Hiring", "medium")
    const contextualPrompt = buildGeneratePrompt("Founder", "Hiring", "medium", undefined, {
      professionalContext: context,
    })
    const hooksPrompt = buildHook5StylesPrompt("Hiring", "HR Leader", undefined, {
      professionalContext: context,
    })

    expect(legacyPrompt.system).not.toContain("PROFESSIONAL CONTEXT:")
    expect(contextualPrompt.system).toContain("Primary role: Head of People")
    expect(contextualPrompt.system).toContain("Scaled a team from 40 to 180")
    expect(contextualPrompt.system).toContain("Never invent employers, metrics, credentials, or experiences")
    expect(hooksPrompt.system).toContain("Content pillars: Hiring; Leadership")
  })

  it("loads professional context from the existing characteristics JSONB", () => {
    const profile = toPromptVoiceProfile({
      tone: "Direct",
      characteristics: { tone: "Direct", professionalContext: context },
    })

    expect(profile?.tone).toBe("Direct")
    expect(profile?.professionalContext?.primaryRole).toBe("Head of People")
    expect(professionalContextPrompt(profile?.professionalContext)).toContain("Audience: Founders; HR leaders")
  })
})
