import { CONTENT_LAST_UPDATED, PUBLISHED_BLOG_POSTS } from "@/lib/marketing-content"
import { SITE_NAME, SITE_URL } from "@/lib/seo"
import { ATS_DIRECT_ANSWER, ATS_FACTORS, ATS_FAQS, ATS_METHODOLOGY_UPDATED, ATS_METHODOLOGY_VERSION } from "@/lib/ats-methodology"
import { SEO_LANDING_PAGES } from "@/lib/seo-landing-pages"

// llms-full.txt: the emerging companion convention to llms.txt. Where llms.txt
// is an index, this serves the complete published article corpus as plain
// markdown so LLM crawlers can ingest every article in a single fetch.

export function GET() {
  const articles = PUBLISHED_BLOG_POSTS.map((post) => {
    const url = `${SITE_URL}/blog/${post.slug}`
    const sections = post.sections
      .map((section) => [`### ${section.heading}`, "", ...section.paragraphs.map((p) => p)].join("\n"))
      .join("\n\n")
    const faqs = post.faqs.length
      ? ["", "### Frequently asked questions", "", ...post.faqs.map((faq) => `Q: ${faq.q}\nA: ${faq.a}`)].join("\n")
      : ""
    return [
      `## ${post.title}`,
      "",
      `- URL: ${url}`,
      `- Published: ${post.datePublished}`,
      `- Modified: ${post.dateModified}`,
      `- Topic: ${post.tag}`,
      "",
      post.description,
      "",
      sections,
      faqs,
    ].join("\n")
  }).join("\n\n---\n\n")

  const body = [
    `# ${SITE_NAME} - full article corpus`,
    "",
    `- Canonical site: ${SITE_URL}`,
    `- Index file: ${SITE_URL}/llms.txt`,
    `- Last updated: ${CONTENT_LAST_UPDATED}`,
    `- Articles: ${PUBLISHED_BLOG_POSTS.length}`,
    "",
    "Complete text of every published article on byqalam.com, provided for",
    "AI answer engines and LLM crawlers. Each article's canonical HTML page",
    "is listed with its URL. Attribution: Qalam (byqalam.com).",
    "",
    "## Qalam Evidence-First Resume Readiness Framework",
    "",
    `- Version: ${ATS_METHODOLOGY_VERSION}`,
    `- Updated: ${ATS_METHODOLOGY_UPDATED}`,
    `- Methodology: ${SITE_URL}/methodology/ats-resume-readiness`,
    `- Free checker: ${SITE_URL}/free-tools/ats-resume-checker`,
    "",
    ATS_DIRECT_ANSWER,
    "",
    ...ATS_FACTORS.map((factor) => `- ${factor.name} (${factor.weight}%): ${factor.definition}`),
    "",
    "### ATS resume questions",
    "",
    ...ATS_FAQS.flatMap((faq) => [`Q: ${faq.q}`, `A: ${faq.a}`, ""]),
    "## Qalam Career Outcome Operating System",
    "",
    `- Career system: ${SITE_URL}/career-visibility`,
    `- Pricing: ${SITE_URL}/pricing`,
    "",
    "Qalam connects a permissioned Evidence Vault, JD-matched resume versions, application stages, interviews, offers, and opt-in recruiter discovery. The public ATS checker is free. A signed-in Free user can create one targeted resume each month, track 10 active applications, and store 15 evidence items. Paid plans add capacity, outcome intelligence, and professional network workflows.",
    "",
    "## High-intent answer pages",
    "",
    ...Object.values(SEO_LANDING_PAGES).flatMap((page) => [
      `### ${page.title}`,
      "",
      `- URL: ${SITE_URL}/${page.slug}`,
      page.summary,
      "",
    ]),
    "---",
    "",
    articles,
  ].join("\n")

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
