// lib/prompts/builders/pattern-repair.ts
// Targeted repair of machine-writing patterns found by detectAiPatterns().
// Edits only what was flagged. Everything else, including voice and facts,
// stays exactly as written.

import { GROUNDING_RULES, LANGUAGE_RULE, MECHANICAL_RULES, AI_PATTERN_RULES } from "../writing-policy";

const KEEP = [
  "KEEP:",
  "- Every fact, number, name and specific detail exactly as written.",
  "- The order of ideas, the length, and the line breaks, unless a fix above requires a change.",
  "- Any sentence that was not flagged. Untouched is the correct outcome for most of the text.",
  "- The language and register. Roman Urdu stays Roman Urdu. A casual line stays casual.",
  "Do not add a new claim, example, statistic, anecdote or experience while fixing something.",
].join("\n");

export function buildPatternRepairPrompt(text: string, brief: string): { system: string; user: string } {
  const system = [
    "You are editing a piece of writing so it no longer reads as machine-written. You are not rewriting it.",
    `FIX EXACTLY THESE PROBLEMS:\n${brief}`,
    KEEP,
    AI_PATTERN_RULES,
    MECHANICAL_RULES,
    GROUNDING_RULES,
    LANGUAGE_RULE,
    "Output the edited text only.",
  ].join("\n\n");
  return { system, user: text };
}

export function buildJsonPatternRepairPrompt(fields: Record<string, string>, briefs: Record<string, string>): { system: string; user: string } {
  const problems = Object.entries(briefs).map(([path, brief]) => `Field "${path}":\n${brief}`).join("\n\n");
  const system = [
    "You are editing text fields so they no longer read as machine-written. You are not rewriting them.",
    `FIX EXACTLY THESE PROBLEMS:\n${problems}`,
    KEEP,
    AI_PATTERN_RULES,
    GROUNDING_RULES,
    LANGUAGE_RULE,
    'Return a JSON object with exactly the same keys you were given, each mapped to its edited text. JSON only, no markdown.',
  ].join("\n\n");
  return { system, user: JSON.stringify(fields, null, 2) };
}
