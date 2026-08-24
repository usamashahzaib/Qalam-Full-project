export const SEO_CANONICAL_REDIRECTS = {
  "/ai-content-writer": "/linkedin-post-writer",
  "/linkedin-post-generator": "/linkedin-post-writer",
  "/ai-linkedin-post-generator": "/linkedin-post-writer",
  "/linkedin-ai-ghostwriter": "/linkedin-post-writer",
  "/linkedin-ghostwriter-ai": "/linkedin-post-writer",
  "/best-ai-linkedin-writer": "/linkedin-post-writer",
  "/linkedin-profile-optimizer": "/linkedin-profile-optimization",
} as const

export const REDIRECTED_SEO_SLUGS = new Set(
  Object.keys(SEO_CANONICAL_REDIRECTS).map((path) => path.slice(1)),
)
