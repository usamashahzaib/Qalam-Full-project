export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { getClientIp, checkRateLimit } from "@/lib/server/rate-limit"
import {
  MAX_RESUME_MULTIPART_BYTES,
  extractResumePdfText,
} from "@/lib/server/resume-pdf"
import { extractResumeDocxText } from "@/lib/server/resume-docx"

const ERROR_STATUS: Record<string, number> = {
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
  resume_file_missing: 400,
  resume_file_type_unsupported: 415,
}

const responseError = (code: string, status = 400) =>
  NextResponse.json({ error: code }, { status })

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const contentLength = Number(req.headers.get("content-length") || 0)
    if (contentLength > MAX_RESUME_MULTIPART_BYTES) {
      return responseError("resume_pdf_too_large", 413)
    }

    const rateLimit = await checkRateLimit(
      "career-resume-parse",
      planCheck.plan,
      getClientIp(req)
    )
    if (!rateLimit.allowed) return responseError("rate_limit_exceeded", 429)

    const form = await req.formData().catch(() => null)
    const file = form?.get("file")
    if (!(file instanceof File)) return responseError("resume_file_missing")

    const nameLower = file.name.toLowerCase()
    const isPdf = file.type === "application/pdf" || nameLower.endsWith(".pdf")
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      nameLower.endsWith(".docx")

    try {
      if (isPdf) {
        const extracted = await extractResumePdfText(file)
        return NextResponse.json({ text: extracted.text, pages: extracted.totalPages, kind: "pdf" })
      }
      if (isDocx) {
        const extracted = await extractResumeDocxText(file)
        return NextResponse.json({ text: extracted.text, kind: "docx" })
      }
      return responseError("resume_file_type_unsupported", 415)
    } catch (error) {
      const code = (error as Error).message
      return responseError(code, ERROR_STATUS[code] || 422)
    }
  })(request)
}
