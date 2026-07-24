import { PDFDocument, StandardFonts } from "pdf-lib"
import { describe, expect, it } from "vitest"
import {
  extractResumePdfText,
  MAX_RESUME_PDF_PAGES,
} from "@/lib/server/resume-pdf"

async function createPdf(pages = 1) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  for (let index = 0; index < pages; index += 1) {
    const page = pdf.addPage([612, 792])
    const lines = [
      "Jane Doe. Head of People at a technology company.",
      "Led talent acquisition and scaled the team from forty to one hundred eighty.",
      "Built leadership programs and improved candidate experience.",
      "Advised founders on workplace culture and people strategy.",
      `Resume page ${index + 1}.`,
    ]
    lines.forEach((line, lineIndex) => {
      page.drawText(line, { x: 40, y: 720 - lineIndex * 24, size: 12, font })
    })
  }
  return new File([await pdf.save()], "resume.pdf", { type: "application/pdf" })
}

describe("resume PDF extraction", () => {
  it("extracts readable text without persisting a file", async () => {
    const result = await extractResumePdfText(await createPdf())
    expect(result.totalPages).toBe(1)
    expect(result.text).toContain("Head of People")
    expect(result.text).toContain("scaled the team")
  })

  it("rejects a fake PDF with the correct MIME type", async () => {
    const file = new File(["not a pdf"], "resume.pdf", { type: "application/pdf" })
    await expect(extractResumePdfText(file)).rejects.toThrow("resume_pdf_signature_invalid")
  })

  it("rejects PDFs above the page cap", async () => {
    await expect(extractResumePdfText(await createPdf(MAX_RESUME_PDF_PAGES + 1)))
      .rejects.toThrow("resume_pdf_too_many_pages")
  })
})
