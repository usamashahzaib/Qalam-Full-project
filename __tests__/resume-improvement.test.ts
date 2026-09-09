import { describe, expect, it } from "vitest"
import { emptyResumeData } from "@/lib/career-resume"
import { mergeResumeContact } from "@/lib/resume-contact"
import { scoreResume } from "@/lib/ats-engine"
import { normalizeResumeData } from "@/lib/ats-normalize"
import { buildResumePdf } from "@/lib/server/resume-pdf-export"
import { buildResumeDocx } from "@/lib/server/resume-docx-export"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"
import { extractText, getDocumentProxy } from "unpdf"
import JSZip from "jszip"

const resume = { ...emptyResumeData, fullName: "Ayesha Khan", headline: "People Operations Manager", summary: "People operations manager building recruitment and onboarding processes for international teams.", experience: [{ title: "People Operations Manager", organization: "Example Company", location: "Lahore", startDate: "Jan 2023", endDate: "Present", bullets: ["Managed recruitment processes", "Built onboarding workflows"] }] }

describe("resume improvement loop", () => {
  it("restores uploaded contact details before scoring without modifying the source", () => {
    const before = scoreResume({ resume })
    const restored = mergeResumeContact(resume, { email: "ayesha@example.com", phone: "+92 300 1234567", location: "Lahore" })
    const after = scoreResume({ resume: normalizeResumeData(restored) })
    expect(after.overall).toBeGreaterThan(before.overall)
    expect(after.factors.flatMap((factor) => factor.checks).find((check) => check.id === "contact_valid")?.state).toBe("pass")
    expect(resume.email).toBe("")
    expect(mergeResumeContact(restored, { email: "" }).email).toBe("ayesha@example.com")
  })

  it("rewards supplied evidence and removes resolved suggestions", () => {
    const before = scoreResume({ resume })
    const improved = { ...resume, experience: [{ ...resume.experience[0], bullets: ["Reduced hiring time by 25% through structured interviews", "Built onboarding workflows for 50 employees, reducing ramp time by 20%"] }] }
    const after = scoreResume({ resume: normalizeResumeData(improved) })
    expect(after.overall).toBeGreaterThan(before.overall)
    expect(after.suggestions.some((item) => item.checkId === "quantified_results")).toBe(false)
    expect(scoreResume({ resume }).overall).toBe(before.overall)
  })

  it.each(RESUME_TEMPLATES.map((template) => template.key))("preserves readable content in %s PDF and Word", async (key) => {
    const pdf = await getDocumentProxy(await buildResumePdf(resume, key))
    try {
      const text = (await extractText(pdf, { mergePages: true })).text
      expect(text).toContain("Ayesha Khan")
      expect(text).toContain("Managed recruitment processes")
    } finally { await pdf.destroy() }
    const docx = await JSZip.loadAsync(await buildResumeDocx(resume, key))
    expect(await docx.file("word/document.xml")!.async("string")).toContain("Managed recruitment processes")
  })

  it("exports different typography and header treatments", async () => {
    const executive = await JSZip.loadAsync(await buildResumeDocx(resume, "executive"))
    const modern = await JSZip.loadAsync(await buildResumeDocx(resume, "modern"))
    expect(await executive.file("word/styles.xml")!.async("string")).toContain('w:ascii="Georgia"')
    expect(await executive.file("word/styles.xml")!.async("string")).toContain('w:jc w:val="center"')
    expect(await modern.file("word/styles.xml")!.async("string")).toContain("w:top")
  })
})
