// Live evaluation: generate real output for every case, old prompt and new
// prompt, and write a blinded rating sheet.
//
// Requires provider credentials and spends money. It is skipped unless
// QALAM_EVAL_LIVE=1 and at least one provider key is set, so it never runs in
// CI or in the default test suite by accident.
//
//   QALAM_EVAL_LIVE=1 GROQ_API_KEY=... npm run eval:live
//
// Outputs into scripts/eval/output/:
//   metrics.json   per-case proxy measurements, both arms, machine readable
//   summary.md     aggregates, with the arms labelled
//   blinded.md     each case's two outputs as arm A and arm B in a shuffled
//                  order, with no indication of which is which. Rate this file
//                  before looking at anything else. The key is in blinded-key.json.
//
// The proxy metrics cannot establish that the writing is better. Only the
// blinded ratings can, and those require a person. Do not report a result from
// this harness without them.

import { describe, expect, it, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { COMMENT_CASES, POST_CASES } from "./cases";
import { buildCommentPrompt } from "@/lib/prompts/builders/comment";
import { buildGeneratePrompt } from "@/lib/prompts/role-aware-system";
import { baselineCommentPrompt } from "./baseline-prompts";
import { gradeRelevance, gradeGrounding, gradeVoice, gradePhrasing, gradeVariation } from "./graders";

const OUT_DIR = path.join(process.cwd(), "scripts", "eval", "output");
const REPEATS = Number(process.env.QALAM_EVAL_REPEATS || 3);

const LIVE =
  process.env.QALAM_EVAL_LIVE === "1" &&
  Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.MISTRAL_API_KEY);

// A single direct provider call. The production router is deliberately not used
// here: it carries caching, circuit breakers, billing and rate limits that
// would distort an evaluation.
async function complete(system: string, user: string, json: boolean): Promise<string> {
  if (process.env.GROQ_API_KEY) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: process.env.QALAM_EVAL_MODEL || "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.8,
        max_tokens: 900,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = await res.json();
    return body.choices?.[0]?.message?.content ?? "";
  }
  throw new Error("No supported provider key set. This harness supports GROQ_API_KEY.");
}

const parseComments = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());
    const list = Array.isArray(parsed) ? parsed : parsed.comments;
    return Array.isArray(list) ? list.map((c: { text?: string }) => String(c?.text ?? "")).filter(Boolean) : [];
  } catch {
    return [];
  }
};

interface ArmResult {
  arm: "baseline" | "current";
  caseId: string;
  runs: string[][];
}

const results: ArmResult[] = [];

