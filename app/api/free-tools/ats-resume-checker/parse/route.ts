export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { getClientIp, checkRateLimit } from "@/lib/server/rate-limit"
import { MAX_RESUME_MULTIPART_BYTES, extractResumePdfText } from "@/lib/server/resume-pdf"
import { extractResumeDocxText } from "@/lib/server/resume-docx"

const errorStatus: Record<string, number> = {
  resume_file_missing: 400,
  resume_file_type_unsupported: 415,
  resume_pdf_type_invalid: 415,
  resume_pdf_empty: 400,
  resume_pdf_too_large: 413,
  resume_pdf_signature_invalid: 400,
  resume_pdf_too_many_pages: 400,
  resume_pdf_text_missing: 422,
  resume_docx_type_invalid: 415,
  resume_docx_empty: 400,
  resume_docx_too_large: 413,
  resume_docx_signature_invalid: 400,
  resume_docx_parse_failed: 422,
  resume_docx_text_missing: 422,
}

const responseError = (code: string) => NextResponse.json({ error: code }, { status: errorStatus[code] || 422 })

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit("free-tools-ats-resume-parse", "free", ip)
  if (!rateLimit.allowed) return NextResponse.json({ error: "Upload limit reached. Please try again shortly." }, { status: 429 })

  if (Number(request.headers.get("content-length") || 0) > MAX_RESUME_MULTIPART_BYTES) {
    return responseError("resume_pdf_too_large")
  }
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return responseError("resume_file_missing")

  const name = file.name.toLowerCase()
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf")
  const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")
  try {
    if (isPdf) {
      const result = await extractResumePdfText(file)
      return NextResponse.json({ text: result.text, pages: result.totalPages, source: "pdf" })
    }
    if (isDocx) {
      const result = await extractResumeDocxText(file)
      return NextResponse.json({ text: result.text, source: "docx" })
    }
    return responseError("resume_file_type_unsupported")
  } catch (error) {
    return responseError(error instanceof Error ? error.message : "resume_file_type_unsupported")
  }
}
