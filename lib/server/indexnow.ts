import "server-only"

import { PUBLIC_ROUTES, SITE_URL } from "@/lib/seo"
import { PUBLISHED_BLOG_POSTS } from "@/lib/marketing-content"
import { PRODUCT_PAGES, USE_CASE_PAGES } from "@/lib/site-content"
import { AGENCY_PLAN_LIVE } from "@/lib/pricing"

const keyPattern = /^[A-Za-z0-9-]{8,128}$/

export const getIndexNowKey = () => {
  const key = process.env.INDEXNOW_KEY?.trim() || ""
  return keyPattern.test(key) ? key : null
}

export async function submitIndexNow() {
  const key = getIndexNowKey()
  if (!key) return { ok: false as const, error: "INDEXNOW_KEY is missing or invalid." }

  const origin = new URL(SITE_URL)
  const urlList = [...new Set([
    ...PUBLIC_ROUTES.map((route) => `${SITE_URL}${route.path === "/" ? "" : route.path}`),
    ...Object.keys(PRODUCT_PAGES)
      .filter((slug) => AGENCY_PLAN_LIVE || slug !== "agency-workspaces")
      .map((slug) => `${SITE_URL}/product/${slug}`),
    ...Object.keys(USE_CASE_PAGES).map((slug) => `${SITE_URL}/use-cases/${slug}`),
    ...PUBLISHED_BLOG_POSTS.map((post) => `${SITE_URL}/blog/${post.slug}`),
  ])]
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: origin.host,
      key,
      keyLocation: `${SITE_URL}/indexnow-key.txt`,
      urlList,
    }),
  })

  return response.ok
    ? { ok: true as const, submitted: urlList.length, status: response.status }
    : { ok: false as const, error: `IndexNow returned HTTP ${response.status}.`, status: response.status }
}
