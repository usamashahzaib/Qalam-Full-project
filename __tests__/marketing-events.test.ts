import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  resetActivationGuardForTests,
  trackActivationOnce,
  trackMarketingEvent,
} from "@/lib/marketing-events"

const memoryStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    values,
  }
}

beforeEach(() => {
  resetActivationGuardForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("trackMarketingEvent", () => {
  it("sends named events to gtag", () => {
    const gtag = vi.fn()
    vi.stubGlobal("window", { gtag })

    trackMarketingEvent("assessment_complete", {
      assessment: "ats_resume_checker",
      score_band: "strong",
      job_description_supplied: false,
    })

    expect(gtag).toHaveBeenCalledWith("event", "assessment_complete", {
      assessment: "ats_resume_checker",
      score_band: "strong",
      job_description_supplied: false,
    })
  })

  it("is a no-op during server rendering", () => {
    vi.stubGlobal("window", undefined)
    expect(() => trackMarketingEvent("homepage_view", {})).not.toThrow()
  })

  it("does not throw when gtag is absent", () => {
    vi.stubGlobal("window", {})
    expect(() => trackMarketingEvent("homepage_view", {})).not.toThrow()
  })

  it("never propagates a gtag failure into the calling workflow", () => {
    const gtag = vi.fn(() => { throw new Error("tag manager unavailable") })
    vi.stubGlobal("window", { gtag })

    expect(() => trackMarketingEvent("assessment_complete", {
      assessment: "ats_resume_checker",
      score_band: "strong",
      job_description_supplied: false,
    })).not.toThrow()
  })

  it("copies only the exact event allowlist so short PII cannot leak", () => {
    const gtag = vi.fn()
    vi.stubGlobal("window", { gtag })

    trackMarketingEvent("assessment_complete", {
      assessment: "ats_resume_checker",
      score_band: "strong",
      job_description_supplied: true,
      email: "a@b.co",
      name: "Ayesha",
      resume_text: "short evidence",
      word_count: 640,
    } as never)

    expect(gtag).toHaveBeenCalledWith("event", "assessment_complete", {
      assessment: "ats_resume_checker",
      score_band: "strong",
      job_description_supplied: true,
    })
  })

  it("drops the whole event when a required allowlisted value is invalid", () => {
    const gtag = vi.fn()
    vi.stubGlobal("window", { gtag })

    trackMarketingEvent("assessment_complete", {
      assessment: "ats_resume_checker",
      score_band: "invented",
      job_description_supplied: true,
    } as never)

    expect(gtag).not.toHaveBeenCalled()
  })
})

describe("trackActivationOnce", () => {
  it("emits each activation workflow once per browser session", () => {
    const gtag = vi.fn()
    vi.stubGlobal("window", { gtag, sessionStorage: memoryStorage() })

    trackActivationOnce("writer_draft_generated", { content_type: "linkedin_post" })
    trackActivationOnce("writer_draft_generated", { content_type: "linkedin_post" })

    expect(gtag).toHaveBeenCalledTimes(1)
    expect(gtag).toHaveBeenCalledWith("event", "activation", {
      workflow: "writer_draft_generated",
      content_type: "linkedin_post",
    })
  })

  it("stays deduplicated after a reload, when only sessionStorage survives", () => {
    const gtag = vi.fn()
    const storage = memoryStorage()
    vi.stubGlobal("window", { gtag, sessionStorage: storage })

    trackActivationOnce("writer_draft_generated", { content_type: "linkedin_post" })
    expect(gtag).toHaveBeenCalledTimes(1)

    // A reload clears module state but keeps sessionStorage.
    resetActivationGuardForTests()
    trackActivationOnce("writer_draft_generated", { content_type: "linkedin_post" })

    expect(gtag).toHaveBeenCalledTimes(1)
    expect(storage.values.get("qalam:activation:writer_draft_generated")).toBe("1")
  })

  it("still emits exactly once per page life when storage is disabled", () => {
    const gtag = vi.fn()
    vi.stubGlobal("window", {
      gtag,
      sessionStorage: {
        getItem: () => { throw new Error("storage disabled") },
        setItem: () => { throw new Error("storage disabled") },
      },
    })

    trackActivationOnce("writer_draft_generated", { content_type: "linkedin_post" })
    trackActivationOnce("writer_draft_generated", { content_type: "linkedin_post" })

    expect(gtag).toHaveBeenCalledTimes(1)
  })

  it("does not throw when gtag is missing or throwing", () => {
    vi.stubGlobal("window", { sessionStorage: memoryStorage() })
    expect(() => trackActivationOnce("writer_draft_generated", { content_type: "linkedin_post" })).not.toThrow()

    resetActivationGuardForTests()
    vi.stubGlobal("window", {
      gtag: () => { throw new Error("blocked") },
      sessionStorage: memoryStorage(),
    })
    expect(() => trackActivationOnce("writer_draft_generated", { content_type: "linkedin_post" })).not.toThrow()
  })

  it("is a no-op during server rendering", () => {
    vi.stubGlobal("window", undefined)
    expect(() => trackActivationOnce("writer_draft_generated", { content_type: "linkedin_post" })).not.toThrow()
  })
})
