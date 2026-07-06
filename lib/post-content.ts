import type { WorkspacePost } from "@/types/domain"

export const isCarouselPostType = (type: string | null | undefined): boolean =>
  !!type && type.toLowerCase().includes("carousel")

type CarouselSlideLike = { title?: string; body?: string }

function parseCarouselSlides(content: string): CarouselSlideLike[] | null {
  try {
    const slides = JSON.parse(content) as CarouselSlideLike[]
    return Array.isArray(slides) && slides.length > 0 ? slides : null
  } catch {
    return null
  }
}

/** Short, human-readable summary for list/search views. Carousel posts store their slides as raw JSON in `content`. */
export function getPostPreviewText(post: Pick<WorkspacePost, "type" | "content">): string {
  if (isCarouselPostType(post.type)) {
    const slides = parseCarouselSlides(post.content)
    if (slides) {
      const firstTitle = slides[0].title || slides[0].body?.slice(0, 60) || "Untitled slide"
      return `Carousel - ${slides.length} slides: ${firstTitle}`
    }
  }
  return post.content || ""
}

/** Full plain-text extraction suitable for feeding back into AI generation (e.g. "build a carousel from this post"). */
export function getPostSourceText(post: Pick<WorkspacePost, "type" | "content">): string {
  if (isCarouselPostType(post.type)) {
    const slides = parseCarouselSlides(post.content)
    if (slides) {
      return slides.map((s) => [s.title, s.body].filter(Boolean).join(": ")).join("\n\n")
    }
  }
  return post.content || ""
}
