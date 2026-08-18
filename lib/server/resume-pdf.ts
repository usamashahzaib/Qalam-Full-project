import "server-only"

import { extractText, getDocumentProxy } from "unpdf"
import { redactSensitiveResumeText } from "@/lib/professional-context"

export const MAX_RESUME_PDF_BYTES = 5 * 1024 * 1024
export const MAX_RESUME_PDF_PAGES = 15
export const MAX_RESUME_MULTIPART_BYTES = MAX_RESUME_PDF_BYTES + 1024 * 1024

const PDF_SIGNATURE = Buffer.from("%PDF-")

export type ResumePdfText = {
  text: string
  totalPages: number
}

export async function extractResumePdfText(file: File): Promise<ResumePdfText> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("resume_pdf_type_invalid")
  if (file.size < PDF_SIGNATURE.length) throw new Error("resume_pdf_empty")
  if (file.size > MAX_RESUME_PDF_BYTES) throw new Error("resume_pdf_too_large")

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!Buffer.from(bytes.subarray(0, PDF_SIGNATURE.length)).equals(PDF_SIGNATURE)) {
    throw new Error("resume_pdf_signature_invalid")
  }

  const pdf = await getDocumentProxy(bytes)
  if (pdf.numPages > MAX_RESUME_PDF_PAGES) {
    await pdf.destroy()
    throw new Error("resume_pdf_too_many_pages")
  }

  try {
    const result = await extractText(pdf, { mergePages: true })
    const text = redactSensitiveResumeText(result.text)
    if (text.length < 120) throw new Error("resume_pdf_text_missing")
    return { text, totalPages: result.totalPages }
  } finally {
    await pdf.destroy()
  }
}
