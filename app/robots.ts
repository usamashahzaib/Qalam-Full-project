import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

const PRIVATE_ROUTES = [
  "/api/",
  "/dashboard",
  "/write",
  "/writer",
  "/calendar",
  "/library",
  "/analytics",
  "/voice",
  "/agency",
  "/competitors",
  "/settings",
  "/login",
  "/signup",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "GPTBot", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "PerplexityBot", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "ClaudeBot", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "Google-Extended", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "anthropic-ai", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "Applebot-Extended", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "cohere-ai", allow: "/", disallow: PRIVATE_ROUTES },
      { userAgent: "*", allow: "/", disallow: PRIVATE_ROUTES },
    ],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
