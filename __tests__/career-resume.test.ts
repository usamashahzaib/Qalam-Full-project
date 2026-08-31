import { describe, expect, it } from "vitest"
import { resumeDataSchema } from "@/lib/career-resume"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"
import { CAREER_ADD_ONS, CAREER_PLANS } from "@/lib/career-pricing"

describe("career resume product", () => {
  it("ships exactly 12 unique ATS templates", () => {
    expect(RESUME_TEMPLATES).toHaveLength(12)
    expect(new Set(RESUME_TEMPLATES.map((template) => template.key)).size).toBe(12)
  })

  it("accepts structured resume data", () => {
    const parsed = resumeDataSchema.safeParse({
      fullName: "Usama Shahzaib",
      email: "candidate@example.com",
      phone: "",
      location: "Lahore",
      linkedinUrl: "https://www.linkedin.com/in/usamashahzaib/",
      headline: "People and Culture Manager",
      summary: "Builds practical people systems for growing companies.",
      skills: ["Talent acquisition"],
      experience: [],
      education: [],
      certifications: [],
      projects: [],
    })
    expect(parsed.success).toBe(true)
  })

  it("uses USD quarterly prices", () => {
    expect(CAREER_PLANS.find((plan) => plan.name === "Solo")?.quarterlyPrice).toBe(10)
    expect(CAREER_PLANS.find((plan) => plan.name === "Pro")?.quarterlyPrice).toBe(18)
    expect(Math.max(...CAREER_ADD_ONS.map((item) => item.price))).toBeLessThanOrEqual(12)
  })
})
