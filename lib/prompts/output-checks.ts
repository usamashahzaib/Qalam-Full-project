// lib/prompts/output-checks.ts
// Deterministic validation of generated text.
//
// The dividing line this module enforces: code checks facts about the string
// (is it empty, is it the right length, is it a duplicate, does it contain a
// character we forbid). Code does NOT judge whether writing is good. The old
// hasAiSlop() flagged any output containing "leverage" or "foster" regardless
// of context, which is both wrong ("we leverage the existing index") and
// useless as a repair signal. Judgment about phrasing, forced profundity and
// voice mismatch lives in the task prompts instead.
//
// Every defect carries a repair instruction so a revision pass can be told
// exactly what to fix rather than being asked to rewrite the whole thing.

export interface Defect {
  code: string;
  detail: string;
  /** Instruction handed to a revision pass. Fix this, change nothing else. */
  repair: string;
}

export const LONG_DASH_RE = /[\u2013\u2014]/;

// Structural leftovers from the model narrating its own output. These are
// artefacts, not style choices, so they are safe to check mechanically.
// "Here is your post:", "Sure, here's the rewrite:". Requires the "here is"
// stem and a trailing colon so an ordinary line ending in a colon is safe.
const PREAMBLE_RE = /^[ \t]*(?:(?:sure|certainly|of course|absolutely|got it)[,!:]?[ \t]*)?(?:here(?:'|’)?s|here is)[^\n]{0,80}:[ \t]*$/im;
const MARKDOWN_HEADING_RE = /^\s*#{1,6}\s+\S/m;
const CODE_FENCE_RE = /```/;
const SECTION_LABEL_RE = /^\s*(?:hook|body|cta|call to action|hashtags|introduction|conclusion|post)\s*:\s*$/im;

const normalizeForComparison = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** Jaccard overlap of word sets. Cheap, stable, and good enough to catch synonym swaps. */
export function similarity(a: string, b: string): number {
  const wordsA = new Set(normalizeForComparison(a).split(" ").filter(Boolean));
  const wordsB = new Set(normalizeForComparison(b).split(" ").filter(Boolean));
  if (!wordsA.size || !wordsB.size) return 0;
  let shared = 0;
  for (const word of wordsA) if (wordsB.has(word)) shared += 1;
  return shared / (wordsA.size + wordsB.size - shared);
}

export interface TextCheckOptions {
  minChars?: number;
  maxChars?: number;
  /** Reject markdown headings, code fences and "Hook:" style labels. */
  allowStructureMarkers?: boolean;
}

/** Objective checks on a single piece of generated text. */
export function checkText(text: string, options: TextCheckOptions = {}): Defect[] {
  const { minChars = 1, maxChars, allowStructureMarkers = false } = options;
  const defects: Defect[] = [];
  const trimmed = text.trim();

  if (!trimmed) {
    return [{ code: "empty", detail: "Model returned nothing usable.", repair: "Produce the requested output." }];
  }
  if (trimmed.length < minChars) {
    defects.push({
      code: "too_short",
      detail: `${trimmed.length} characters, minimum ${minChars}.`,
      repair: `Say enough to make the point. Minimum ${minChars} characters.`,
    });
  }
  if (maxChars && trimmed.length > maxChars) {
    defects.push({
      code: "too_long",
      detail: `${trimmed.length} characters, maximum ${maxChars}.`,
      repair: `Cut it to ${maxChars} characters or fewer by removing the least useful sentences. Do not compress by deleting specifics.`,
    });
  }
  if (LONG_DASH_RE.test(trimmed)) {
    defects.push({
      code: "long_dash",
      detail: "Contains an em dash or en dash.",
      repair: "Replace every long dash with a plain hyphen or split the sentence in two.",
    });
  }
  if (!allowStructureMarkers) {
    if (MARKDOWN_HEADING_RE.test(trimmed)) {
      defects.push({ code: "markdown_heading", detail: "Contains a markdown heading.", repair: "Remove markdown headings. Plain text only." });
    }
    if (CODE_FENCE_RE.test(trimmed)) {
      defects.push({ code: "code_fence", detail: "Contains a code fence.", repair: "Remove the code fences and return plain text." });
    }
    if (SECTION_LABEL_RE.test(trimmed)) {
      defects.push({ code: "section_label", detail: "Contains a section label line.", repair: 'Remove label lines such as "Hook:" or "CTA:". The text should read as one piece.' });
    }
  }
  if (PREAMBLE_RE.test(trimmed)) {
    defects.push({ code: "preamble", detail: "Starts with a narrating preamble.", repair: "Delete the introductory line and start with the content itself." });
  }
  return defects;
}

export interface VariantCheckOptions extends TextCheckOptions {
  expectedCount?: number;
  /** Above this Jaccard overlap two variants count as the same thought reworded. */
  similarityThreshold?: number;
}

export interface VariantCheckResult {
  defects: Defect[];
  /** Indexes that duplicate an earlier variant. Callers usually drop these. */
  duplicateIndexes: number[];
}

/**
 * Checks a set of variants. The point of a variant set is that each one is a
 * different thought. Two comments that differ only by synonym are one comment.
 */
export function checkVariants(texts: string[], options: VariantCheckOptions = {}): VariantCheckResult {
  const { expectedCount, similarityThreshold = 0.6, ...textOptions } = options;
  const defects: Defect[] = [];
  const duplicateIndexes: number[] = [];

  texts.forEach((text, index) => {
    for (const defect of checkText(text, textOptions)) {
      defects.push({ ...defect, detail: `Variant ${index + 1}: ${defect.detail}` });
    }
  });

  for (let i = 1; i < texts.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (duplicateIndexes.includes(j)) continue;
      if (similarity(texts[i], texts[j]) >= similarityThreshold) {
        duplicateIndexes.push(i);
        defects.push({
          code: "duplicate_variant",
          detail: `Variant ${i + 1} says the same thing as variant ${j + 1}.`,
          repair: `Replace variant ${i + 1} with a genuinely different thought about the source, not a reworded version of variant ${j + 1}.`,
        });
        break;
      }
    }
  }

  if (typeof expectedCount === "number" && texts.length !== expectedCount) {
    defects.push({
      code: "wrong_count",
      detail: `Returned ${texts.length} items, expected ${expectedCount}.`,
      repair: `Return exactly ${expectedCount} items.`,
    });
  }

  return { defects, duplicateIndexes };
}

/** One line per defect, ready to paste into a revision prompt. */
export function repairBrief(defects: Defect[]): string {
  return defects.map((d) => `- ${d.detail} ${d.repair}`).join("\n");
}
