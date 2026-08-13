import { chromium } from "playwright"
import { mkdir } from "node:fs/promises"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"
import sharp from "sharp"

const root = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(root, "exports")
await mkdir(out, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 2300, height: 1600 }, deviceScaleFactor: 1 })
await page.goto(pathToFileURL(path.join(root, "posters.html")).href)
await page.evaluate(() => document.fonts.ready)

const ids = ["founder-01", "founder-02", "founder-03", "qalam-01", "qalam-02", "qalam-03"]

for (const id of ids) {
  await page.locator(`#${id}`).screenshot({ path: path.join(out, `${id}.png`) })
}

await browser.close()

const tiles = await Promise.all(ids.map(async (id, index) => ({
  input: await sharp(path.join(out, `${id}.png`)).resize(324, 405).png().toBuffer(),
  left: 24 + (index % 3) * 348,
  top: 24 + Math.floor(index / 3) * 429,
})))

await sharp({
  create: { width: 1092, height: 882, channels: 3, background: "#bbb7ae" },
}).composite(tiles).png().toFile(path.join(root, "campaign-contact-sheet.png"))
