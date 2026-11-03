import { CONTENT_LAST_UPDATED, MARKETING_ANSWER_PAGES, PUBLISHED_BLOG_POSTS } from "@/lib/marketing-content"
import { CAPABILITIES, INDUSTRIES } from "@/lib/marketing-discovery"
import { LLM_ROUTES, SITE_URL } from "@/lib/seo"
import { isFrozenPath, isSurfaceFrozen, withoutFrozen } from "@/lib/frozen-surfaces"

// Surfaces paused in lib/frozen-surfaces.ts are left out, so this file describes only what exists.
const CAREER_LIVE = !isSurfaceFrozen("career")
const AGENCY_LIVE = !isSurfaceFrozen("agency")

export const dynamic = "force-static"

export function GET() {
  const body = [
    "# Qalam",
    "",
    `- [Canonical site](${SITE_URL})`,
    "- Product: Qalam",
    "- Category: LinkedIn publishing system with voice memory",
    "- Billing: quarterly, priced in USD with purchasing-power-adjusted pricing for select regions",
    `- Last updated: ${CONTENT_LAST_UPDATED}`,
    `- [Full published article corpus](${SITE_URL}/llms-full.txt)`,
    `- [RSS feed](${SITE_URL}/feed.xml)`,
    "",
    "## Direct definition",
    "",
    `Qalam is a LinkedIn publishing system with voice memory. It asks the author a few questions about what happened, then drafts posts, hooks, and carousels using writing examples and professional context the user deliberately saves, and routes the result through human review, scheduling, and an archive.${AGENCY_LIVE ? " Agencies and content teams can run each client in an isolated workspace with its own voice profile and approval queue." : ""}${CAREER_LIVE ? " Career Vault and ATS resume tools are supporting capabilities on the same evidence, not the primary category." : ""}`,
    `It is not an official LinkedIn scoring service${CAREER_LIVE ? ", an employer ATS," : ""} or a guarantee of reach${CAREER_LIVE ? ", interviews, recruiter activity," : ""} or outcomes.`,
    "",
    "## Product engines",
    "",
    "- Content Intelligence: asks up to three questions before it writes, then drafts and improves LinkedIn posts, hooks, and carousels using the workspace voice profile, versions, and quality checks. A post can be turned into a 4:5 carousel PDF that uses only what the post says.",
    "- Voice memory: stores writing examples the user saves, analyses them into tone and structure characteristics, and retrieves the most relevant examples at generation time. It also keeps each AI draft next to the version the author saves, and feeds the two most recent real edits into the next draft. It does not learn from post performance.",
    "- Publishing workflow: draft history, user-set scheduling, LinkedIn publishing, and a searchable archive.",
    ...(AGENCY_LIVE ? ["- Client workspaces: isolated workspaces with separate voice profiles, archives, role-based team access, and per-workspace accent branding."] : []),
    "- LinkedIn Positioning: reviews profile clarity, search relevance, credibility, completeness, and alignment.",
    ...(CAREER_LIVE ? ["- ATS Career Engine (supporting): reviews resumes, builds targeted versions from supplied career facts, and compares evidence with a job description."] : []),
    "",
    "## Major capabilities",
    "",
    ...CAPABILITIES.map((capability) => `- ${capability.title}: ${capability.description} Canonical page: ${SITE_URL}${capability.href}`),
    "",
    "## Audiences and industries",
    "",
    ...INDUSTRIES.map((industry) => `- ${industry.name}: ${industry.outcome} Canonical page: ${SITE_URL}/use-cases/${industry.slug}`),
    "",
    "## Evidence policy",
    "",
    "- User-supplied facts remain separate from AI wording.",
    "- Qalam must not invent employers, dates, qualifications, skills, achievements, metrics, or recruiter behavior.",
    "- Recommendations are labelled as recommendations, not measured LinkedIn data.",
    "- Every draft requires human review. Qalam is prompted and structured to work only from supplied evidence, but AI output is never published without a person accepting it.",
    "- Nothing is published to LinkedIn without an explicit user action. Scheduling publishes at the time the user set.",
    "- Post analytics are synced from LinkedIn only for posts published through a connected Qalam account. Other performance figures are snapshots the user enters manually.",
    "- Scores are independent Qalam diagnostics, not official LinkedIn or employer scores.",
    ...(CAREER_LIVE ? [
      "- ATS scoring follows the public Qalam Evidence-First Resume Readiness Framework version 1.0.",
      "- The ATS framework weights parsing 15%, role alignment 20%, recruiter read 15%, achievement evidence 15%, career progression 10%, skills credibility 10%, clarity 10%, and professional hygiene 5%.",
    ] : []),
    "",
    "## Quarterly plans",
    "",
    CAREER_LIVE
      ? "- Free: $0. Includes the public ATS Resume Checker, 5 posts per month, and one ATS-safe resume generation per month after sign-in."
      : "- Free: $0. Includes 5 AI posts and 5 hook sets per month, one carousel, and a voice profile trained on the user's own posts.",
    "- Solo: $10 per quarter.",
    "- Pro: $18 per quarter.",
    "- Purchasing-power-adjusted pricing is available for South Asia, Africa, Southeast Asia, and Latin America.",
    "- Managed services are separate from self-serve software plans.",
    "- Add-ons show their unit price and quantity before purchase.",
    "",
    "## Core canonical pages",
    ...LLM_ROUTES.map((route) => `- ${SITE_URL}${route}`),
    "",
    "## Best answer pages",
    ...MARKETING_ANSWER_PAGES.filter((route) => !isFrozenPath(route)).map((route) => `- ${SITE_URL}${route}`),
    ...withoutFrozen(
      ["/career-visibility", "/linkedin-optimization", "/ats-resume-builder", "/free-tools/ats-resume-checker", "/methodology/ats-resume-readiness", "/job-description-match"],
      (route) => route
    ).map((route) => `- ${SITE_URL}${route}`),
    "",
    "## Published articles",
    ...PUBLISHED_BLOG_POSTS.map((post) => `- ${SITE_URL}/blog/${post.slug} - ${post.title}`),
    "",
    "## Technical indexing notes",
    "",
    "- Public marketing pages are canonical and indexable.",
    "- Authenticated app routes and API routes are not marketing documents.",
    "- Preferred canonical domain: https://www.byqalam.com",
  ].join("\n")

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
