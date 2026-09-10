/**
 * App mode definitions. A mode filters navigation to show only relevant
 * surfaces. No billing or feature changes - just focus.
 *
 * "everything" is the escape hatch that shows the full nav.
 */

export type AppMode = "career" | "linkedin" | "everything"

export const APP_MODES: { key: AppMode; label: string; description: string }[] = [
  {
    key: "career",
    label: "Career",
    description: "Resumes, applications, evidence, job targeting",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    description: "Write, schedule, publish, analyze posts",
  },
  {
    key: "everything",
    label: "Everything",
    description: "All Qalam tools in one workspace",
  },
]

// Links that appear in Career mode. Dashboard and Settings always show.
const CAREER_HREFS = new Set([
  "/dashboard",
  "/career",
  "/career/applications",
  "/career/evidence",
  "/career/resumes",
  "/career/deep-resume-review",
  "/voice",
  "/settings",
  "/settings/referrals",
  "/upgrade",
  "/billing/success",
])

// Links that appear in LinkedIn mode. Dashboard and Settings always show.
const LINKEDIN_HREFS = new Set([
  "/dashboard",
  "/writer",
  "/chat",
  "/calendar",
  "/approvals",
  "/analytics",
  "/voice",
  "/library",
  "/carousels",
  "/competitors",
  "/comment-generator",
  "/silent-growth",
  "/agency",
  "/settings",
  "/settings/referrals",
  "/upgrade",
  "/billing/success",
])

/**
 * Returns true if a nav link should be visible in the given mode.
 * "everything" always returns true. Career and LinkedIn filter by their sets.
 */
export function isVisibleInMode(href: string, mode: AppMode): boolean {
  if (mode === "everything") return true
  const set = mode === "career" ? CAREER_HREFS : LINKEDIN_HREFS
  return set.has(href)
}

export const MODE_STORAGE_KEY = "qalam_app_mode"
