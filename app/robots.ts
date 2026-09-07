import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"
import { PROTECTED_ROUTES } from "@/lib/protected-routes"

const PRIVATE_PATHS = [
  "/api",
  "/reset-password",
  "/verify-email",
  "/forgot-password",
  "/login",
  "/signup",
  "/admin",
  ...PROTECTED_ROUTES,
  "/billing",
  "/upgrade",
  "/extension/connect",
]

// A bare prefix such as /career also blocks /careers and /career-visibility.
// Cover the exact route, query strings, and descendants without that collision.
const PRIVATE_ROUTES = [...new Set(PRIVATE_PATHS)].flatMap((path) => [
  `${path}$`, `${path}?`, `${path}/`,
])

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
