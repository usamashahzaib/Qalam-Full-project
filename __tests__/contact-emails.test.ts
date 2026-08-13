import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import { join, resolve } from "path"

/*
  Only two byqalam.com mailboxes exist: info@ (support) and business@ (sales and
  upgrades). Anything else printed on the site is an address nobody can read, so
  this guard fails the build if a third one appears.
*/
const ALLOWED = new Set(["info@byqalam.com", "business@byqalam.com"])

const ROOT = resolve(__dirname, "..")
const SCAN_DIRS = ["app", "components", "lib"]
const EXTS = [".ts", ".tsx", ".mdx", ".md"]

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (EXTS.some((e) => entry.endsWith(e))) out.push(full)
  }
  return out
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))

describe("byqalam.com contact addresses", () => {
  it("scans a meaningful number of source files", () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it("never references a byqalam.com address other than info@ or business@", () => {
    const offenders: string[] = []

    for (const file of files) {
      const src = readFileSync(file, "utf-8")
      for (const match of src.matchAll(/[a-zA-Z0-9._%+-]+@byqalam\.com/g)) {
        if (!ALLOWED.has(match[0].toLowerCase())) {
          offenders.push(`${file.slice(ROOT.length + 1)}: ${match[0]}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it("routes public contact copy through the lib/contact constants, not literals", () => {
    // Pages may still name the address in prose, but a bare mailto: literal means
    // the value cannot be repointed via env and will drift.
    const offenders: string[] = []

    for (const file of files) {
      if (file.includes(join("lib", "contact.ts"))) continue
      const src = readFileSync(file, "utf-8")
      for (const match of src.matchAll(/mailto:([a-zA-Z0-9._%+-]+@byqalam\.com)/g)) {
        offenders.push(`${file.slice(ROOT.length + 1)}: mailto:${match[1]}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
