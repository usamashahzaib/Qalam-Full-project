import { describe, it, expect } from "vitest"
import { ok, err, errorToStatus, type QalamError } from "@/lib/errors"

describe("ok", () => {
  it("wraps a value in a success result", () => {
    expect(ok(42)).toEqual({ ok: true, data: 42 })
  })

  it("works with objects", () => {
    const result = ok({ id: "abc", plan: "pro" })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.plan).toBe("pro")
  })

  it("works with null", () => {
    expect(ok(null)).toEqual({ ok: true, data: null })
  })
})

describe("err", () => {
  it("wraps an error in a failure result", () => {
    const e: QalamError = { code: "NOT_FOUND", message: "post not found" }
    const result = err(e)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND")
  })

  it("preserves userMessage when provided", () => {
    const e: QalamError = { code: "PLAN_LIMIT_EXCEEDED", message: "internal", userMessage: "You have reached your plan limit." }
    const result = err(e)
    if (!result.ok) expect(result.error.userMessage).toBe("You have reached your plan limit.")
  })

  it("preserves cause when provided", () => {
    const cause = new Error("upstream failure")
    const result = err({ code: "INTERNAL_ERROR", message: "internal", cause })
    if (!result.ok) expect(result.error.cause).toBe(cause)
  })
})

describe("errorToStatus", () => {
  it("maps each error code to the correct HTTP status", () => {
    expect(errorToStatus("UNAUTHORIZED")).toBe(401)
    expect(errorToStatus("FORBIDDEN")).toBe(403)
    expect(errorToStatus("NOT_FOUND")).toBe(404)
    expect(errorToStatus("PLAN_LIMIT_EXCEEDED")).toBe(429)
    expect(errorToStatus("VALIDATION_ERROR")).toBe(400)
    expect(errorToStatus("AI_UNAVAILABLE")).toBe(503)
    expect(errorToStatus("LINKEDIN_ERROR")).toBe(502)
    expect(errorToStatus("PAYMENT_ERROR")).toBe(400)
    expect(errorToStatus("INTERNAL_ERROR")).toBe(500)
  })
})
