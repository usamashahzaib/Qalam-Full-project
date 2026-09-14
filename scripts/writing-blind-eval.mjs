import fs from "node:fs"
import path from "node:path"
import { randomInt, createHash } from "node:crypto"
import { pathToFileURL } from "node:url"

export function createBlindPack(cases, flip = () => randomInt(2) === 1) {
  if (!Array.isArray(cases) || !cases.length) throw new Error("Supply at least one held-out comparison.")
  const ids = new Set()
  const key = []
  const review = cases.map((item) => {
    for (const field of ["id", "brief", "facts", "baseline", "candidate"]) {
      if (typeof item[field] !== "string" || !item[field].trim()) throw new Error(`Missing ${field}.`)
    }
    if (ids.has(item.id)) throw new Error("Duplicate case ID.")
    ids.add(item.id)
    const swap = flip()
    const a = swap ? item.candidate : item.baseline
    const b = swap ? item.baseline : item.candidate
    const fingerprint = createHash("sha256").update(JSON.stringify([item.id, item.brief, item.facts, a, b])).digest("hex")
    key.push({ id: item.id, candidate: swap ? "A" : "B", fingerprint })
    return { id: item.id, brief: item.brief, facts: item.facts, A: a, B: b,
      winner: "", reason: "", factualErrorsA: null, factualErrorsB: null,
      voiceScoreA: null, voiceScoreB: null, editMinutesA: null, editMinutesB: null }
  })
  return { key, review }
}

export function scoreBlindPack(reviews, key) {
  if (reviews.length !== key.length || new Set(reviews.map((row) => row.id)).size !== reviews.length) throw new Error("Review set is incomplete or contains duplicate IDs.")
  const summary = { cases: reviews.length, candidateWins: 0, baselineWins: 0, ties: 0, candidateFactualErrors: 0, baselineFactualErrors: 0, candidateVoiceMean: 0, baselineVoiceMean: 0, candidateEditMinutes: 0, baselineEditMinutes: 0 }
  if (!reviews.length) throw new Error("No reviews supplied.")
  for (const row of reviews) {
    const match = key.find((entry) => entry.id === row.id)
    if (!match || !["A", "B", "tie"].includes(row.winner) || !row.reason?.trim()) throw new Error(`Complete the winner and reason for ${row.id}.`)
    const fingerprint = createHash("sha256").update(JSON.stringify([row.id, row.brief, row.facts, row.A, row.B])).digest("hex")
    if (fingerprint !== match.fingerprint) throw new Error(`Comparison text changed for ${row.id}. Start a new pack.`)
    for (const side of ["A", "B"]) {
      if (!Number.isInteger(row[`factualErrors${side}`]) || row[`factualErrors${side}`] < 0) throw new Error(`Count factual errors for ${row.id}.`)
      if (!Number.isFinite(row[`voiceScore${side}`]) || row[`voiceScore${side}`] < 1 || row[`voiceScore${side}`] > 5) throw new Error(`Score voice from 1 to 5 for ${row.id}.`)
      if (!Number.isFinite(row[`editMinutes${side}`]) || row[`editMinutes${side}`] < 0) throw new Error(`Record editing minutes for ${row.id}.`)
    }
    const candidate = match.candidate
    const baseline = candidate === "A" ? "B" : "A"
    if (row.winner === "tie") summary.ties++
    else if (row.winner === candidate) summary.candidateWins++
    else summary.baselineWins++
    summary.candidateFactualErrors += row[`factualErrors${candidate}`]
    summary.baselineFactualErrors += row[`factualErrors${baseline}`]
    summary.candidateVoiceMean += row[`voiceScore${candidate}`] / reviews.length
    summary.baselineVoiceMean += row[`voiceScore${baseline}`] / reviews.length
    summary.candidateEditMinutes += row[`editMinutes${candidate}`]
    summary.baselineEditMinutes += row[`editMinutes${baseline}`]
  }
  return summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command, inputPath, outputOrKey] = process.argv.slice(2)
  const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"))
  if (command === "prepare" && inputPath && outputOrKey) {
    const pack = createBlindPack(read(inputPath))
    fs.mkdirSync(outputOrKey, { recursive: true })
    fs.writeFileSync(path.join(outputOrKey, "answer-key.json"), JSON.stringify(pack.key, null, 2), { flag: "wx" })
    fs.writeFileSync(path.join(outputOrKey, "review.json"), JSON.stringify(pack.review, null, 2), { flag: "wx" })
    console.log("Created review.json and answer-key.json. Give the reviewer only review.json.")
  } else if (command === "score" && inputPath && outputOrKey) {
    console.log(JSON.stringify(scoreBlindPack(read(inputPath), read(outputOrKey)), null, 2))
  } else {
    console.error("Usage: node scripts/writing-blind-eval.mjs prepare cases.json output-directory | score review.json answer-key.json")
    process.exitCode = 1
  }
}
