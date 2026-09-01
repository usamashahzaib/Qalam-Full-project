import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import JSZip from "jszip"
import { describe, expect, it } from "vitest"
import { PUBLIC_API_PREFIXES } from "@/proxy"

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8")
const normalizeNewlines = (value: string | undefined) => value?.replace(/\r\n/g, "\n")

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
    expect(manifest).toContain('"version": "1.2.0"')
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

  it("keeps the downloadable package aligned with its extension source", async () => {
    const archive = await JSZip.loadAsync(readFileSync(resolve(process.cwd(), "public/downloads/qalam-linkedin-extension.zip")))
    const packagedManifest = await archive.file("qalam-linkedin-extension/manifest.json")?.async("string")
    expect(normalizeNewlines(packagedManifest)).toBe(normalizeNewlines(source("extension/manifest.json")))
  })
})
