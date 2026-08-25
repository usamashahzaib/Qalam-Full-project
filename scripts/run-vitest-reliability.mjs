import { randomInt } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const requestedRuns = Number.parseInt(process.env.RELIABILITY_RUNS || "10", 10)
const runs = Number.isFinite(requestedRuns) && requestedRuns > 0 ? requestedRuns : 10
const runId = new Date().toISOString().replace(/[:.]/g, "-")
const outputDir = resolve(".gstack", "qa-reports", `vitest-reliability-${runId}`)
const vitestEntry = resolve("node_modules", "vitest", "vitest.mjs")
mkdirSync(outputDir, { recursive: true })

const results = []
for (let index = 1; index <= runs; index += 1) {
  const seed = randomInt(1, 2_147_483_647)
  const jsonPath = join(outputDir, `run-${index}-seed-${seed}.json`)
  const logPath = join(outputDir, `run-${index}-seed-${seed}.log`)
  console.log(`reliability: run ${index}/${runs}, seed ${seed}`)

  const result = spawnSync(process.execPath, [
    vitestEntry,
    "run",
    "--sequence.shuffle",
    "--sequence.seed",
    String(seed),
    "--reporter=default",
    "--reporter=json",
    `--outputFile.json=${jsonPath}`,
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
  })

  const log = [result.stdout || "", result.stderr || ""].filter(Boolean).join("\n")
  writeFileSync(logPath, log, "utf8")
  const status = result.status ?? 1
  results.push({ index, seed, status, jsonPath, logPath, signal: result.signal })
  console.log(`reliability: run ${index}/${runs} ${status === 0 ? "passed" : "failed"}`)
}

const failures = results.filter((result) => result.status !== 0)
const summaryPath = join(outputDir, "summary.json")
writeFileSync(summaryPath, `${JSON.stringify({ runs, failures: failures.length, results }, null, 2)}\n`, "utf8")
console.log(`reliability: ${runs - failures.length}/${runs} passed; report ${summaryPath}`)
if (failures.length > 0) process.exit(1)
