export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildResumeReviewPrompt, normalizeResumeReview } from "@/lib/career-resume-review"
import { scoreResume } from "@/lib/ats-engine"
import { normalizeResumeData } from "@/lib/ats-normalize"
import { parseConfidence, parseResumeText } from "@/lib/ats-text-parse"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { checkFreeToolsGlobalBudget, checkRateLimit, getClientIp } from "@/lib/server/rate-limit"

const schema = z.object({
  resumeText: z.string().trim().min(200).max(20000),
  jobDescription: z.string().trim().max(12000).default(""),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rateLimit = await checkRateLimit("free-tools-ats-resume", "free", ip)
    if (!rateLimit.allowed || !(await checkFreeToolsGlobalBudget())) {
      return NextResponse.json({ error: "Free checker limit reached. Please try again later." }, { status: 429 })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Paste at least 200 characters from your resume." }, { status: 400 })
    }

    // The score is computed from the text before the model is called, so the
    // public number is reproducible and every point can be traced to a named
    // check. The model is still asked for the recruiter judgement, which is
    // the part a rule cannot supply.
    const structured = normalizeResumeData(parseResumeText(parsed.data.resumeText))
    const confidence = parseConfidence(structured, parsed.data.resumeText)
    const audit = confidence >= 40
      ? scoreResume({ resume: structured, jobDescription: parsed.data.jobDescription })
      : null

    const raw = await callAi(
      "voice-profile",
      "Return strict JSON only. Preserve candidate truth and evaluate only job-relevant evidence.",
      buildResumeReviewPrompt(parsed.data.resumeText, parsed.data.jobDescription),
      { json: true, temperature: 0.2, timeout: 30000, userId: `free_ats_${ip}`, plan: "free", cache: true, cacheTtl: 3600 }
    )
    const result = normalizeResumeReview(safeParseJson(raw), audit, confidence)
    return result
      ? NextResponse.json(result)
      : NextResponse.json({ error: "The resume check could not be completed." }, { status: 503 })
  } catch (error) {
    console.error("[ATS Resume Checker Error]", error)
    return NextResponse.json({ error: "The resume check is temporarily unavailable." }, { status: 503 })
  }
}
