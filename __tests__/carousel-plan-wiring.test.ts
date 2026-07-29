import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

describe("carousel plan wiring", () => {
  it("lets Free users access and edit their included carousel", () => {
    const detail = read("app/api/carousel/[id]/route.ts")
    const slides = read("app/api/carousel/[id]/slides/[slideId]/route.ts")
    expect(detail.match(/requirePlan\(req, "Free"\)/g)).toHaveLength(3)
    expect(slides.match(/requirePlan\(req, "Free"\)/g)).toHaveLength(2)
  })

  it("enforces the plan slide cap on both server and client", () => {
    expect(read("app/api/carousel/route.ts")).toContain("parsed.data.slideCount > planCheck.limits.carouselSlides")
    const page = read("app/(app)/carousels/page.tsx")
    expect(page).toContain("max={maxSlides}")
    expect(page).toContain("useState(5)")
  })

  it("redirects the retired PDF route to the current editor", () => {
    const legacy = read("app/carousel/[id]/pdf/route.ts")
    expect(legacy).toContain("/carousels/")
    expect(legacy).not.toContain("carousel_projects")
  })
})
