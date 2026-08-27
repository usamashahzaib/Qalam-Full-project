export const ATS_FUNNEL_SOURCE = "ats_resume_checker" as const

export const ATS_CTA_PLACEMENTS = ["post_result_sidebar", "post_result_summary"] as const
export type AtsCtaPlacement = typeof ATS_CTA_PLACEMENTS[number]

export const ATS_RESUME_DESTINATION = "career_resumes" as const

export function isAtsCtaPlacement(value: unknown): value is AtsCtaPlacement {
  return typeof value === "string" && ATS_CTA_PLACEMENTS.includes(value as AtsCtaPlacement)
}

export function buildAtsResumeDestination(placement: AtsCtaPlacement): string {
  const params = new URLSearchParams({
    source: ATS_FUNNEL_SOURCE,
    placement,
  })
  return `/career/resumes?${params.toString()}`
}

export function buildAtsResumeLoginUrl(appUrl: string, placement: AtsCtaPlacement): string {
  const baseUrl = appUrl.replace(/\/$/, "")
  return `${baseUrl}/login?callbackUrl=${encodeURIComponent(buildAtsResumeDestination(placement))}`
}
