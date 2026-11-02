/**
 * Surfaces paused while Qalam focuses on one job: LinkedIn writing for individuals.
 * The code stays in the repo. The proxy turns these paths away, and navigation,
 * sitemap and marketing links drop them.
 *
 * To bring a surface back, list its key in NEXT_PUBLIC_UNFROZEN_SURFACES
 * (comma separated, for example "agency,career"), or set it to "all".
 */

export type FrozenSurface = "career" | "agency" | "chat" | "competitors" | "prediction-tools"

const SURFACE_PATHS: Record<FrozenSurface, string[]> = {
  career: [
    "/career",
    "/ats-resume-builder",
    "/job-description-match",
    "/career-visibility",
    "/methodology/ats-resume-readiness",
    "/ats-resume-score",
    "/resume-keyword-match",
    "/ats-safe-resume-templates",
    "/recruiter-resume-review",
    "/use-cases/job-seekers",
    "/free-tools/ats-resume-checker",
    "/admin/career-addons",
    "/admin/career-organizations",
    "/api/career",
    "/api/career-vault",
    "/api/match",
    "/api/free-tools/ats-resume-checker",
  ],
  agency: [
    "/agency",
    "/agency-setup",
    "/desk",
    "/passport",
    "/connect",
    "/drop",
    "/proof",
    "/pitch",
    "/product/agency-workspaces",
    "/use-cases/agencies",
    "/api/agency",
    "/api/desk",
  ],
  chat: ["/chat", "/api/chat", "/api/strategist"],
  competitors: ["/competitors", "/api/competitors"],
  // These tools print engagement and virality numbers no model can know.
  "prediction-tools": [
    "/free-tools/engagement-predictor",
    "/free-tools/viral-checker",
    "/api/free-tools/engagement-predictor",
    "/api/free-tools/viral-checker",
  ],
}

const unfrozen = (): Set<string> =>
  new Set((process.env.NEXT_PUBLIC_UNFROZEN_SURFACES ?? "").split(",").map((key) => key.trim()).filter(Boolean))

export function isSurfaceFrozen(surface: FrozenSurface): boolean {
  const open = unfrozen()
  return !open.has("all") && !open.has(surface)
}

const matches = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)

export function frozenSurfaceFor(pathname: string): FrozenSurface | null {
  const path = pathname.split(/[?#]/, 1)[0]
  for (const surface of Object.keys(SURFACE_PATHS) as FrozenSurface[]) {
    if (isSurfaceFrozen(surface) && SURFACE_PATHS[surface].some((prefix) => matches(path, prefix))) return surface
  }
  return null
}

export const isFrozenPath = (pathname: string) => frozenSurfaceFor(pathname) !== null

/** Drops entries whose href points at a frozen surface. Absolute byqalam.com URLs are checked by path. */
export function withoutFrozen<T>(items: T[], href: (item: T) => string | undefined | null): T[] {
  return items.filter((item) => {
    const value = href(item)
    if (!value) return true
    try {
      const path = value.startsWith("/") ? value : new URL(value).pathname
      return !isFrozenPath(path)
    } catch {
      return true
    }
  })
}
