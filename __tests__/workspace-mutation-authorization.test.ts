import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const protectedRoutes = [
  "app/api/linkedin/token/route.ts",
  "app/api/posts/reschedule/route.ts",
  "app/api/posts/unschedule/route.ts",
  "app/api/posts/duplicate/route.ts",
  "app/api/voice-profile/route.ts",
  "app/api/events/route.ts",
  "app/api/jobs/route.ts",
  "app/api/analytics/route.ts",
  "app/api/generate/route.ts",
  "app/api/generate/carousel/route.ts",
  "app/api/generate/cta-rewrite/route.ts",
  "app/api/generate/hooks/route.ts",
  "app/api/generate/improve/route.ts",
  "app/api/generate/post/route.ts",
  "app/api/generate/score/route.ts",
  "app/api/posts/[id]/versions/[versionId]/restore/route.ts",
  "app/api/voice/analyze/route.ts",
  "app/api/voice/import-document/route.ts",
]

describe("workspace mutation authorization", () => {
  for (const route of protectedRoutes) {
    it(`${route} enforces editor access`, () => {
      const source = readFileSync(resolve(process.cwd(), route), "utf8")
      expect(source).toMatch(/(?:requireRole|authorizeRole)\([^)]*"editor"\)/)
    })
  }

  it("protects both analytics mutation handlers", () => {
    const source = readFileSync(resolve(process.cwd(), "app/api/analytics/route.ts"), "utf8")
    expect(source.match(/authorizeRole\(req, user\.workspaceId, "editor"\)/g)).toHaveLength(2)
  })
})
