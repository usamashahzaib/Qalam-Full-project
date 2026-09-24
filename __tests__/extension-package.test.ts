import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// prebuild repackages public/downloads/qalam-linkedin-extension.zip from the
// committed extension/ folder. Any file the manifest references that is
// missing, or ignored by git and so never committed, ships a zip that Chrome
// refuses to load.
const extensionDir = path.join(process.cwd(), "extension")
const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, "manifest.json"), "utf8"))

const referencedFiles = (): string[] => [...new Set<string>([
  ...Object.values<string>(manifest.icons ?? {}),
  ...Object.values<string>(manifest.action?.default_icon ?? {}),
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  ...(manifest.content_scripts ?? []).flatMap((script: { js?: string[]; css?: string[] }) => [...(script.js ?? []), ...(script.css ?? [])]),
].filter(Boolean))]

const isGitIgnored = (relativePath: string): boolean => {
  try {
    execFileSync("git", ["check-ignore", "-q", relativePath], { cwd: process.cwd(), stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

describe("browser extension package", () => {
  it("references files that exist", () => {
    const missing = referencedFiles().filter((file) => !fs.existsSync(path.join(extensionDir, file)))
    expect(missing).toEqual([])
  })

  it("never references a file git would leave out of the commit", () => {
    const ignored = referencedFiles().filter((file) => isGitIgnored(`extension/${file}`))
    expect(ignored).toEqual([])
  })
})
