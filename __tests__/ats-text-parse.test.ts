import { describe, expect, it } from "vitest"
import { parseResumeText } from "@/lib/ats-text-parse"

describe("ATS resume text parser", () => {
  it("recovers sections and experience flattened by a PDF export", () => {
    const parsed = parseResumeText([
      "Usama Shahzaib linkedin.com/in/usamashahzaib PROFESSIONAL SUMMARY People and Culture Manager with five years of experience across technology and financial services.",
      "CORE COMPETENCIES People Operations | HR Business Partnering | Talent Acquisition | International Recruitment",
      "PROFESSIONAL EXPERIENCE People and Culture Manager | Complex Technologies | Lahore, Pakistan | Feb 2025 - Present • Established the HR function for a five person company • Built structured recruitment workflows",
    ].join(" "))

    expect(parsed.summary).toContain("five years of experience")
    expect(parsed.skills).toContain("Talent Acquisition")
    expect(parsed.experience[0]).toMatchObject({
      title: "People and Culture Manager",
      organization: "Complex Technologies",
      location: "Lahore, Pakistan",
    })
    expect(parsed.experience[0].bullets).toHaveLength(2)
  })
})
