import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const route = readFileSync(resolve(process.cwd(), "app/api/linkedin/share/route.ts"), "utf8")
const worker = readFileSync(resolve(process.cwd(), "lib/server/linkedin-publish.ts"), "utf8")

describe("manual LinkedIn publish wiring", () => {
  it("uses database and Redis claims", () => {
    expect(route).toContain('rpc("claim_manual_linkedin_publish"')
    expect(route).toContain('rpc("release_manual_linkedin_publish"')
    expect(route).toContain('rpc("finalize_manual_linkedin_publish"')
  })

  it("does not release after LinkedIn confirms the share", () => {
    expect(route).toContain("claimed && !sharedOnLinkedIn")
    expect(route).toContain("sharedOnLinkedIn = true")
  })

  it("restores the original status during reconciliation", () => {
    expect(worker).toContain("manual_publish_previous_status")
    expect(worker).toContain("restoredStatus")
  })
})
