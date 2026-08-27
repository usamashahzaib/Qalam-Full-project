import { CONTENT_LAST_UPDATED, PUBLISHED_BLOG_POSTS } from "@/lib/marketing-content"
import { SITE_NAME, SITE_URL } from "@/lib/seo"

// Next 15+ defaults GET route handlers to dynamic; this content only changes
// at build/deploy time, so pin it back to static generation and CDN caching.
export const dynamic = "force-static"

// RSS 2.0 feed of the published article corpus. Feed readers, search crawlers,
// and LLM ingestion pipelines all consume this - it signals content freshness
// and gives every post a machine-readable publication record.

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

export function GET() {
  const items = [...PUBLISHED_BLOG_POSTS]
    .sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1))
    .map((post) => {
      const url = `${SITE_URL}/blog/${post.slug}`
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <description>${escapeXml(post.description)}</description>`,
        `      <category>${escapeXml(post.tag)}</category>`,
        `      <pubDate>${new Date(post.datePublished).toUTCString()}</pubDate>`,
        "    </item>",
      ].join("\n")
    })
    .join("\n")

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    "  <channel>",
    `    <title>${escapeXml(SITE_NAME)} Blog</title>`,
    `    <link>${SITE_URL}/blog</link>`,
    `    <description>Guides on LinkedIn writing, voice memory, hooks, and publishing systems from ${escapeXml(SITE_NAME)}.</description>`,
    "    <language>en</language>",
    `    <lastBuildDate>${new Date(CONTENT_LAST_UPDATED).toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>`,
    items,
    "  </channel>",
    "</rss>",
  ].join("\n")

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
