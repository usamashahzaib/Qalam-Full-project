import { mkdir } from "node:fs/promises"
import path from "node:path"
import { chromium } from "@playwright/test"

const origin = (process.env.SCREENSHOT_ORIGIN || "http://127.0.0.1:3000").replace(/\/$/, "")
const outputDir = path.join(process.cwd(), "public", "product")

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 })
page.on("pageerror", (error) => console.error("page error:", error.message))
page.on("console", (message) => {
  if (message.type() === "error") console.error("browser error:", message.text())
})

try {
  await page.goto(`${origin}/demo`, { waitUntil: "networkidle" })
  await page.getByLabel("Draft").waitFor()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(outputDir, "qalam-writer-demo.png"), fullPage: false })

  await page.goto(`${origin}/demo?tab=voice`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outputDir, "qalam-voice-demo.png"), fullPage: false })

  await page.goto(`${origin}/demo?tab=archive`, { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outputDir, "qalam-archive-demo.png"), fullPage: false })
} finally {
  await browser.close()
}
