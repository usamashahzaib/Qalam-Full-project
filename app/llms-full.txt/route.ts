import { CONTENT_LAST_UPDATED, PUBLISHED_BLOG_POSTS } from "@/lib/marketing-content"
import { SITE_NAME, SITE_URL } from "@/lib/seo"

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
