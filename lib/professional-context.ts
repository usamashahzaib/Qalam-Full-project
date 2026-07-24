import { z } from "zod"

const shortText = z.string().trim().max(160)
const list = z.array(z.string().trim().min(1).max(180)).max(12)

export const ProfessionalContextSchema = z.object({
  primaryRole: shortText,
  seniority: shortText,
  industry: shortText,
  expertise: list,
  audience: list,
  contentPillars: list,
  proofPoints: list,
  careerHighlights: list,
  avoidedTopics: list,
  contentGoals: list,
  confidence: z.number().min(0).max(1),
  source: z.enum(["resume_pdf", "linkedin_pdf"]),
  reviewedAt: z.string().datetime().optional(),
})

export type ProfessionalContext = z.infer<typeof ProfessionalContextSchema>

const compact = (value: string) => value.replace(/\s+/g, " ").trim()
const redact = (value: string, pattern: RegExp, replacement: string) =>
  value.replace(pattern, replacement)

export function redactSensitiveResumeText(input: string): string {
  let text = input.replace(/\u0000/g, " ")
  text = redact(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]")
  text = redact(text, /(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone removed]")
  text = redact(text, /\b(?:\d{5}-\d{7}-\d|\d{13})\b/g, "[national id removed]")
  return text
    .split(/\r?\n/)
    .map(compact)
    .filter(Boolean)
    .join("\n")
    .slice(0, 18_000)
}

export function parseProfessionalContext(value: unknown): ProfessionalContext | null {
  const parsed = ProfessionalContextSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function professionalContextPrompt(context?: ProfessionalContext | null): string {
  if (!context) return ""
  const line = (label: string, values: string[]) =>
    values.length ? `${label}: ${values.join("; ")}` : ""
  return [
    "PROFESSIONAL CONTEXT:",
    `Primary role: ${context.primaryRole || "not specified"}`,
    `Seniority: ${context.seniority || "not specified"}`,
    `Industry: ${context.industry || "not specified"}`,
    line("Expertise", context.expertise),
    line("Audience", context.audience),
    line("Content pillars", context.contentPillars),
    line("Verified proof points", context.proofPoints),
    line("Career context", context.careerHighlights),
    line("Content goals", context.contentGoals),
    line("Avoid these topics", context.avoidedTopics),
    "Use only supplied proof points as personal facts. Never invent employers, metrics, credentials, or experiences.",
  ].filter(Boolean).join("\n")
}
