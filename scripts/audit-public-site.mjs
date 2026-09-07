import { chromium } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"

const origin = process.env.AUDIT_ORIGIN || "https://www.byqalam.com"
const output = process.env.AUDIT_OUTPUT || "docs/audits/2026-09-07"
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })
const sitemapResponse = await context.request.get(`${origin}/sitemap.xml`)
const sitemap = await sitemapResponse.text()
const robots = await (await context.request.get(`${origin}/robots.txt`)).text()
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
const duplicates = [...new Set(locations.filter((url, index) => locations.indexOf(url) !== index))]
const paths = [...new Set(locations.map((url) => new URL(url).pathname))]
const rows = []
for (const path of paths) {
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  try {
    const response = await page.goto(`${origin}${path}`, { waitUntil: "load", timeout: 45000 })
    const data = await page.evaluate(() => {
      const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || null
      const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden"
      return {
        title: document.title,
        description: meta("description"),
        robots: meta("robots"),
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        h1: [...document.querySelectorAll("h1")].map((el) => el.textContent.trim()),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        brokenImages: [...document.images].filter((el) => el.complete && !el.naturalWidth).map((el) => el.getAttribute("src")),
        unnamedButtons: [...document.querySelectorAll("button")].filter(visible).filter((el) => !el.textContent.trim() && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.title).map((el) => el.outerHTML.slice(0, 220)),
        links: [...new Set([...document.querySelectorAll("a[href]")].map((el) => el.getAttribute("href")))],
        schemaErrors: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((el) => { try { JSON.parse(el.textContent); return [] } catch (error) { return [error.message] } }),
      }
    })
    rows.push({ path, status: response?.status(), finalUrl: page.url(), ...data, errors })
    if (["/", "/pricing", "/free-tools", "/career-visibility"].includes(path)) {
      await page.screenshot({ path: `${output}/mobile-${path === "/" ? "home" : path.slice(1)}.png`, fullPage: true })
    }
    console.log(JSON.stringify({ path, status: response?.status(), overflow: data.overflow, errors: errors.length }))
  } catch (error) { rows.push({ path, error: error.message }) }
  await page.close()
  await writeFile(`${output}/public-crawl.json`, JSON.stringify({ origin, checkedAt: new Date().toISOString(), sitemapEntries: locations.length, duplicates, robots, rows }, null, 2))
}
await browser.close()
console.log(JSON.stringify({ pages: rows.length, duplicates: duplicates.length, output }))
