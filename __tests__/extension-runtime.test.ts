import { readFileSync } from "node:fs"
import { resolve } from "node:path"
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
    expect(manifest).toContain('"version": "1.1.0"')
    expect(source("extension/README.md")).toContain("qalam-linkedin-extension")
  })
})
