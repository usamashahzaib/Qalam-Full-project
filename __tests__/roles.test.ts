import { describe, it, expect, vi } from "vitest"

// lib/server/roles.ts imports getWorkspaceSessionContext from lib/server/workspace,
// which in turn pulls in the full @/auth NextAuth config (LinkedIn + Credentials
// providers). That chain doesn't resolve cleanly under Vitest's Node resolution,
// so stub the one function this file's pure logic (hasPermission/errorToStatus)
// never actually calls.
vi.mock("@/lib/server/workspace", () => ({ getWorkspaceSessionContext: vi.fn() }))

const { hasPermission, errorToStatus } = await import("@/lib/server/roles")
type WorkspaceRole = import("@/lib/server/roles").WorkspaceRole

// Mirrors the ROLE_HIERARCHY order in lib/server/roles.ts, highest privilege first.
const ROLES: WorkspaceRole[] = [
  "owner",
  "super_admin",
  "admin",
  "agency_admin",
  "editor",
  "client_reviewer",
  "viewer",
  "member",
]

describe("hasPermission (role hierarchy)", () => {
  // Table-driven: every role against every required role.
  for (const userRole of ROLES) {
    for (const requiredRole of ROLES) {
      const userIdx = ROLES.indexOf(userRole)
      const requiredIdx = ROLES.indexOf(requiredRole)
      const expected = userIdx <= requiredIdx

      it(`${userRole} vs required ${requiredRole} -> ${expected}`, () => {
        expect(hasPermission(userRole, requiredRole)).toBe(expected)
      })
    }
  }

  it("grants access when the role matches exactly (same role)", () => {
    for (const role of ROLES) {
      expect(hasPermission(role, role)).toBe(true)
    }
  })

  it("grants access when the user's role outranks the requirement", () => {
    expect(hasPermission("owner", "member")).toBe(true)
    expect(hasPermission("admin", "editor")).toBe(true)
  })

  it("denies access when the user's role is below the requirement", () => {
    expect(hasPermission("member", "owner")).toBe(false)
    expect(hasPermission("viewer", "admin")).toBe(false)
  })

  it("denies an unknown/unrecognized role regardless of the requirement", () => {
    expect(hasPermission("not_a_real_role" as WorkspaceRole, "member")).toBe(false)
    expect(hasPermission("not_a_real_role" as WorkspaceRole, "owner")).toBe(false)
  })

  it("treats an unknown required role as unreachable (nothing outranks it)", () => {
    expect(hasPermission("owner", "not_a_real_role" as WorkspaceRole)).toBe(false)
  })
})

describe("errorToStatus", () => {
  it("maps auth errors to 401", () => {
    expect(errorToStatus("auth_required")).toBe(401)
    expect(errorToStatus("Unauthorized")).toBe(401)
  })

  it("maps permission errors to 403", () => {
    expect(errorToStatus("forbidden")).toBe(403)
    expect(errorToStatus("unauthorized_workspace")).toBe(403)
  })

  it("maps not_found to 404", () => {
    expect(errorToStatus("not_found")).toBe(404)
  })

  it("falls back to 500 for unrecognized errors", () => {
    expect(errorToStatus("something_else")).toBe(500)
    expect(errorToStatus("")).toBe(500)
  })
})
