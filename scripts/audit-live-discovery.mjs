import { mkdir, writeFile } from "node:fs/promises"

const output = "docs/audits/2026-09-07"
await mkdir(output, { recursive: true })
const urls = ["https://www.byqalam.com/robots.txt", "https://www.byqalam.com/sitemap.xml", "https://app.byqalam.com/login"]
const results = []
for (const url of urls) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
    const body = await response.text()
    results.push({ url, status: response.status, finalUrl: response.url, body: url.endsWith("login") ? undefined : body })
  } catch (error) { results.push({ url, error: error.message }) }
}
const sitemap = results.find((row) => row.url.endsWith("sitemap.xml"))?.body || ""
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
const duplicates = [...new Set(locations.filter((url, index) => locations.indexOf(url) !== index))]
const robotText = results.find((row) => row.url.endsWith("robots.txt"))?.body || ""
const prefixes = [...new Set([...robotText.matchAll(/^Disallow: (.+)$/gm)].map((match) => match[1].trim()))]
const blockedPublicUrls = [...new Set(locations)].filter((url) => prefixes.some((prefix) => new URL(url).pathname.startsWith(prefix)))
await writeFile(`${output}/live-discovery.json`, JSON.stringify({ checkedAt: new Date().toISOString(), results, sitemapEntries: locations.length, duplicates, blockedPublicUrls }, null, 2))
console.log(JSON.stringify({ results: results.map(({ body, ...row }) => row), sitemapEntries: locations.length, duplicates, blockedPublicUrls }, null, 2))
