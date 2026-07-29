import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const helper = readFileSync(resolve(process.cwd(), "lib/server/career-usage.ts"), "utf8")
const generatedResume = readFileSync(resolve(process.cwd(), "app/api/career/resumes/generate/route.ts"), "utf8")
const manualResume = readFileSync(resolve(process.cwd(), "app/api/career/resumes/route.ts"), "utf8")

describe("career usage compensation", () => {
  it("exposes quota and add-on rollback helpers", () => {
    expect(helper).toContain("refundCareerUsage")
    expect(helper).toContain("claimExtraResumeCredit")
    expect(helper).toContain("releaseExtraResumeCredit")
  })

  it("returns generated resume reservations on failure", () => {
    expect(generatedResume).toContain("releaseReservation")
    expect(generatedResume).toContain("await releaseReservation()")
  })

  it("returns manual resume reservations on failure", () => {
    expect(manualResume).toContain("releaseReservation")
    expect(manualResume).toContain("await releaseReservation()")
  })
})
