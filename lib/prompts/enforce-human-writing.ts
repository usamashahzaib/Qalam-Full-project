// lib/prompts/enforce-human-writing.ts
// Runs detectAiPatterns() on model output and repairs what it finds.
// The model call is injected so this stays pure and testable, and so the AI
// router can use it without a circular import.

import { detectAiPatterns, proseLeaves, setAtPath, type AiPatternOptions } from "./ai-patterns";
import { repairBrief } from "./output-checks";
import { buildJsonPatternRepairPrompt, buildPatternRepairPrompt } from "./builders/pattern-repair";

export type RepairCall = (system: string, user: string, json: boolean) => Promise<string>;

export interface EnforceOptions extends AiPatternOptions {
  json: boolean;
  repair: RepairCall;
  maxAttempts?: number;
  parseJson: (raw: string) => unknown;
}

export interface EnforceResult {
  content: string;
  repaired: boolean;
  remaining: string[];
}

const codesOf = (text: string, options: AiPatternOptions) => detectAiPatterns(text, options).map((d) => d.code);

// A repair that drops half the text or balloons it is a rewrite, not an edit.
const sameShape = (before: string, after: string) => after.length >= before.length * 0.6 && after.length <= before.length * 1.4 + 40;

async function enforceText(text: string, options: EnforceOptions): Promise<EnforceResult> {
  let current = text;
  let defects = detectAiPatterns(current, options);
  let repaired = false;
  for (let attempt = 0; attempt < (options.maxAttempts ?? 2) && defects.length; attempt += 1) {
    const { system, user } = buildPatternRepairPrompt(current, repairBrief(defects));
    let candidate = "";
    try {
      candidate = (await options.repair(system, user, false)).trim();
    } catch {
      break;
    }
    const candidateDefects = detectAiPatterns(candidate, options);
    if (!candidate || !sameShape(current, candidate) || candidateDefects.length >= defects.length) continue;
    current = candidate;
    defects = candidateDefects;
    repaired = true;
  }
  return { content: current, repaired, remaining: defects.map((d) => d.code) };
}

async function enforceJson(raw: string, options: EnforceOptions): Promise<EnforceResult> {
  const root = options.parseJson(raw);
  if (!root || typeof root !== "object") return { content: raw, repaired: false, remaining: [] };

  let repaired = false;
  for (let attempt = 0; attempt < (options.maxAttempts ?? 2); attempt += 1) {
    const flagged = proseLeaves(root)
      .map((leaf) => ({ ...leaf, defects: detectAiPatterns(leaf.text, options) }))
      .filter((leaf) => leaf.defects.length);
    if (!flagged.length) break;

    const fields = Object.fromEntries(flagged.map((leaf) => [leaf.path, leaf.text]));
    const briefs = Object.fromEntries(flagged.map((leaf) => [leaf.path, repairBrief(leaf.defects)]));
    const { system, user } = buildJsonPatternRepairPrompt(fields, briefs);

    let edits: Record<string, unknown> | null = null;
    try {
      edits = options.parseJson(await options.repair(system, user, true)) as Record<string, unknown> | null;
    } catch {
      break;
    }
    if (!edits || typeof edits !== "object") continue;

    // Only flagged fields are replaced, and only when the edit is cleaner.
    // Numbers, keys and every unflagged string stay byte-identical.
    for (const leaf of flagged) {
      const next = edits[leaf.path];
      if (typeof next !== "string" || !next.trim() || !sameShape(leaf.text, next)) continue;
      if (codesOf(next, options).length >= leaf.defects.length) continue;
      setAtPath(root, leaf.path, next.trim());
      repaired = true;
    }
  }

  const remaining = proseLeaves(root).flatMap((leaf) => codesOf(leaf.text, options));
  return { content: repaired ? JSON.stringify(root) : raw, repaired, remaining };
}

export function enforceHumanWriting(content: string, options: EnforceOptions): Promise<EnforceResult> {
  return options.json ? enforceJson(content, options) : enforceText(content, options);
}
