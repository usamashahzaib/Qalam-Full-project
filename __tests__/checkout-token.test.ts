import { describe, it, expect, vi } from "vitest"
import { signCheckoutToken, verifyCheckoutToken } from "@/lib/server/checkout-token"

describe("checkout token (trusted identity signal for Lemon Squeezy checkout)", () => {
  it("round-trips: a freshly signed token verifies back to the same user id", () => {
    const token = signCheckoutToken("user-123")
    expect(verifyCheckoutToken(token)).toBe("user-123")
  })

  it("produces a different token each time (embeds an expiry) but both verify to the same user", () => {
    const tokenA = signCheckoutToken("user-123")
    const tokenB = signCheckoutToken("user-123")
    expect(verifyCheckoutToken(tokenA)).toBe("user-123")
    expect(verifyCheckoutToken(tokenB)).toBe("user-123")
  })

  it("rejects a token with a tampered payload (different user id spliced in)", () => {
    const token = signCheckoutToken("victim-user")
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [, expiresAt, sig] = decoded.split(".")
    const tampered = Buffer.from(`attacker-user.${expiresAt}.${sig}`, "utf8").toString("base64url")
    expect(verifyCheckoutToken(tampered)).toBeNull()
  })

  it("rejects a token with a tampered signature", () => {
    const token = signCheckoutToken("user-123")
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [userId, expiresAt, sig] = decoded.split(".")
    const flippedSig = sig.slice(0, -1) + (sig.at(-1) === "0" ? "1" : "0")
    const tampered = Buffer.from(`${userId}.${expiresAt}.${flippedSig}`, "utf8").toString("base64url")
    expect(verifyCheckoutToken(tampered)).toBeNull()
  })

  it("rejects an expired token even with a valid signature", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
      const token = signCheckoutToken("user-123", 1000) // 1s TTL

      vi.setSystemTime(new Date("2026-01-01T00:00:01.001Z")) // just past expiry
      expect(verifyCheckoutToken(token)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it("accepts a token right up until (inclusive of) its expiry instant", () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))
      const token = signCheckoutToken("user-123", 1000)

      vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z")) // exactly at expiry
      expect(verifyCheckoutToken(token)).toBe("user-123")
    } finally {
      vi.useRealTimers()
    }
  })

  it("rejects malformed input", () => {
    expect(verifyCheckoutToken("")).toBeNull()
    expect(verifyCheckoutToken("not-a-valid-token")).toBeNull()
    expect(verifyCheckoutToken(Buffer.from("only.two", "utf8").toString("base64url"))).toBeNull()
  })
})
