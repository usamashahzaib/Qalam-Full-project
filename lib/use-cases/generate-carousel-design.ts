import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { getThemeById, DEFAULT_THEME_ID } from "@/lib/carousel-themes"
import type { CarouselTheme, SlideDesign, SlideLayout, AnimationHint, CarouselDesign } from "@/types/carousel"

export interface GenerateCarouselDesignInput {
  slideCount: number
  themeId?: string
  firstSlideTitle?: string
}

const LAYOUT_SEQUENCE: SlideLayout[] = ["title", "list", "quote", "stat", "cta"]
const ANIMATIONS: AnimationHint[] = ["fade-in", "slide-up", "scale", "fade-in", "slide-up"]

function pickLayout(index: number, total: number): SlideLayout {
  if (index === 0) return "title"
  if (index === total - 1) return "cta"
  return LAYOUT_SEQUENCE[index % LAYOUT_SEQUENCE.length] ?? "list"
}

function pickAnimation(index: number): AnimationHint {
  return ANIMATIONS[index % ANIMATIONS.length] ?? "fade-in"
}

export function generateCarouselDesign(
  input: GenerateCarouselDesignInput
): Result<CarouselDesign> {
  const { slideCount, themeId } = input

  if (slideCount < 1 || slideCount > 20) {
    return err({ code: "VALIDATION_ERROR", message: "Slide count must be between 1 and 20" })
  }

  const theme: CarouselTheme = getThemeById(themeId ?? DEFAULT_THEME_ID)

  const slides: SlideDesign[] = Array.from({ length: slideCount }, (_, i) => ({
    slideNumber: i + 1,
    layout: pickLayout(i, slideCount),
    theme,
    textStyling: {
      headingBold: true,
      bodyItalic: pickLayout(i, slideCount) === "quote",
      keyPointsUnderline: pickLayout(i, slideCount) === "list",
    },
    animation: pickAnimation(i),
  }))

  return ok({ themeId: theme.id, slides })
}
