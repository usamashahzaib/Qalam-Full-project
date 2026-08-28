import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { CTASlide } from "@/components/carousel/CTASlide"
import { CAROUSEL_THEMES } from "@/lib/carousel-design"
import {
  PUBLIC_SCORE_FLOOR,
  isScorePubliclyShareable,
  resumeScoreBand,
} from "@/lib/career-resume-review"

/**
 * Word-of-mouth guarantees. These cover two things that are invisible in
 * normal review and expensive to lose: the attribution that rides on every
 * exported carousel, and the floor that keeps a weak score private.
 */

describe("carousel attribution", () => {
  const themeIds = Object.keys(CAROUSEL_THEMES) as (keyof typeof CAROUSEL_THEMES)[]

  it.each(themeIds)("renders the Qalam credit on the %s closing slide", (themeId) => {
    const markup = renderToStaticMarkup(
      <CTASlide
        title="One last thing"
        body="A closing thought."
        authorName="Sample Author"
        designation="Operations Lead"
        theme={CAROUSEL_THEMES[themeId]}
        totalSlides={6}
        slideNumber={6}
      />
    )
    expect(markup).toContain("Designed with Qalam")
    expect(markup).toContain("byqalam.com")
  })

  it("covers every layout variant, so a new variant cannot ship unattributed", () => {
    const rendered = new Set(
      themeIds.map((id) => CAROUSEL_THEMES[id].variant)
    )
    // Every variant the theme table can produce is exercised above.
    expect(rendered.size).toBeGreaterThanOrEqual(7)
  })
})

describe("readiness score sharing floor", () => {
  it("never treats a weak score as publishable", () => {
    expect(isScorePubliclyShareable(0)).toBe(false)
    expect(isScorePubliclyShareable(41)).toBe(false)
    expect(isScorePubliclyShareable(PUBLIC_SCORE_FLOOR - 1)).toBe(false)
  })

  it("allows sharing at and above the floor", () => {
    expect(isScorePubliclyShareable(PUBLIC_SCORE_FLOOR)).toBe(true)
    expect(isScorePubliclyShareable(88)).toBe(true)
    expect(isScorePubliclyShareable(100)).toBe(true)
  })

  it("keeps the floor above the at_risk band, so a failing score is never offered", () => {
    expect(resumeScoreBand(PUBLIC_SCORE_FLOOR)).not.toBe("at_risk")
  })
})
