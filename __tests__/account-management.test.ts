import { describe, expect, it } from "vitest"
import { ACCOUNT_ROLES } from "@/lib/constants"
import { hashPassword, verifyPassword } from "@/lib/server/password"

describe("account management", () => {
  it("keeps account roles unique and accepted by the shared validator", () => {
    expect(new Set(ACCOUNT_ROLES).size).toBe(ACCOUNT_ROLES.length)
    expect(ACCOUNT_ROLES).toContain("Founder / Entrepreneur")
    expect(ACCOUNT_ROLES).toContain("Consultant")
  })

  it("hashes and verifies password changes with Argon2id", async () => {
    const hash = await hashPassword("correct-horse-42")
    expect(hash.startsWith("$argon2id$")).toBe(true)
    await expect(verifyPassword("correct-horse-42", hash)).resolves.toMatchObject({ valid: true })
    await expect(verifyPassword("wrong-password", hash)).resolves.toMatchObject({ valid: false })
  })
})
