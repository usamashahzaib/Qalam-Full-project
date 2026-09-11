import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

describe("WorkspaceProvider authentication recovery", () => {
  it("clears a server-rejected session before redirecting to login", () => {
    const provider = fs.readFileSync(path.join(process.cwd(), "components/providers/WorkspaceProvider.tsx"), "utf8")
    const rejectedSessionBranch = provider.slice(
      provider.indexOf("if (res.status === 401)"),
      provider.indexOf('if (!res.ok || !data.workspaceId)'),
    )

    expect(rejectedSessionBranch).toContain("sessionStorage.removeItem(workspaceCacheKey(clientParam))")
    expect(rejectedSessionBranch).toContain("sessionStorage.removeItem(billingCacheKey(clientParam))")
    expect(rejectedSessionBranch).toContain("await signOut({ redirectTo: loginUrl })")
  })
})