describe.skipIf(!LIVE)("live generation", () => {
  beforeAll(() => fs.mkdirSync(OUT_DIR, { recursive: true }));

  it("generates every comment case under both prompts", { timeout: 30 * 60 * 1000 }, async () => {
    for (const testCase of COMMENT_CASES) {
      const current: string[][] = [];
      const baseline: string[][] = [];

      for (let run = 0; run < REPEATS; run += 1) {
        const now = buildCommentPrompt({
          postText: testCase.postText,
          style: testCase.style,
          profileLabel: testCase.profileLabel,
          voiceProfile: testCase.voiceProfile,
          variants: 3,
        });
        const before = baselineCommentPrompt({
          postText: testCase.postText,
          style: testCase.style,
          profile: testCase.profileLabel ?? "Other",
          voiceProfile: testCase.voiceProfile,
        });

        current.push(parseComments(await complete(now.system, now.user, true)));
        baseline.push(parseComments(await complete(before.system, before.user, true)));
      }

      results.push({ arm: "current", caseId: testCase.id, runs: current });
      results.push({ arm: "baseline", caseId: testCase.id, runs: baseline });
    }
    expect(results.length).toBe(COMMENT_CASES.length * 2);
  });

  it("generates every post case under the current prompt", { timeout: 30 * 60 * 1000 }, async () => {
    for (const testCase of POST_CASES) {
      const runs: string[][] = [];
      for (let run = 0; run < REPEATS; run += 1) {
        const { system, user } = buildGeneratePrompt(
          testCase.role,
          testCase.topic,
          testCase.format,
          testCase.goal,
          testCase.voiceProfile
        );
        runs.push([await complete(system, user, false)]);
      }
      results.push({ arm: "current", caseId: testCase.id, runs });
    }
  });

  it("writes metrics, a blinded rating sheet, and a summary", () => {
    const byCase = new Map<string, { current?: ArmResult; baseline?: ArmResult }>();
    for (const result of results) {
      const entry = byCase.get(result.caseId) ?? {};
      entry[result.arm] = result;
      byCase.set(result.caseId, entry);
    }

    const allCases = [...COMMENT_CASES, ...POST_CASES];
    const metrics = [...byCase.entries()].map(([caseId, arms]) => {
      const testCase = allCases.find((c) => c.id === caseId)!;
      const sourceText = testCase.kind === "comment" ? testCase.postText : testCase.topic;
      const samples = testCase.voiceProfile?.examples ?? [];
      const vocabulary = testCase.voiceProfile?.vocabulary ?? [];

      const measure = (result?: ArmResult) => {
        if (!result) return null;
        const flat = result.runs.flat();
        if (!flat.length) return { empty: true };
        return {
          outputs: flat.length,
          relevance: flat.map((o) => gradeRelevance(o, testCase.sourceAnchors, "tailAnchors" in testCase ? testCase.tailAnchors ?? [] : [], sourceText)),
          grounding: flat.map((o) => gradeGrounding(o, testCase.forbiddenClaims ?? [], sourceText)),
          voice: flat.map((o) => gradeVoice(o, samples, vocabulary)),
          phrasing: flat.map((o) => gradePhrasing(o)),
          // Variation is measured within a run (are the three variants
          // different) and across runs (does the same template recur).
          variationWithinRun: result.runs.map((run) => gradeVariation(run)),
          variationAcrossRuns: gradeVariation(result.runs.map((run) => run[0] ?? "")),
        };
      };

      return { caseId, probe: testCase.probe, current: measure(arms.current), baseline: measure(arms.baseline) };
    });

    fs.writeFileSync(path.join(OUT_DIR, "metrics.json"), JSON.stringify(metrics, null, 2), "utf8");

    // Blinded sheet. Arm order is randomised per case and the key is written
    // separately, so whoever rates it cannot see which prompt produced what.
    const key: Record<string, { A: string; B: string }> = {};
    const blinded: string[] = [
      "# Blinded rating sheet",
      "",
      "For each case, read both arms and rate each one separately on:",
      "",
      "1. Source relevance: does it engage with something the post actually said?",
      "2. Factual grounding: does it claim anything it was not given?",
      "3. Voice fidelity: does it read like the author's samples, where samples exist?",
      "4. Natural phrasing: would a person write this sentence?",
      "5. Variation: are the three options different thoughts or one thought reworded?",
      "",
      "Rate 1 to 5 per dimension. Do not average them. Do not open blinded-key.json first.",
      "",
    ];

    for (const [caseId, arms] of byCase) {
      const testCase = allCases.find((c) => c.id === caseId)!;
      if (!arms.baseline) continue; // post cases have no baseline arm
      const flip = Math.random() < 0.5;
      key[caseId] = flip
        ? { A: "baseline", B: "current" }
        : { A: "current", B: "baseline" };

      const armA = flip ? arms.baseline : arms.current;
      const armB = flip ? arms.current : arms.baseline;

      blinded.push(
        `## ${caseId}`,
        "",
        `Probe: ${testCase.probe}`,
        "",
        "### Arm A",
        "",
        ...(armA?.runs[0] ?? []).map((text, i) => `${i + 1}. ${text}`),
        "",
        "### Arm B",
        "",
        ...(armB?.runs[0] ?? []).map((text, i) => `${i + 1}. ${text}`),
        ""
      );
    }

    fs.writeFileSync(path.join(OUT_DIR, "blinded.md"), blinded.join("\n"), "utf8");
    fs.writeFileSync(path.join(OUT_DIR, "blinded-key.json"), JSON.stringify(key, null, 2), "utf8");

    const summarise = (arm: "current" | "baseline") => {
      const entries = metrics.map((m) => m[arm]).filter((m): m is NonNullable<typeof m> => Boolean(m) && !("empty" in m!));
      if (!entries.length) return "no data";
      const flat = <T,>(pick: (e: (typeof entries)[number]) => T[]) => entries.flatMap(pick);
      const anchorRates = flat((e) => (e as never as { relevance: Array<{ anchorHitRate: number }> }).relevance.map((r) => r.anchorHitRate));
      const forbidden = flat((e) => (e as never as { grounding: Array<{ forbiddenHits: string[] }> }).grounding.map((g) => g.forbiddenHits.length));
      const claimFlags = flat((e) => (e as never as { grounding: Array<{ flags: unknown[] }> }).grounding.map((g) => g.flags.length));
      const observations = flat((e) => (e as never as { phrasing: Array<{ observations: unknown[] }> }).phrasing.map((p) => p.observations.length));
      const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
      return [
        `outputs: ${anchorRates.length}`,
        `mean source-anchor hit rate: ${mean(anchorRates).toFixed(2)}`,
        `outputs containing a case-forbidden claim: ${forbidden.filter(Boolean).length}`,
        `outputs with a claim-shaped line needing review: ${claimFlags.filter(Boolean).length}`,
        `outputs with a stock-phrasing observation: ${observations.filter(Boolean).length}`,
      ].join("\n  ");
    };

    fs.writeFileSync(
      path.join(OUT_DIR, "summary.md"),
      [
        "# Live evaluation summary",
        "",
        `Repeats per case: ${REPEATS}`,
        `Model: ${process.env.QALAM_EVAL_MODEL || "openai/gpt-oss-20b"}`,
        "",
        "These are proxy measurements. They can show a regression. They cannot show",
        "that the writing is good. The blinded ratings in blinded.md are the result.",
        "",
        "## current",
        `  ${summarise("current")}`,
        "",
        "## baseline (the prompt before this change)",
        `  ${summarise("baseline")}`,
        "",
      ].join("\n"),
      "utf8"
    );

    expect(fs.existsSync(path.join(OUT_DIR, "blinded.md"))).toBe(true);
  });
});

describe.skipIf(LIVE)("live generation is not configured", () => {
  it("says so plainly instead of pretending it ran", () => {
    expect(LIVE).toBe(false);
    // Deliberately not a skipped-silently no-op. If someone reads a report from
    // this harness, they should be able to tell whether a model was called.
  });
});
