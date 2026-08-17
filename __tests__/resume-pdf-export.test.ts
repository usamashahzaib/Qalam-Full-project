import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { buildResumePdf, resumePdfFilename } from "@/lib/server/resume-pdf-export"

describe("resume PDF export", () => {
  it("creates a readable multi-page PDF from long ATS content", async () => {
    const bytes = await buildResumePdf({
      fullName: "Ayesha Khan",
      email: "ayesha@example.com",
      phone: "+92 300 0000000",
      location: "Karachi, Pakistan",
      linkedinUrl: "linkedin.com/in/ayesha",
      headline: "Senior Product Manager",
      summary: "Product leader focused on measurable customer and business outcomes.",
      skills: ["Product Strategy", "Roadmapping", "Analytics"],
      experience: Array.from({ length: 12 }, (_, index) => ({
        title: `Product Role ${index + 1}`,
        organization: "Example Company",
        location: "Karachi",
        startDate: "2020",
        endDate: "Present",
        bullets: Array.from({ length: 5 }, () => "Led cross-functional delivery and improved a verified operating metric through structured discovery."),
      })),
      education: [],
      certifications: ["Product Management Certificate"],
      projects: [],
    }, "clean")

    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF")
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(1)
  })

  it("sanitizes download filenames", () => {
    expect(resumePdfFilename("  Senior PM / Fintech  ")).toBe("Senior-PM-Fintech.pdf")
  })
})
