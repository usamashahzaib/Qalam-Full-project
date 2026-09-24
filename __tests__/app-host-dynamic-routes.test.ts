import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { isAppHostPath } from "@/proxy"

// The proxy serves app-host pages under a CSP whose script-src carries only a
// per-request nonce (no 'unsafe-inline'). Next.js can stamp that nonce onto
// its scripts only while rendering the request, so any app-host page that
// ends up statically rendered or cached ships scripts the browser blocks.
// The root layout is deliberately request-free so marketing pages can be
// static, which means each app-host route must opt into dynamic rendering
// itself, through its own page or a layout above it.

const APP_DIR = path.join(process.cwd(), "app")
const FORCE_DYNAMIC = /export const dynamic\s*=\s*["']force-dynamic["']/

const pageFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === "api" ? [] : pageFiles(full)
    return entry.name === "page.tsx" ? [full] : []
  })

const urlFor = (pageFile: string) => {
  const segments = path.relative(APP_DIR, path.dirname(pageFile)).split(path.sep).filter(Boolean)
  const visible = segments
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")) && !segment.startsWith("@"))
    .map((segment) => (segment.startsWith("[") ? "sample" : segment))
  return `/${visible.join("/")}`
}

const isForcedDynamic = (pageFile: string) => {
  if (FORCE_DYNAMIC.test(fs.readFileSync(pageFile, "utf8"))) return true
  for (let dir = path.dirname(pageFile); dir.startsWith(APP_DIR) && dir !== APP_DIR; dir = path.dirname(dir)) {
    const layout = path.join(dir, "layout.tsx")
    if (fs.existsSync(layout) && FORCE_DYNAMIC.test(fs.readFileSync(layout, "utf8"))) return true
  }
  return false
}

describe("app-host routes render per request", () => {
  const appHostPages = pageFiles(APP_DIR).filter((file) => isAppHostPath(urlFor(file)))

  it("covers the app-host routes that live outside the (app) group", () => {
    const urls = appHostPages.map(urlFor)
    for (const url of ["/login", "/signup", "/connect/sample", "/drop/sample", "/proof/sample", "/pitch/sample", "/admin", "/approvals/sample/review", "/write", "/carousel", "/dashboard"]) {
      expect(urls).toContain(url)
    }
  })

  it("forces dynamic rendering for every app-host page", () => {
    const staticEligible = appHostPages
      .filter((file) => !isForcedDynamic(file))
      .map((file) => path.relative(process.cwd(), file).split(path.sep).join("/"))
    expect(staticEligible).toEqual([])
  })

  it("keeps the root layout free of request-time reads so marketing pages stay static", () => {
    const rootLayout = fs.readFileSync(path.join(APP_DIR, "layout.tsx"), "utf8")
    expect(rootLayout).not.toMatch(/from "next\/headers"/)
    expect(rootLayout).not.toMatch(/from "@\/auth"/)
    expect(rootLayout).not.toMatch(FORCE_DYNAMIC)
  })
})
