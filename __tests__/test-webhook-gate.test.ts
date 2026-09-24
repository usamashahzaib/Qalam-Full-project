import { describe, expect, it } from "vitest"
import { isTestWebhookEnabled } from "@/lib/server/test-webhook-gate"

describe("isTestWebhookEnabled", () => {
  it("allows local and unrecognized environments", () => {
    expect(isTestWebhookEnabled({})).toBe(true)
    expect(isTestWebhookEnabled({ NEXT_PUBLIC_QALAM_ENV: "development" })).toBe(true)
  })

  it("allows preview deployments", () => {
    expect(isTestWebhookEnabled({ VERCEL_ENV: "preview" })).toBe(true)
  })

  it("blocks production unless explicitly enabled", () => {
    expect(isTestWebhookEnabled({ VERCEL_ENV: "production" })).toBe(false)
    expect(isTestWebhookEnabled({ NEXT_PUBLIC_QALAM_ENV: "production" })).toBe(false)
    expect(isTestWebhookEnabled({ NEXT_PUBLIC_VERCEL_ENV: "Production " })).toBe(false)
    expect(isTestWebhookEnabled({ VERCEL_ENV: "production", PAYMENTS_TEST_WEBHOOK_ENABLED: "0" })).toBe(false)
    expect(isTestWebhookEnabled({ VERCEL_ENV: "production", PAYMENTS_TEST_WEBHOOK_ENABLED: "1" })).toBe(true)
  })

  it("trusts the server-side Vercel tier over a public override", () => {
    expect(isTestWebhookEnabled({ VERCEL_ENV: "production", NEXT_PUBLIC_QALAM_ENV: "development" })).toBe(false)
  })
})
