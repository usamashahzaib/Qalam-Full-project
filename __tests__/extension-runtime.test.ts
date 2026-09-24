import { readFileSync, readdirSync } from "node:fs"
import { relative, resolve } from "node:path"
import JSZip from "jszip"
import { describe, expect, it } from "vitest"
import { PUBLIC_API_PREFIXES } from "@/proxy"

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8")

describe("LinkedIn extension runtime", () => {
  it("allows the Bearer-token comment endpoint to reach its own validator", () => {
    expect(PUBLIC_API_PREFIXES).toContain("/api/extension/comments")
  })

  it("clears expired connection codes and reports the active allowance", () => {
    const worker = source("extension/service-worker.js")
    expect(worker).toContain('message.type === "qalam:connection-status"')
    expect(worker).toContain('response.status === 401')
    expect(worker).toContain('chrome.storage.local.remove("qalam_extension_token")')
    expect(worker).toContain('Authorization: `Bearer ${token}`')
  })

  it("ships a loadable package with the matching extension version", () => {
    const manifest = source("extension/manifest.json")
    expect(manifest).toContain('"version": "1.3.0"')
    expect(source("extension/README.md")).toContain("qalam-linkedin-extension")
  })

  it("recognizes current LinkedIn feed card shapes and keeps the task clear", () => {
    const content = source("extension/content-script.js")
    expect(content).toContain('"article"')
    expect(content).toContain('".feed-shared-update-v2"')
    expect(content).toContain('[data-view-name="feed-full-update"]')
    expect(content).toContain("Draft a comment with Qalam")
    expect(content).toContain("You review the text before anything is posted.")
  })

  // This used to compare manifest.json alone, so a content-script or
  // service-worker change shipped a stale zip without anything failing. Every
  // file is compared now, in both directions.
  it("keeps the downloadable package aligned with its extension source", async () => {
    const archive = await JSZip.loadAsync(readFileSync(resolve(process.cwd(), "public/downloads/qalam-linkedin-extension.zip")))
    const sourceFiles = readdirSync(resolve(process.cwd(), "extension"), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => relative(resolve(process.cwd(), "extension"), resolve(entry.parentPath, entry.name)).replaceAll("\\", "/"))
      .sort()
    const packagedFiles = Object.values(archive.files)
      .filter((entry) => !entry.dir)
      .map((entry) => entry.name.replace(/^qalam-linkedin-extension\//, ""))
      .sort()

    expect(sourceFiles.length).toBeGreaterThan(0)
    expect(packagedFiles).toEqual(sourceFiles)

    // Compared as bytes, not text: the package carries PNG icons, and the zip
    // is built from the same bytes so an exact match is the correct assertion.
    for (const file of sourceFiles) {
      const packaged = await archive.file(`qalam-linkedin-extension/${file}`)?.async("base64")
      expect(packaged, `${file} in the zip does not match extension/${file}. Run npm run package:extension.`)
        .toBe(readFileSync(resolve(process.cwd(), "extension", file)).toString("base64"))
    }
  })
})
