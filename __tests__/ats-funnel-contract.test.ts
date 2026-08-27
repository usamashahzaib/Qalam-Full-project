import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ATS_FUNNEL_SOURCE,
  ATS_RESUME_DESTINATION,
  buildAtsResumeDestination,
  buildAtsResumeLoginUrl,
} from "@/lib/ats-funnel"
import { safeMarketingProperties } from "@/lib/marketing-events"

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8")

describe("ATS funnel event contract", () => {
  it("carries only fixed source and placement markers through login", () => {
    const loginUrl = new URL(buildAtsResumeLoginUrl("https://app.byqalam.com/", "post_result_summary"))
    const callbackUrl = loginUrl.searchParams.get("callbackUrl")

    expect(loginUrl.pathname).toBe("/login")
    expect(callbackUrl).toBe(buildAtsResumeDestination("post_result_summary"))
    expect(new URL(callbackUrl!, "https://app.byqalam.com").searchParams.get("source")).toBe(ATS_FUNNEL_SOURCE)
    expect(callbackUrl).not.toContain("resumeText")
    expect(callbackUrl).not.toContain("jobDescription")
  })

  it("allowlists signup start properties and drops content-shaped extras", () => {
    expect(safeMarketingProperties("signup_start", {
      source: ATS_FUNNEL_SOURCE,
      placement: "post_result_sidebar",
      resume_text: "private resume content",
      email: "person@example.com",
      score: 72,
    })).toEqual({
      source: ATS_FUNNEL_SOURCE,
      placement: "post_result_sidebar",
    })
  })

  it("allowlists completed handoffs and rejects invented destinations", () => {
    expect(safeMarketingProperties("ats_resume_handoff", {
      source: ATS_FUNNEL_SOURCE,
      placement: "post_result_summary",
      destination: ATS_RESUME_DESTINATION,
      job_description: "private job description",
    })).toEqual({
      source: ATS_FUNNEL_SOURCE,
      placement: "post_result_summary",
      destination: ATS_RESUME_DESTINATION,
    })

    expect(safeMarketingProperties("ats_resume_handoff", {
      source: ATS_FUNNEL_SOURCE,
      placement: "post_result_summary",
      destination: "external_builder",
    })).toBeNull()
  })

  it("instruments both checker result placements and records the reached handoff", () => {
    const checker = source("components/tools/AtsResumeCheckerTool.tsx")
    const resumes = source("app/(app)/career/resumes/page.tsx")

    expect(checker).toContain('trackSignupStart("post_result_sidebar")')
    expect(checker).toContain('trackSignupStart("post_result_summary")')
    expect(resumes).toContain('trackMarketingEvent("ats_resume_handoff"')
    expect(resumes).toContain("hasAtsHandoff")
  })

  it("preserves the callback across login, signup, verification, and authenticated redirects", () => {
    const login = source("app/login/page.tsx")
    const signup = source("app/signup/page.tsx")
    const signupApi = source("app/api/auth/signup/route.ts")
    const verification = source("app/api/auth/verify-email/route.ts")
    const authConfig = source("auth.config.ts")

    expect(login).toContain("signupUrl")
    expect(signup).toContain("callbackUrl")
    expect(signupApi).toContain("encodeURIComponent(callbackUrl)")
    expect(verification).toContain('loginUrl.searchParams.set("callbackUrl", callbackUrl)')
    expect(authConfig).toContain('safeRedirectPath(request.nextUrl.searchParams.get("callbackUrl"))')
  })
})
