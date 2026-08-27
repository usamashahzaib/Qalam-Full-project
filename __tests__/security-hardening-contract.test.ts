import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("security hardening contract", () => {
  it("keeps password replacement and session revocation atomic", () => {
    const migration = source("supabase/migrations/20260824090000_atomic_security_mutations.sql")
    const changeRoute = source("app/api/auth/change-password/route.ts")
    const resetRoute = source("app/api/auth/reset-password/route.ts")

    expect(migration).toContain("password_version = password_version + 1")
    expect(changeRoute).toContain('rpc("set_user_password_and_revoke"')
    expect(resetRoute).toContain('rpc("set_user_password_and_revoke"')
    expect(changeRoute).not.toContain('.select("password_version")')
    expect(resetRoute).not.toContain('.select("password_version")')
  })

  it("serializes referral capacity checks and redemption", () => {
    const migration = source("supabase/migrations/20260824090000_atomic_security_mutations.sql")
    const referrals = source("lib/server/referrals.ts")

    expect(migration).toContain("FOR UPDATE")
    expect(migration).toContain("used_count >= referral_row.max_uses")
    expect(referrals).toContain('rpc("redeem_referral_code"')
  })

  it("does not recreate a deleted OAuth identity from an existing token", () => {
    const auth = source("lib/server/auth.ts")
    const revocation = source("lib/server/session-revocation.ts")

    expect(auth).not.toContain("provisionOAuthUser")
    expect(auth).toContain("Session expired. Please sign in again.")
    expect(revocation).toContain('eq("external_user_id", user.id)')
  })

  it("returns a uniform sign-in provider response", () => {
    const route = source("app/api/auth/check-provider/route.ts")
    const login = source("app/login/page.tsx")

    expect(route).not.toContain('from("users")')
    expect(route).toContain("{ provider: null }")
    expect(login).not.toContain("/api/auth/check-provider")
  })

  it("protects owner membership from role changes and deletion", () => {
    const route = source("app/api/workspaces/[id]/members/[userId]/route.ts")

    expect(route.match(/owner_membership_protected/g)).toHaveLength(2)
    expect(route.match(/requirePlan\(req, "Agency", workspaceId\)/g)).toHaveLength(2)
  })
})
