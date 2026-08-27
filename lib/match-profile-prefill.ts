import { parseProfessionalContext } from "@/lib/professional-context"

export const MATCH_PREFILL_SOURCES = ["career_vault", "profile", "publishing_context"] as const
export type MatchPrefillSource = typeof MATCH_PREFILL_SOURCES[number]

export type MatchProfileDraft = {
  opted_in: boolean
  display_name: string
  headline: string
  industry: string
  seniority: string
  location: string
  expertise: string[]
  audience: string[]
  goals: string[]
  contact_email: string | null
  linkedin_url: string | null
}

type MatchProfileInput = Record<string, unknown> | null | undefined
type CareerVaultInput = Record<string, unknown> | null | undefined
type WorkspaceProfileInput = Record<string, unknown> | null | undefined

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""

const stringList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string")
  if (typeof value !== "string") return []
  return value.split(/[,;\n]+/)
}

const tags = (value: unknown, max: number): string[] => {
  const seen = new Set<string>()
  const output: string[] = []
  for (const item of stringList(value)) {
    const normalized = text(item, 120)
    const key = normalized.toLocaleLowerCase()
    if (!normalized || seen.has(key)) continue
    seen.add(key)
    output.push(normalized)
    if (output.length === max) break
  }
  return output
}

const savedTags = (value: unknown, max: number) => tags(value, max)

export function buildMatchProfileDraft({
  saved,
  careerVault,
  profile,
}: {
  saved?: MatchProfileInput
  careerVault?: CareerVaultInput
  profile?: WorkspaceProfileInput
}): { draft: MatchProfileDraft; sources: MatchPrefillSource[] } {
  const sources = new Set<MatchPrefillSource>()
  const characteristics = profile?.characteristics && typeof profile.characteristics === "object"
    ? profile.characteristics as Record<string, unknown>
    : null
  const publishingContext = parseProfessionalContext(characteristics?.professionalContext)

  const pickText = (
    savedValue: unknown,
    candidates: Array<[MatchPrefillSource, unknown]>,
    max: number,
  ) => {
    const existing = text(savedValue, max)
    if (existing) return existing
    for (const [source, candidate] of candidates) {
      const next = text(candidate, max)
      if (!next) continue
      sources.add(source)
      return next
    }
    return ""
  }

  const pickTags = (
    savedValue: unknown,
    candidates: Array<[MatchPrefillSource, unknown]>,
    max: number,
  ) => {
    const existing = savedTags(savedValue, max)
    if (existing.length) return existing

    const output: string[] = []
    const seen = new Set<string>()
    for (const [source, candidate] of candidates) {
      let contributed = false
      for (const item of tags(candidate, max)) {
        const key = item.toLocaleLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        output.push(item)
        contributed = true
        if (output.length === max) break
      }
      if (contributed) sources.add(source)
      if (output.length === max) break
    }
    return output
  }

  return {
    draft: {
      opted_in: saved?.opted_in === true,
      display_name: pickText(saved?.display_name, [["profile", profile?.name]], 160),
      headline: pickText(saved?.headline, [
        ["profile", profile?.title],
        ["publishing_context", publishingContext?.primaryRole],
        ["career_vault", careerVault?.target_role],
      ], 300),
      industry: pickText(saved?.industry, [
        ["profile", profile?.industry],
        ["publishing_context", publishingContext?.industry],
        ["career_vault", careerVault?.target_industry],
      ], 120),
      seniority: pickText(saved?.seniority, [["publishing_context", publishingContext?.seniority]], 120),
      location: pickText(saved?.location, [["career_vault", careerVault?.location]], 120),
      expertise: pickTags(saved?.expertise, [
        ["publishing_context", publishingContext?.contentPillars],
        ["publishing_context", publishingContext?.expertise],
        ["career_vault", careerVault?.skills],
      ], 12),
      audience: pickTags(saved?.audience, [["publishing_context", publishingContext?.audience]], 12),
      goals: pickTags(saved?.goals, [
        ["profile", profile?.goals],
        ["publishing_context", publishingContext?.contentGoals],
        ["career_vault", careerVault?.career_goals],
      ], 8),
      contact_email: text(saved?.contact_email, 250) || null,
      linkedin_url: pickText(saved?.linkedin_url, [["profile", profile?.linkedin_url]], 300) || null,
    },
    sources: MATCH_PREFILL_SOURCES.filter((source) => sources.has(source)),
  }
}
