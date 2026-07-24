#!/usr/bin/env node
// Fails if any tracked (or staged) text file contains an em dash (—) or en
// dash (–). Qalam's copy and code comments must use a plain hyphen (-) only,
// regardless of which AI tool generated the change.
import { execSync } from "node:child_process"
import fs from "node:fs"

const DASH_RE = /[–—]/

// Lines that legitimately contain the literal em/en dash character on
// purpose (matching/stripping logic, or showing the AI the exact character
// to avoid) rather than as prose punctuation. Keep in sync with any file
// moves.
const ALLOWED = new Set([
  "lib/server/ai-router-v2.ts:33",
  "lib/server/embeddings.ts:9",
  "lib/prompts/role-aware-system.ts:83",
  "lib/prompts/builders/voice.ts:12",
  "lib/prompts/builders/hooks.ts:14",
  "lib/prompts/builders/generate.ts:14",
  "lib/prompts/builders/carousel.ts:13",
  "scripts/check-no-dashes.mjs:2",
  "scripts/check-no-dashes.mjs:3",
  "scripts/check-no-dashes.mjs:8",
  "scripts/check-no-dashes.mjs:59",
])

const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|pdf|zip|lock)$/i

const staged = process.argv.includes("--staged")

const run = (cmd) => execSync(cmd, { encoding: "utf8" }).split("\n").map((l) => l.trim()).filter(Boolean)

const files = staged
  ? run("git diff --cached --name-only --diff-filter=ACM")
  : run("git ls-files")

let violations = []

for (const file of files) {
  if (BINARY_EXT.test(file)) continue
  if (!fs.existsSync(file)) continue
  let content
  try {
    content = fs.readFileSync(file, "utf8")
  } catch {
    continue // unreadable/binary
  }
  const lines = content.split(/\r?\n/)
  lines.forEach((line, idx) => {
    if (!DASH_RE.test(line)) return
    const key = `${file}:${idx + 1}`
    if (ALLOWED.has(key)) return
    violations.push({ file, lineNo: idx + 1, text: line.trim() })
  })
}

if (violations.length > 0) {
  console.error("\nEm dash (—) / en dash (–) found - use a plain hyphen (-) instead:\n")
  for (const v of violations) {
    console.error(`  ${v.file}:${v.lineNo}  ${v.text}`)
  }
  console.error(`\n${violations.length} violation(s). If a match is intentional (e.g. a regex that matches these characters), add "path:line" to ALLOWED in scripts/check-no-dashes.mjs.\n`)
  process.exit(1)
}

console.log("No em/en dashes found.")
