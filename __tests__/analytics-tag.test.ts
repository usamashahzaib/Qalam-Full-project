import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import { join, resolve } from "path"

/*
  An analytics ID must never be hardcoded. A baked-in fallback means an unset or
  misspelled env var silently reports this site's traffic into whatever property
  was compiled into the bundle - including someone else's.
*/
const ROOT = resolve(__dirname, "..")
const SCAN_DIRS = ["app", "components", "lib"]

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))

// Real GA4 / GTM / Universal / Ads identifiers. Deliberately anchored so the
// validation regex inside GoogleAnalytics.tsx (a character class, not an ID)
// does not trip it.
const TRACKING_ID = /["'`](G-[A-Z0-9]{6,}|GTM-[A-Z0-9]{5,}|UA-\d{4,}-\d+|AW-\d{9,})["'`]/g

describe("analytics tags", () => {
  it("scans a meaningful number of source files", () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it("has no hardcoded tracking ID anywhere in the source", () => {
    const offenders: string[] = []

    for (const file of files) {
      const src = readFileSync(file, "utf-8")
      for (const match of src.matchAll(TRACKING_ID)) {
        offenders.push(`${file.slice(ROOT.length + 1)}: ${match[1]}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it("reads the measurement ID from the environment with no fallback value", () => {
    const src = readFileSync(join(ROOT, "lib", "csp-inline-scripts.ts"), "utf-8")

    expect(src).toContain('process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || ""')
    expect(src).toContain('process.env.NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID')
    // Environment tier decides which ID applies. Neither fires without a valid ID.
    expect(src).toContain('deploymentEnv === "production"')
    expect(src).toContain('deploymentEnv === "preview"')
    expect(src).toContain("isValidGaMeasurementId")
  })

  it("ships no real measurement ID in .env.example", () => {
    const src = readFileSync(join(ROOT, ".env.example"), "utf-8")
    const line = src
      .split("\n")
      .map((l) => l.trimEnd()) // repo checks out CRLF on Windows
      .find((l) => l.startsWith("NEXT_PUBLIC_GA_MEASUREMENT_ID="))

    expect(line).toBeDefined()
    expect(line).toBe("NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX")
  })

  it("loads gtag only from googletagmanager.com", () => {
    const src = readFileSync(join(ROOT, "components", "GoogleAnalytics.tsx"), "utf-8")
    const scriptSrcs = [...src.matchAll(/https?:\/\/[a-zA-Z0-9.*-]+/g)].map((m) => m[0])

    expect(scriptSrcs).toEqual(["https://www.googletagmanager.com"])
  })
})
