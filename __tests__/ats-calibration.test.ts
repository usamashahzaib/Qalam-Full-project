import { describe, expect, it } from "vitest"
import { scoreResume } from "@/lib/ats-engine"
import { normalizeResumeData } from "@/lib/ats-normalize"
import { CALIBRATION_JD as JD, strongResume, weakResume } from "./fixtures/ats-resumes"
import type { ResumeData } from "@/lib/career-resume"
// The score has to mean the same thing a recruiter would conclude. These
// fixtures pin the bands: a duty-list resume with filler cannot look
// competitive, and a tight evidence-led resume cannot be held down by
// mechanical checks.

const score = (resume: ResumeData) =>
  scoreResume({ resume: normalizeResumeData(resume), jobDescription: JD, targetRole: "Administration Manager" })

describe("ATS score calibration", () => {
  it("keeps a duty-list resume with filler out of the competitive band", () => {
    expect(score(weakResume).overall).toBeLessThan(55)
  })

  it("puts an evidence-led, tailored resume in the top band", () => {
    expect(score(strongResume).overall).toBeGreaterThanOrEqual(88)
  })
})
