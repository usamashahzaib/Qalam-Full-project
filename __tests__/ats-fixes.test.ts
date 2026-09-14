import { describe, expect, it } from "vitest"
import { normalizeResumeData } from "@/lib/ats-normalize"
import { findFixTargets, hasPlaceholder, quickFixes, scoreOf, writePath } from "@/lib/ats-fixes"
import { titleCase } from "@/lib/title-case"
import { weakResume } from "./fixtures/ats-resumes"

const context = {
  targetRole: "Administration Manager",
  jobDescription: `Job Title: Administration Manager. Oversee plant administration, facility management, vendor management and statutory compliance.
Requirements: labour law compliance, vendor management, budgeting, OPEX cost control, security and transport management, government liaison with EOBI and PESSI, MS Office and SAP.`,
}

const resume = normalizeResumeData(weakResume)

describe("fix targets", () => {
  it("points at the exact bullets that carry no number", () => {
    const targets = findFixTargets("quantified_results", resume, scoreOf(resume, context))
    expect(targets.length).toBe(resume.experience.flatMap((entry) => entry.bullets).length)
    expect(targets[0]).toMatchObject({ path: { kind: "bullet", role: 0, bullet: 0 }, current: resume.experience[0].bullets[0] })
  })

  it("raises the score when a flagged line is rewritten with a real figure and result", () => {
    const before = scoreOf(resume, context)
    let next = resume
    for (const target of findFixTargets("quantified_results", resume, before)) {
      next = writePath(next, target.path, "Renegotiated 12 vendor contracts, cutting admin spend by 9%")
    }
    const after = scoreOf(next, context)
    expect(after.factors.find((factor) => factor.key === "achievement_evidence")!.score).toBeGreaterThan(90)
    expect(after.rawOverall).toBeGreaterThan(before.rawOverall)
  })
})

describe("quick fixes", () => {
  it("only offers fixes that move the score", () => {
    const audit = scoreOf(resume, context)
    for (const checkId of ["title_alignment", "skills_target_overlap", "date_format_consistent"]) {
      for (const fix of quickFixes(checkId, resume, audit, context)) {
        const next = scoreOf(fix.next, context)
        expect(next.overall > audit.overall || next.rawOverall > audit.rawOverall).toBe(true)
      }
    }
    expect(quickFixes("title_alignment", resume, audit, context)[0].next.headline).toContain("Administration Manager")
  })
})

describe("placeholders", () => {
  it("fails hygiene until a bracketed figure is filled in", () => {
    const withPrompt = writePath(resume, { kind: "bullet", role: 0, bullet: 0 }, "Managed [number of vendors] vendors")
    expect(hasPlaceholder(withPrompt.experience[0].bullets[0])).toBe(true)
    const hygiene = scoreOf(withPrompt, context).factors.find((factor) => factor.key === "professional_hygiene")!
    expect(hygiene.checks.find((check) => check.id === "no_placeholders")!.state).toBe("fail")
  })
})

describe("titleCase", () => {
  it("capitalises headings without breaking acronyms or connecting words", () => {
    expect(titleCase("Six-second recruiter read")).toBe("Six-Second Recruiter Read")
    expect(titleCase("ATS parsing")).toBe("ATS Parsing")
    expect(titleCase("Bullets carry numbers")).toBe("Bullets Carry Numbers")
    expect(titleCase("Headline and recent title match the target")).toBe("Headline and Recent Title Match the Target")
  })
})
