import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

describe("agency workspace completion contracts", () => {
  it("creates explicit client workspaces atomically and caps them at five", () => {
    const migration = source("supabase/migrations/20260902090000_agency_workspace_ownership.sql")
    const route = source("app/api/agency/clients/route.ts")

    expect(migration).toContain("workspace_type in ('personal', 'client')")
    expect(migration).toContain("pg_advisory_xact_lock")
    expect(migration).toContain("create_client_workspace_with_limit")
    expect(route).toContain('rpc("create_client_workspace_with_limit"')
    expect(route).toContain("p_max_clients: limits.clientWorkspaces")
    expect(route).not.toContain("memberships.length - 1")
  })

  it("treats Agency seats as unique people across all owned client workspaces", () => {
    const migration = source("supabase/migrations/20260902090000_agency_workspace_ownership.sql")

    expect(migration).toContain("'agency-seats:' || v_owner_id")
    expect(migration).toContain("w.owner_id = v_owner_id and w.workspace_type = 'client'")
    expect(migration).toContain("union\n      select lower(wi.email) as identity")
  })

  it("uses the Agency owner as billing principal for delegated managers", () => {
    const workspace = source("lib/server/workspace.ts")
    const plan = source("lib/server/require-plan.ts")
    const generationRoutes = [
      "app/api/generate/post/route.ts",
      "app/api/generate/hooks/route.ts",
      "app/api/generate/improve/route.ts",
      "app/api/generate/score/route.ts",
      "app/api/generate/carousel/route.ts",
      "app/api/comments/generate/route.ts",
      "app/api/competitors/analyze/route.ts",
    ].map(source).join("\n")

    expect(workspace).toContain("resolveWorkspaceBillingPrincipal")
    expect(plan).toContain("billingUserId: billingPrincipal.userId")
    expect(generationRoutes).toContain("planCheck.billingUserId")
    expect(generationRoutes).not.toMatch(/(?:incrementUsage|checkPlanLimit)\(user\.id/)
  })

  it("keeps dashboards, analytics, approvals, research, and comments in the selected client", () => {
    expect(source("app/(app)/dashboard/@stats/page.tsx")).toContain("resolveWorkspaceForSession")
    expect(source("app/(app)/dashboard/@feed/page.tsx")).toContain("resolveWorkspaceForSession")
    expect(source("app/(app)/analytics/page.tsx")).toContain("workspaceKey")
    expect(source("lib/hooks/useApprovalQueue.ts")).toContain("workspaceKey")
    expect(source("app/(app)/competitors/page.tsx")).toContain("workspaceKey")
    expect(source("app/(app)/comment-generator/page.tsx")).toContain("workspaceKey: workspaceId")
    expect(source("components/DraftCounter.tsx")).toContain("workspaceKey=")
  })

  it("supports manager assignment and pending invite cancellation", () => {
    const team = source("components/TeamManagement.tsx")
    const invite = source("app/api/workspaces/[id]/invite/route.ts")

    expect(team).toContain('{ value: "admin", label: "Workspace manager"')
    expect(team).toContain('method: "DELETE"')
    expect(invite).toContain("export async function DELETE")
  })
})
