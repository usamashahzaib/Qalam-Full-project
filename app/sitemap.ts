import type { MetadataRoute } from "next"
import { PUBLISHED_BLOG_POSTS } from "@/lib/marketing-content"
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/seo"
import { PRODUCT_PAGES, USE_CASE_PAGES } from "@/lib/site-content"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  const productRoutes = Object.entries(PRODUCT_PAGES).map(([slug, page]) => ({
    url: `${SITE_URL}/product/${slug}`,
    lastModified: new Date(page.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.72,
  }))

  const useCaseRoutes = Object.entries(USE_CASE_PAGES).map(([slug, page]) => ({
    url: `${SITE_URL}/use-cases/${slug}`,
    lastModified: new Date(page.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.68,
  }))

  const blogRoutes = PUBLISHED_BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.dateModified),
    changeFrequency: "monthly" as const,
    priority: 0.74,
  }))

  return [...staticRoutes, ...productRoutes, ...useCaseRoutes, ...blogRoutes]
}
