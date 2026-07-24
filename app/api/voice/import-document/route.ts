export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getClientIp, checkRateLimit } from "@/lib/server/rate-limit"
import {
  MAX_RESUME_MULTIPART_BYTES,
  extractResumePdfText,
} from "@/lib/server/resume-pdf"
import {
  parseImportedProfessionalContext,
} from "@/lib/professional-context"

const ERROR_STATUS: Record<string, number> = {
  resume_pdf_type_invalid: 415,
  resume_pdf_empty: 400,
  resume_pdf_too_large: 413,
  resume_pdf_signature_invalid: 400,
  resume_pdf_too_many_pages: 400,
  resume_pdf_text_missing: 422,
}

const responseError = (code: string, status = 400) =>
  NextResponse.json({ error: code }, { status })
const responseText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : ""

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response

    const contentLength = Number(req.headers.get("content-length") || 0)
    if (contentLength > MAX_RESUME_MULTIPART_BYTES) {
      return responseError("resume_pdf_too_large", 413)
    }

    const rateLimit = await checkRateLimit(
      "voice-profile-import",
      planCheck.plan,
      getClientIp(req)
    )
    if (!rateLimit.allowed) return responseError("rate_limit_exceeded", 429)

    const form = await req.formData().catch(() => null)
    const file = form?.get("document")
    const source = form?.get("source") === "linkedin_pdf" ? "linkedin_pdf" : "resume_pdf"
    if (!(file instanceof File)) return responseError("resume_pdf_missing")

    let extracted: Awaited<ReturnType<typeof extractResumePdfText>>
    try {
      extracted = await extractResumePdfText(file)
    } catch (error) {
      const code = (error as Error).message
      return responseError(code, ERROR_STATUS[code] || 422)
    }

    const system = [
      "You extract a professional content profile from a resume or LinkedIn profile.",
      "Return valid JSON only.",
      "Ignore contact details, addresses, references, dates of birth, IDs, and private personal data.",
      "Do not invent facts. Empty arrays are better than guesses.",
      "Content pillars must fit the person's demonstrated career and expertise.",
      "Include every requested key. Use empty strings or arrays when evidence is missing.",
      "Confidence must be a number from 0 to 1.",
    ].join(" ")

    const userMessage = `Analyze this redacted professional document.

DOCUMENT:
${extracted.text}

Return JSON:
{
  "primaryRole": "current or most relevant professional role",
  "seniority": "career seniority",
  "industry": "primary industry",
  "expertise": ["specific expertise"],
  "audience": ["people this person can credibly write for"],
  "contentPillars": ["3-6 recurring LinkedIn content themes"],
  "proofPoints": ["metrics or outcomes explicitly supported by the document"],
  "careerHighlights": ["short factual career highlights"],
  "avoidedTopics": ["topics the document does not support"],
  "contentGoals": ["credible LinkedIn content goals"],
  "confidence": 0.0,
  "suggestedName": "name if clear",
  "suggestedLinkedinUrl": ""
}`

    let raw: string
    try {
      raw = await callAi("voice-profile", system, userMessage, {
        json: true,
        temperature: 0.2,
        maxTokens: 1200,
        userId: user.id,
        plan: planCheck.plan,
        cache: false,
      })
    } catch {
      return responseError("professional_profile_analysis_failed", 503)
    }

    const parsed = safeParseJson<unknown>(raw)
    const context = parseImportedProfessionalContext(parsed, source)
    if (!context) {
      return responseError("professional_profile_response_invalid", 502)
    }
    const analysis = parsed as Record<string, unknown>

    return NextResponse.json({
      professionalContext: context,
      suggestions: {
        name: responseText(analysis.suggestedName, 120),
        title: context.primaryRole,
        industry: context.industry,
        goals: context.contentGoals.join(", "),
        linkedinUrl: responseText(analysis.suggestedLinkedinUrl, 300),
      },
      sourceDeleted: true,
      rawTextStored: false,
      pagesAnalyzed: extracted.totalPages,
    })
  })(request)
}
