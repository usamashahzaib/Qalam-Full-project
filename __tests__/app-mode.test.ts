import { describe, expect, it } from "vitest"
import {
  isVisibleInMode,
  resolveStoredMode,
  APP_MODES,
  DEFAULT_MODE,
  type AppMode,
} from "@/lib/app-mode"

describe("app-mode", () => {
  it("defines exactly two modes: career and linkedin", () => {
    const keys = APP_MODES.map((m) => m.key)
    expect(keys).toEqual(["career", "linkedin"])
  })

  it("career mode shows career hrefs and hides linkedin hrefs", () => {
    expect(isVisibleInMode("/career", "career")).toBe(true)
    expect(isVisibleInMode("/career/applications", "career")).toBe(true)
    expect(isVisibleInMode("/career/evidence", "career")).toBe(true)
    expect(isVisibleInMode("/career/resumes", "career")).toBe(true)
    expect(isVisibleInMode("/dashboard", "career")).toBe(true)
    expect(isVisibleInMode("/settings", "career")).toBe(true)
    expect(isVisibleInMode("/voice", "career")).toBe(true)

    expect(isVisibleInMode("/writer", "career")).toBe(false)
    expect(isVisibleInMode("/calendar", "career")).toBe(false)
    expect(isVisibleInMode("/analytics", "career")).toBe(false)
    expect(isVisibleInMode("/library", "career")).toBe(false)
    expect(isVisibleInMode("/carousels", "career")).toBe(false)
  })

  it("linkedin mode shows linkedin hrefs and hides career hrefs", () => {
    expect(isVisibleInMode("/writer", "linkedin")).toBe(true)
    expect(isVisibleInMode("/calendar", "linkedin")).toBe(true)
    expect(isVisibleInMode("/analytics", "linkedin")).toBe(true)
    expect(isVisibleInMode("/library", "linkedin")).toBe(true)
    expect(isVisibleInMode("/dashboard", "linkedin")).toBe(true)
    expect(isVisibleInMode("/settings", "linkedin")).toBe(true)
    expect(isVisibleInMode("/voice", "linkedin")).toBe(true)

    expect(isVisibleInMode("/career", "linkedin")).toBe(false)
    expect(isVisibleInMode("/career/applications", "linkedin")).toBe(false)
    expect(isVisibleInMode("/career/evidence", "linkedin")).toBe(false)
  })

  it("agency is not visible in either mode nav", () => {
    expect(isVisibleInMode("/agency", "career")).toBe(false)
    expect(isVisibleInMode("/agency", "linkedin")).toBe(false)
  })

  it("shared routes are visible in both modes", () => {
    const shared = ["/dashboard", "/voice", "/settings", "/settings/referrals", "/upgrade", "/billing/success"]
    for (const href of shared) {
      expect(isVisibleInMode(href, "career")).toBe(true)
      expect(isVisibleInMode(href, "linkedin")).toBe(true)
    }
  })

  it("does not accept 'everything' as a valid mode at the type level", () => {
    const modes: AppMode[] = APP_MODES.map((m) => m.key)
    expect(modes).not.toContain("everything")
  })
})

describe("app-mode preference persistence", () => {
  it("round-trips a stored mode without prompting", () => {
    expect(resolveStoredMode("career")).toEqual({ mode: "career", needsOnboarding: false })
    expect(resolveStoredMode("linkedin")).toEqual({ mode: "linkedin", needsOnboarding: false })
  })

  it("prompts a first-time user and falls back to the default", () => {
    expect(resolveStoredMode(null)).toEqual({ mode: DEFAULT_MODE, needsOnboarding: true })
  })

  it("prompts a user carrying the retired 'everything' preference", () => {
    expect(resolveStoredMode("everything")).toEqual({ mode: DEFAULT_MODE, needsOnboarding: true })
    expect(resolveStoredMode("bogus")).toEqual({ mode: DEFAULT_MODE, needsOnboarding: true })
  })

  // Regression: dismissing the welcome modal used to leave the retired value in
  // storage, so needsOnboarding stayed true and the modal reopened on every
  // load. Dismiss now writes a concrete mode; this asserts that clears it.
  it("stops prompting once a concrete mode reaches storage", () => {
    const afterDismiss = resolveStoredMode(DEFAULT_MODE)
    expect(afterDismiss.needsOnboarding).toBe(false)
    expect(afterDismiss.mode).toBe(DEFAULT_MODE)
  })
})
