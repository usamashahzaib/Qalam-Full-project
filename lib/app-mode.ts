/**
 * App mode definitions. A mode filters navigation to show only relevant
 * surfaces. No billing or feature changes - just focus.
 */

export type AppMode = "career" | "linkedin"

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
]

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
  "/settings",
  "/settings/referrals",
  "/upgrade",
  "/billing/success",
])

/**
 * Returns true if a nav link should be visible in the given mode.
 */
export function isVisibleInMode(href: string, mode: AppMode): boolean {
  const set = mode === "career" ? CAREER_HREFS : LINKEDIN_HREFS
  return set.has(href)
}

export const MODE_STORAGE_KEY = "qalam_app_mode"

export const DEFAULT_MODE: AppMode = "linkedin"

export function isAppMode(value: unknown): value is AppMode {
  return value === "career" || value === "linkedin"
}

/**
 * Turns a persisted preference into the mode to render and whether the user
 * still needs to choose one. Anything unrecognised - never set, or the retired
 * "everything" value - falls back to the default and asks.
 */
export function resolveStoredMode(stored: string | null): {
  mode: AppMode
  needsOnboarding: boolean
} {
  if (stored && isAppMode(stored)) return { mode: stored, needsOnboarding: false }
  return { mode: DEFAULT_MODE, needsOnboarding: true }
}
