import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"
import { PROTECTED_ROUTES } from "@/lib/protected-routes"

const PRIVATE_ROUTES = [
  "/api/",
  "/reset-password",
  "/verify-email",
  "/forgot-password",
  "/login",
  "/signup",
  "/admin",
  ...PROTECTED_ROUTES,
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "OAI-SearchBot", allow: "/", disallow: PRIVATE_ROUTES },
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
