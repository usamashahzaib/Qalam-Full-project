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
  /** The offending phrases, when a defect groups several. */
  items?: string[];
}

/** How much is wrong, counting each flagged phrase, so a partial repair still counts as progress. */
export const defectWeight = (defects: Defect[]) =>
  defects.reduce((sum, d) => sum + (d.items?.length || 1), 0);

const LONG_DASH_RE = /[\u2013\u2014]/;

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

// ---------------------------------------------------------------------------
// GROUNDING
// Whether a number, a cited study or a first-person event appears in what the
// author supplied is a fact about the strings, so it is checked here. The
// prompts already forbid inventing these and gpt-oss invents them anyway ("each
// scan added a 30-second delay", "Hiring costs 150% of an annual salary",
// "We had to let someone go"), so the prompt cannot be the only guard.
// ---------------------------------------------------------------------------

// A figure worth checking: money, a percentage, a multiplier, or any number above ten.
// "3 things" and list markers are not claims.
const FIGURE_RE = /(?:[$£€]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|bn|million|billion))?)|(?:\d[\d,]*(?:\.\d+)?\s?(?:%|percent\b|x\b|k\b))|(?:\b\d[\d,]*(?:\.\d+)?\b)/gi;
const CITED_SOURCE_RE = /\b(?:according to|(?:a|one|the latest|a recent|recent) (?:study|survey|report|benchmark|analysis)|research (?:shows|suggests|found)|data (?:shows|suggests)|studies (?:show|suggest|found)|(?:study|survey|report) (?:found|shows))\b/i;
// Something the author did or lived through: "we declined", "I've seen it", "taught me", "our
// engineering hours". Any past tense after I or we counts, since a fixed verb list always leaks.
// Opinions ("I think", "my view") and hypotheticals ("say a team hires") do not match.
const FIRST_PERSON_EVENT_RE = /\b(?:I|we)(?:['’](?:ve|d))?\s+(?:\w+\s+){0,2}?(?:\w*[a-df-z]ed|was|were|had|saw|seen|been|made|took|got|found|lost|spent|built|brought|went|ran|paid|let|learnt|felt|thought|knew|told|gave|began|kept|left|met|sent|won|chose|hit|sold|grew|cut|shut|quit|wrote|led|drove|fought|bought|caught|taught|became|understood|stood|heard|held|said|did|came|fell|rose|spoke|swore|meant|dealt|used to)\b|\b(?:taught|cost|showed|gave|told|hit|forced|saved)\s+(?:me|us)\b|\b(?:my|our)\s+(?:\w+\s+)?(?:team|company|startup|clients?|customers?|manager|boss|ceo|co-?founder|cofounder|first|last|previous|old|engineering|engineers?|sales|hiring|board|investors?|hires?|business|warehouse|office|product|runway|revenue|roadmap|churn|launch|job)\b/i;
const FIRST_PERSON_BRIEF_RE = /\b(?:I|I'm|I've|we|we're|we've|my|our|us)\b/i;

const figureKey = (raw: string) => raw.toLowerCase().replace(/[$£€,\s]|percent/g, "").replace(/%$/, "");

const sentencesOf = (text: string) =>
  text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

/**
 * Flags claims in `text` that `sources` does not support. `sources` is everything the
 * author actually gave us: topic, goal, the hook they picked, their own draft, their
 * saved proof points. Returns one defect per kind, with the offending phrases quoted.
 */
export function checkGrounding(text: string, sources: string, options: { brief?: string } = {}): Defect[] {
  const defects: Defect[] = [];
  const sourceFigures = new Set((sources.match(FIGURE_RE) ?? []).map(figureKey));
  const sourceLower = sources.toLowerCase();

  const figures = [...new Set((text.match(FIGURE_RE) ?? []).map((m) => m.trim()))].filter((raw) => {
    const key = figureKey(raw);
    const isPlainSmall = /^\d+$/.test(raw) && Number(key) <= 10;
    const isYear = /^(?:19|20)\d{2}$/.test(raw) && sourceLower.includes(raw);
    return !isPlainSmall && !isYear && !sourceFigures.has(key);
  });
  if (figures.length) {
    defects.push({
      code: "unsupported_figure",
      detail: `Uses figures the author never gave: ${figures.slice(0, 5).map((f) => `"${f}"`).join(", ")}.`,
      repair: "Remove each of those figures. Keep the point, stated without a number, or cut the sentence if the number was the point.",
      items: figures,
    });
  }

  const cited = sentencesOf(text).filter((s) => CITED_SOURCE_RE.test(s) && !sourceLower.includes(s.toLowerCase().slice(0, 40)));
  if (cited.length && !CITED_SOURCE_RE.test(sources)) {
    defects.push({
      code: "unsupported_source",
      detail: `Cites research or data the author never gave: ${cited.slice(0, 3).map((s) => `"${s}"`).join(" ")}`,
      repair: "Delete the citation. State the point as the author's view or as general reasoning, with no study, survey or data behind it.",
      items: cited,
    });
  }

  // A brief written in the first person ("We cut mis-picks...") authorises first-person
  // framing. A brief that only names a topic does not authorise an invented history.
  // Decided on what the author typed, not on an AI-written hook that may itself say "I".
  if (!FIRST_PERSON_BRIEF_RE.test(options.brief ?? sources)) {
    // A sentence the author already wrote is theirs, whatever it says.
    const events = sentencesOf(text).filter((s) => FIRST_PERSON_EVENT_RE.test(s) && !sourceLower.includes(s.toLowerCase().slice(0, 40)));
    if (events.length) {
      defects.push({
        code: "unsupported_experience",
        detail: `Invents things the author did: ${events.slice(0, 4).map((s) => `"${s}"`).join(" ")}`,
        repair: "Rewrite each of those sentences without the invented event: as general reasoning, as a hypothetical (\"say a team hires...\"), or cut it. Keep the author's opinions in first person.",
        items: events,
      });
    }
  }
  return defects;
}

const STOPWORDS = new Set("a an and are as at be but by for from has have i if in into is it its my no not of on or our so than that the their them then there they this to up us was we were what when where which who will with you your".split(" "));

const phraseKeys = (text: string, size: number) => {
  const words = text.toLowerCase().replace(/[‘’]/g, "'").match(/[\p{L}\p{N}']+/gu) ?? [];
  const keys: string[] = [];
  for (let i = 0; i + size <= words.length; i += 1) {
    const slice = words.slice(i, i + size);
    const content = slice.filter((w) => !STOPWORDS.has(w) && w.length >= 4).length;
    // Three all-content words ("people stop leaving") or four with two content words
    // ("walk the floor before"). Anything looser matches ordinary shared vocabulary.
    if ((size === 3 && content === 3) || (size === 4 && content >= 2)) keys.push(slice.join(" "));
  }
  return keys;
};

/**
 * Writing samples are style evidence. Live drafts lifted their content instead: "people stop
 * leaving" and "walk the floor" from a warehouse author's samples turned up in a post about
 * startup hiring. Flags sentences that reuse a distinctive phrase from a sample. Phrases the
 * author is meant to repeat (their sign-off, their signature phrases) and words from the
 * brief are allowed.
 */
export function checkSampleEcho(text: string, samples: string[] = [], allowed: string[] = []): Defect[] {
  if (!samples.length) return [];
  const allowedKeys = new Set(allowed.flatMap((phrase) => [...phraseKeys(phrase, 3), ...phraseKeys(phrase, 4)]));
  const sampleKeys = new Set(samples.flatMap((sample) => [...phraseKeys(sample, 3), ...phraseKeys(sample, 4)]).filter((key) => !allowedKeys.has(key)));
  // A short allowed phrase ("the boring answer") is cut out of the sentence first, so the
  // words around it cannot form a match with it ("the boring answer is").
  const shortAllowed = allowed.map((phrase) => phrase.trim().toLowerCase()).filter((phrase) => phrase && phrase.length <= 80);
  const withoutAllowed = (sentence: string) =>
    shortAllowed.reduce((acc, phrase) => acc.split(phrase).join(" | "), sentence.toLowerCase().replace(/[‘’]/g, "'"));
  const echoes = sentencesOf(text).filter((sentence) => {
    const parts = withoutAllowed(sentence).split("|");
    return parts.some((part) => [...phraseKeys(part, 3), ...phraseKeys(part, 4)].some((key) => sampleKeys.has(key)));
  });
  if (!echoes.length) return [];
  return [{
    code: "sample_echo",
    detail: `Copies wording from the author's sample posts: ${echoes.slice(0, 4).map((s) => `"${s}"`).join(" ")}`,
    repair: "Rewrite each of those sentences in new words about this post's topic, or cut it. The samples show how the author sounds, not what to say.",
    items: echoes,
  }];
}

/**
 * Last resort after the revise passes: delete whole sentences that invent an experience or
 * cite a source nobody gave. Figures are left alone, since cutting one mid-sentence breaks it.
 */
export function removeInventedSentences(text: string, defects: Defect[]): string {
  const sentences = defects
    .filter((d) => d.code === "unsupported_experience" || d.code === "unsupported_source")
    .flatMap((d) => d.items ?? [])
  let result = text
  for (const sentence of sentences) result = result.replace(sentence, "")
  return result.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
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
