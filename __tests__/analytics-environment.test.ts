import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * The analytics environment tier is evaluated at module load, so each case
 * mutates process.env, resets the module registry, and re-imports the module
 * under test. That is exactly what a production build does with a fresh
 * NEXT_PUBLIC_* injection, so this is a real test of load behavior rather than
 * a mock of runtime state.
 */

const PROD_ID = "G-QALAMPROD01"
const PREVIEW_ID = "G-QALAMPREV01"

const withEnv = async (
  env: Partial<Record<"NEXT_PUBLIC_QALAM_ENV" | "NEXT_PUBLIC_VERCEL_ENV" | "NEXT_PUBLIC_GA_MEASUREMENT_ID" | "NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID", string | undefined>>,
) => {
  const originals: Record<string, string | undefined> = {}
  for (const key of Object.keys(env)) {
    originals[key] = process.env[key]
    if (env[key as keyof typeof env] === undefined) delete process.env[key]
    else process.env[key] = env[key as keyof typeof env]
  }
  vi.resetModules()
  const importedModule = await import("@/lib/csp-inline-scripts")
  return { module: importedModule, restore: () => { for (const [k, v] of Object.entries(originals)) { if (v === undefined) delete process.env[k]; else process.env[k] = v } } }
}

afterEach(() => { vi.resetModules() })

describe("analytics environment tier", () => {
  it("stays silent in development even when a production ID is set", async () => {
    const { module, restore } = await withEnv({
      NEXT_PUBLIC_QALAM_ENV: undefined,
      NEXT_PUBLIC_VERCEL_ENV: "development",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: PROD_ID,
      NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: undefined,
    })
    try {
      expect(module.deploymentEnv).toBe("development")
      expect(module.isGaActive).toBe(false)
      expect(module.GA_MEASUREMENT_ID).toBe("")
    } finally { restore() }
  })

  it("stays silent in preview when only the production ID is configured", async () => {
    const { module, restore } = await withEnv({
      NEXT_PUBLIC_VERCEL_ENV: "preview",
      NEXT_PUBLIC_QALAM_ENV: undefined,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: PROD_ID,
      NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: undefined,
    })
    try {
      // A preview build must not silently emit into the production property.
      expect(module.deploymentEnv).toBe("preview")
      expect(module.GA_MEASUREMENT_ID).toBe("")
      expect(module.isGaActive).toBe(false)
    } finally { restore() }
  })

  it("routes preview traffic to the dedicated preview ID when configured", async () => {
    const { module, restore } = await withEnv({
      NEXT_PUBLIC_VERCEL_ENV: "preview",
      NEXT_PUBLIC_QALAM_ENV: undefined,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: PROD_ID,
      NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: PREVIEW_ID,
    })
    try {
      expect(module.deploymentEnv).toBe("preview")
      expect(module.GA_MEASUREMENT_ID).toBe(PREVIEW_ID)
      expect(module.isGaActive).toBe(true)
    } finally { restore() }
  })

  it("routes production traffic to the production ID and never to preview", async () => {
    const { module, restore } = await withEnv({
      NEXT_PUBLIC_VERCEL_ENV: "production",
      NEXT_PUBLIC_QALAM_ENV: undefined,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: PROD_ID,
      NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: PREVIEW_ID,
    })
    try {
      expect(module.deploymentEnv).toBe("production")
      expect(module.GA_MEASUREMENT_ID).toBe(PROD_ID)
      expect(module.isGaActive).toBe(true)
    } finally { restore() }
  })

  it("stays silent in production when the ID is missing or malformed", async () => {
    for (const bad of [undefined, "", "wrong", "g-QALAMPROD01"]) {
      const { module, restore } = await withEnv({
        NEXT_PUBLIC_VERCEL_ENV: "production",
        NEXT_PUBLIC_QALAM_ENV: undefined,
        NEXT_PUBLIC_GA_MEASUREMENT_ID: bad,
        NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: undefined,
      })
      try {
        expect(module.deploymentEnv, `for id=${bad}`).toBe("production")
        expect(module.GA_MEASUREMENT_ID, `for id=${bad}`).toBe("")
        expect(module.isGaActive, `for id=${bad}`).toBe(false)
      } finally { restore() }
    }
  })

  it("flags a preview build that shares the production ID via the environment report", async () => {
    const { module, restore } = await withEnv({
      NEXT_PUBLIC_VERCEL_ENV: "preview",
      NEXT_PUBLIC_QALAM_ENV: undefined,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: PROD_ID,
      NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: PROD_ID,
    })
    try {
      const report = module.gaEnvironmentReport()
      expect(report.deploymentEnv).toBe("preview")
      expect(report.sharesIdAcrossEnvs).toBe(true)
    } finally { restore() }
  })

  it("hashes the inline script only when analytics is actually active", async () => {
    // With no active id, the hash string must be empty so the CSP does not
    // pin a value that was never rendered.
    const { module: quiet, restore: r1 } = await withEnv({
      NEXT_PUBLIC_VERCEL_ENV: "development",
      NEXT_PUBLIC_QALAM_ENV: undefined,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: undefined,
      NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: undefined,
    })
    try {
      expect(await quiet.gaScriptHash()).toBe("")
    } finally { r1() }

    const { module: active, restore: r2 } = await withEnv({
      NEXT_PUBLIC_VERCEL_ENV: "production",
      NEXT_PUBLIC_QALAM_ENV: undefined,
      NEXT_PUBLIC_GA_MEASUREMENT_ID: PROD_ID,
      NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: undefined,
    })
    try {
      const hash = await active.gaScriptHash()
      expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/)
      // CSP consumers require the exact same bytes that GoogleAnalytics.tsx renders.
      const rendered = active.gaInlineScript(active.GA_MEASUREMENT_ID)
      const expected = await (async () => {
        const data = new TextEncoder().encode(rendered)
        const digest = await crypto.subtle.digest("SHA-256", data)
        let binary = ""
        for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
        return btoa(binary)
      })()
      expect(hash).toBe(expected)
    } finally { r2() }
  })

  it("does not report a deploymentEnv value it did not recognize", async () => {
    for (const invalid of ["staging", "qa", "prod", "PRODUCTION_TYPO", ""]) {
      const { module, restore } = await withEnv({
        NEXT_PUBLIC_VERCEL_ENV: invalid,
        NEXT_PUBLIC_QALAM_ENV: undefined,
        NEXT_PUBLIC_GA_MEASUREMENT_ID: PROD_ID,
        NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: PREVIEW_ID,
      })
      try {
        expect(module.deploymentEnv, `for env=${invalid}`).toBe("development")
        expect(module.isGaActive, `for env=${invalid}`).toBe(false)
      } finally { restore() }
    }
  })

  it("lets NEXT_PUBLIC_QALAM_ENV override the Vercel value for off-Vercel hosts", async () => {
    const { module, restore } = await withEnv({
      NEXT_PUBLIC_QALAM_ENV: "production",
      NEXT_PUBLIC_VERCEL_ENV: "development",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: PROD_ID,
      NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID: undefined,
    })
    try {
      expect(module.deploymentEnv).toBe("production")
      expect(module.GA_MEASUREMENT_ID).toBe(PROD_ID)
    } finally { restore() }
  })
})
