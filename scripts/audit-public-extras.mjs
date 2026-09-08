import { chromium } from "@playwright/test"
import { writeFile } from "node:fs/promises"

const origin = process.env.AUDIT_ORIGIN || "http://localhost:3101"
const output = "docs/audits/2026-09-07/production"
const paths = ["/login", "/signup", "/ai-content-writer", "/ai-linkedin-post-generator", "/downloads/qalam-linkedin-extension.zip", "/extension/connect", "/login?callbackUrl=/career", "/login?callbackUrl=/career/resumes", "/docs", "/offline.html", "/sw.js"]
const results = []
for (const path of paths) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15000) })
  results.push({ path, status: response.status, location: response.headers.get("location"), contentType: response.headers.get("content-type") })
  await response.body?.cancel()
}
const browser = await chromium.launch({ headless: true })
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" })
    await page.goto(origin, { waitUntil: "networkidle" })
    await page.screenshot({ path: `${output}/home-${width}.png` })
    await page.close()
  }
} finally { await browser.close() }
await writeFile(`${output}/extra-routes.json`, JSON.stringify({ checkedAt: new Date().toISOString(), origin, results }, null, 2))
console.log(JSON.stringify(results, null, 2))
