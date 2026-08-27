import { chromium } from "@playwright/test"

const origin = (process.env.PAGE_WEIGHT_ORIGIN || "http://127.0.0.1:3010").replace(/\/$/, "")
const route = process.argv[2] || "/docs"
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  await page.goto(`${origin}${route}`, { waitUntil: "networkidle" })
  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => ({
    name: entry.name,
    bytes: "transferSize" in entry ? entry.transferSize : 0,
    type: "initiatorType" in entry ? entry.initiatorType : "",
  })))
  const scripts = resources.filter((resource) => resource.type === "script")
  const monitoredChunks = scripts.filter((resource) => /sentry|framer|motion/i.test(resource.name))
  const loadedHeavyLibraries = await page.evaluate(async (urls) => {
    const matches = []
    for (const url of urls) {
      const source = await fetch(url).then((response) => response.text())
      const libraries = []
      if (/@sentry\/core|makeFetchTransport|dsnFromString/i.test(source)) libraries.push("sentry-sdk")
      if (/framer-motion|motion-dom/i.test(source)) libraries.push("framer-motion")
      if (libraries.length > 0) matches.push({ url, libraries })
    }
    return matches
  }, scripts.map((resource) => resource.name))
  console.log(JSON.stringify({
    route,
    scriptBytes: scripts.reduce((sum, resource) => sum + resource.bytes, 0),
    scriptCount: scripts.length,
    monitoredChunks,
    loadedHeavyLibraries,
  }, null, 2))
} finally {
  await browser.close()
}
