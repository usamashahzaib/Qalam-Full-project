import type { MetadataRoute } from "next"

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
  "/auth",
  "/auth/sign-up",
  "/login",
  "/signup",
]

// Scrapers and data-harvesting bots — explicitly disallowed
const DISALLOWED_SCRAPERS = [
  "SemrushBot",
  "AhrefsBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "DataForSeoBot",
  "Bytespider",
  "PetalBot",
  "YandexBot",
  "Sogou",
  "ia_archiver",
  "HTTrack",
  "wget",
  "curl",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI answer engines — allowed everywhere public (LLMO / AEO strategy)
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "cohere-ai", allow: "/" },
      // SEO scrapers and data harvesters — disallowed entirely
      ...DISALLOWED_SCRAPERS.map((userAgent) => ({
        userAgent,
        disallow: ["/"],
      })),
      // All other crawlers — public pages only, private routes blocked
      { userAgent: "*", allow: "/", disallow: PRIVATE_ROUTES },
    ],
    sitemap: "https://byqalam.com/sitemap.xml",
  }
}
