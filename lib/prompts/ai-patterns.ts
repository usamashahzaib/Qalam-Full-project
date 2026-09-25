// lib/prompts/ai-patterns.ts
// Deterministic detector for machine-writing patterns in anything Qalam writes.
//
// This is not the old hasAiSlop() word blacklist. Three differences:
//   1. Fixed phrases and sentence templates that are almost never needed
//      ("delve", "a testament to", "It's not just X, it's Y") are flagged on
//      sight. Ordinary words that are only a tell in bulk ("robust",
//      "navigate", "leverage") are flagged only when they cluster.
//   2. Structure is checked, not just vocabulary: participial tails, stacked
//      triads, flat sentence length, summary closers, rhetorical Q-and-A.
//   3. Every defect quotes what it found and carries a repair instruction, and
//      callAi() actually runs the repair instead of logging and shipping.
//
// It only ever runs on text Qalam generated. Never on text a client wrote.

import type { Defect } from "./output-checks";

export interface AiPatternOptions {
  /** Square-bracket prompts like "[add figure]" are intentional in resume suggestions. */
  allowPlaceholders?: boolean;
}

type PhraseRule = { re: RegExp; label?: string };

const w = (source: string) => new RegExp(`\\b(?:${source})\\b`, "gi");

// Model narrating itself, or an unfilled template. Always a defect.
const BOILERPLATE: PhraseRule[] = [
  { re: /\bas an ai(?:[,.]| language model| assistant)/gi, label: "As an AI" },
  { re: w("as a language model|i hope this helps|hope this helps|i'?m happy to help|great question|feel free to reach out|i can'?t browse") },
  { re: /^\s*(?:certainly|absolutely|of course|sure)[!,.]/gim, label: "opening 'Certainly!'" },
];

const PLACEHOLDER_RE = /\[(?:[A-Z][A-Za-z ]{1,30}|insert[^\]]{0,40}|your [^\]]{0,40}|x|y|n)\]|\{\{\s*\w[\w ]{0,30}\}\}|<(?:insert|your)[^>]{0,40}>/g;

// Phrases and templates that are flagged on sight.
const PHRASES: PhraseRule[] = [
  // S-tier vocabulary
  { re: w("delve[sd]?|delving|tapestry|multifaceted|paramount|meticulous(?:ly)?|intricate(?:ly)?|intricacies|underscor(?:e|es|ed|ing)|pivotal|seamless(?:ly)?|realm|moreover|furthermore|testament to|commendable|kudos|myriad|plethora|unwavering|trailblazer|beacon of|epitome of|embodiment of|nestled|hidden gem|game[- ]?chang(?:er|ers|ing)|supercharg(?:e|ed|es|ing)|unleash(?:es|ed|ing)?|revolutioniz(?:e|es|ed|ing)|cutting[- ]edge|state[- ]of[- ]the[- ]art") },
  // Trend scaffolding and openers
  { re: w("in today'?s (?:fast[- ]paced|digital|modern|ever[- ]changing|competitive) (?:world|age|landscape|era|market)|in the digital age|in an increasingly \\w+ world|ever[- ](?:evolving|changing)(?: landscape)?|gone are the days|has emerged as|taken the world by storm|gained significant attention|become increasingly (?:popular|important|common)|more and more people|(?:a )?growing interest in|it'?s no secret|there'?s no denying|we'?ve all been there|if you'?re like most people|chances are|let'?s face it|here'?s the thing|the truth is|here'?s the kicker|picture this|for the uninitiated|with the (?:rise|advent) of") },
  // Sentence machines
  { re: w("that'?s where \\w+(?: \\w+)? comes? in|at its core|the beauty of [\\w ]{1,30} lies|the answer lies in|one thing is clear|it'?s worth noting|it is worth noting|it'?s important to (?:note|remember)|it is important to note|not to mention|striking the right balance|strik(?:e|es|ing) a (?:delicate )?balance|what works best for you|only time will tell|the future (?:of [\\w ]{1,30} )?looks bright|stay tuned|(?:and )?that'?s (?:perfectly )?okay|is here to stay|let that sink in|read that again|let'?s (?:dive|delve|explore|unpack)|dive (?:deep|into)|deep dive|in essence|simply put|at its simplest|thanks to [\\w ]{1,30}, you can now") },
  { re: /\bnot only\b[^.!?\n]{1,80}\bbut also\b/gi, label: "Not only X, but also Y" },
  { re: /\b(?:it'?s|this is|that'?s|this isn'?t|it isn'?t|isn'?t|aren'?t|is|are)\s+not\s+(?:just|only|merely)\b[^.!?\n]{1,80}?[,;:.-]\s*(?:it'?s|this is|they'?re|that'?s|but)\b/gi, label: "It's not just X, it's Y" },
  { re: /\b(?:isn'?t|aren'?t|is not|are not)\s+(?:just|only|merely|really)\s+about\b/gi, label: "X isn't just about Y" },
  { re: /\bwhether you'?re an? [^.!?\n,]{1,40}? or an? /gi, label: "Whether you're a X or a Y" },
  { re: /\b\w+ and \w+ alike\b/gi, label: "X and Y alike" },
  { re: /^\s*from [^,.\n]{2,40} to [^,.\n]{2,40},/gim, label: "From X to Y, opener" },
  { re: /^\s*enter:/gim, label: "Enter: X" },
  { re: /(?:^|[.!?]\s+)(?:and |but )?(?:the (?:result|answer|catch|kicker|best part|problem|secret|twist|lesson|takeaway)|why|how)\?(?=\s)/gim, label: "rhetorical 'The result?' question" },
  // Both-sides hedging and balance closers
  { re: /\bwhile [^.!?\n]{1,60}\b(?:offers?|brings?|provides?|has) (?:many |undeniable |clear |significant |numerous )?(?:benefits|advantages)/gi, label: "While X offers benefits... hedge" },
  { re: w("it is equally important|it'?s equally important|on the flip side|when all is said and done|at the end of the day|all things considered|in conclusion|to sum up|in closing|in summary|key takeaways?|final thoughts|the bottom line|the possibilities are endless|embrace the journey|the choice is yours|so why wait|what are you waiting for") },
  // Marketing and corporate stock
  { re: w("look no further|the ultimate guide|everything you need to know|say goodbye to|take (?:it|this|things|your \\w+) to the next level|level up|unlock (?:your|the|their|its) (?:full |true )?potential|think outside the box|move the needle|low[- ]hanging fruit|circle back|touch base|value proposition|don'?t miss out|start your journey|join thousands of|the power of|the secret (?:lies|is)|your go[- ]to|holy grail|and much more") },
  // Quantifier soup and idiom stacks
  { re: w("a wealth of|a multitude of|a host of|an array of|a spectrum of|double[- ]edged sword|tip of the iceberg|rais(?:e|es|ed|ing) the bar|set(?:s|ting)? the stage|pav(?:e|es|ed|ing) the way|bridg(?:e|es|ed|ing) the gap|go(?:es)? hand in hand|two sides of the same coin|food for thought|elephant in the room|force to be reckoned with|indelible mark|watershed moment|second to none|the sky'?s the limit|shed(?:s|ding)? (?:some )?light on|plays? an? (?:vital|crucial|pivotal|key|significant|important) role|cannot be overstated|can'?t be overstated|of paramount importance|relentless pursuit|humble beginnings|lasting legacy|navigat(?:e|es|ed|ing) the (?:complexities|intricacies|landscape|world|challenges)") },
  // One-word drama paragraphs
  { re: /^\s*(?:exactly|period|full stop|simple|that'?s it|boom|wild)[.!]?\s*$/gim, label: "one-word drama line" },
];

// Words that are fine alone and a tell in bulk.
const CLUSTER_WORDS = w(
  "robust|leverag(?:e|es|ed|ing)|harness(?:es|ed|ing)?|streamlin(?:e|es|ed|ing)|optimi[sz](?:e|es|ed|ing)|scalable|synergy|synergies|stakeholders?|actionable|data[- ]driven|best practices|elevat(?:e|es|ed|ing)|empower(?:s|ed|ing)?|foster(?:s|ed|ing)?|navigat(?:e|es|ed|ing)|landscape|journey|transformative|transformation|holistic|thrive|thriving|flourish(?:ing)?|embrac(?:e|es|ed|ing)|comprehensive|nuanced|invaluable|indispensable|imperative|utili[sz](?:e|es|ed|ing|ation)|facilitat(?:e|es|ed|ing)|notably|additionally|consequently|crucial|vital|dynamic|innovative|impactful|insightful|showcas(?:e|es|ed|ing)|resonat(?:e|es|ed|ing)|vibrant|bustling|boasts?|numerous|countless|diverse|various|that said|on the other hand|in many ways|to some extent|more often than not|by and large|arguably|generally speaking|ultimately"
);

// The verb must be followed by an object-like word, so list nouns such as
// ", positioning decisions, and" are not mistaken for a trailing clause.
const TAIL_OBJECT = "(?:the|a|an|that|it|its|them|you|your|our|their|his|her|every|each|users?|teams?|people|brands?|companies|us|this|these|more|greater|better|for|to)";
const PARTICIPIAL_TAIL_RE = new RegExp(
  `,\\s+(?:(?:ensuring|allowing|enabling|empowering|paving|fostering|highlighting|underscoring|showcasing|cementing|solidifying|reflecting|marking|driving|creating) ${TAIL_OBJECT}\\b|positioning \\w+(?: \\w+)? as\\b|making it (?:easier|possible|clear|simple)\\b)[^.!?\\n]{0,60}`,
  "gi"
);
const WHICH_TAIL_RE = /,\s+which (?:means that|is why|allows|enables|makes it|helps)\b[^.!?\n]{0,40}/gi;
const THIS_NOUN_OPENER_RE = /(?:^|[.!?]\s+)(?:this|these) (?:approach|method|strategy|shift|framework|mindset|process|highlights|underscores|demonstrates|ensures|allows|means|is why|challenges|insights?)\b/gim;
// Exactly three items. The lookbehind rejects the tail end of a longer list.
const TRIAD_RE = /(?<!,\s(?:[A-Za-z'-]+\s){0,2})\b[A-Za-z'-]+(?: [A-Za-z'-]+){0,2}, [A-Za-z'-]+(?: [A-Za-z'-]+){0,2},? (?:and|or) [A-Za-z'-]+(?: [A-Za-z'-]+){0,2}(?=[.,;:!?\s]|$)/g;
const CLOSER_RE = /^(?:ultimately|in the end|in short|in summary|overall|to conclude|so,? remember|remember,)\b/i;
const PSEUDO_BOLD_RE = /[\u{1D400}-\u{1D7FF}]/u;

const quote = (items: string[], max = 6) =>
  [...new Set(items.map((s) => s.trim().replace(/\s+/g, " ").slice(0, 70)))].slice(0, max).map((s) => `"${s}"`).join(", ");

const matchesOf = (re: RegExp, text: string) => [...text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`))].map((m) => m[0]);

const wordCount = (text: string) => (text.match(/[\p{L}\p{N}'-]+/gu) || []).length;

export function sentenceLengths(text: string): number[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => wordCount(s))
    .filter((n) => n > 0);
}

/**
 * Part 1 burstiness test: if most sentences sit within 5 words of the median,
 * the rhythm is a flatline. Short-line posts are exempt because the median is
 * too small for the window to mean anything.
 */
export function isFlatRhythm(text: string): { flat: boolean; lengths: number[] } {
  const lengths = sentenceLengths(text);
  if (lengths.length < 6) return { flat: false, lengths };
  const sorted = [...lengths].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median < 10) return { flat: false, lengths };
  const near = lengths.filter((n) => Math.abs(n - median) <= 5).length;
  return { flat: near / lengths.length >= 0.8, lengths };
}

/** Every machine-writing pattern in a piece of generated text, each with a repair instruction. */
export function detectAiPatterns(text: string, options: AiPatternOptions = {}): Defect[] {
  // Quoted spans are someone else's words (feedback quoting a client's draft,
  // a cited line). Editing them would falsify the quote, so they are not scanned.
  const trimmed = text
    .trim()
    .replace(/"[^"\n]{1,200}"|“[^”\n]{1,200}”|&ldquo;[^\n]{1,200}?&rdquo;|&quot;[^\n]{1,200}?&quot;/g, '""');
  if (!trimmed.replace(/""/g, "").trim()) return [];
  const defects: Defect[] = [];

  const boiler = BOILERPLATE.flatMap((r) => matchesOf(r.re, trimmed));
  if (boiler.length) {
    defects.push({
      code: "ai_boilerplate",
      detail: `Assistant boilerplate: ${quote(boiler)}.`,
      repair: "Delete these lines entirely. The output is the content itself, with no assistant voice.",
    });
  }

  if (!options.allowPlaceholders) {
    const holes = matchesOf(PLACEHOLDER_RE, trimmed);
    if (holes.length) {
      defects.push({
        code: "ai_placeholder",
        detail: `Unfilled placeholder: ${quote(holes)}.`,
        repair: "Remove every placeholder and write the sentence so it works without that detail. Never invent the missing fact.",
      });
    }
  }

  if (PSEUDO_BOLD_RE.test(trimmed)) {
    defects.push({
      code: "ai_pseudo_bold",
      detail: "Uses Unicode bold or italic letters.",
      repair: "Replace the styled Unicode letters with plain letters.",
    });
  }

  const phraseHits = PHRASES.flatMap((r) => matchesOf(r.re, trimmed));
  if (phraseHits.length) {
    defects.push({
      code: "ai_phrase",
      detail: `Stock machine phrasing: ${quote(phraseHits, 10)}.`,
      repair: "Rewrite only those parts in the plain words this person would say out loud. Do not swap in a synonym that does the same job, cut the phrase or say the specific thing instead.",
    });
  }

  const words = wordCount(trimmed);
  const clusterHits = matchesOf(CLUSTER_WORDS, trimmed);
  if (clusterHits.length >= Math.max(2, Math.ceil(words / 90))) {
    defects.push({
      code: "ai_vocabulary_cluster",
      detail: `Too many stock words together: ${quote(clusterHits, 10)}.`,
      repair: "Replace most of these with plainer, more concrete words. Keep one only if it is the exact right word.",
    });
  }

  const tails = [...matchesOf(PARTICIPIAL_TAIL_RE, trimmed), ...matchesOf(WHICH_TAIL_RE, trimmed)];
  if (tails.length) {
    defects.push({
      code: "ai_participial_tail",
      detail: `Sentences trail off into a purpose clause: ${quote(tails)}.`,
      repair: "End those sentences at the comma, or turn the tail into its own short sentence with a real subject.",
    });
  }

  const thisOpeners = matchesOf(THIS_NOUN_OPENER_RE, trimmed);
  if (thisOpeners.length >= 2) {
    defects.push({
      code: "ai_this_opener",
      detail: `Repeated "This + noun" sentence openers: ${quote(thisOpeners)}.`,
      repair: "Rewrite those openers so each sentence names the actual thing instead of pointing back with 'This'.",
    });
  }

  const triads = matchesOf(TRIAD_RE, trimmed);
  if (triads.length >= 2) {
    defects.push({
      code: "ai_triad",
      detail: `Stacked three-item lists: ${quote(triads)}.`,
      repair: "Break the rule of three. Cut at least one of these lists to two items, or make one a single concrete example.",
    });
  }

  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const last = paragraphs.at(-1) ?? "";
  if (paragraphs.length > 1 && CLOSER_RE.test(last)) {
    defects.push({
      code: "ai_summary_closer",
      detail: `Ends with a summary closer: "${last.slice(0, 60)}".`,
      repair: "Delete the closing summary or replace it with one concrete final point. Do not restate what was already said.",
    });
  }

  const semicolons = (trimmed.replace(/&#?\w+;/g, "").match(/;/g) || []).length;
  const ellipses = (trimmed.match(/\.\.\.|…/g) || []).length;
  if (semicolons >= 2 || ellipses >= 2) {
    defects.push({
      code: "ai_punctuation",
      detail: `${semicolons} semicolons and ${ellipses} ellipses.`,
      repair: "Replace the semicolons and trailing ellipses with full stops or commas.",
    });
  }

  const rhythm = isFlatRhythm(trimmed);
  if (rhythm.flat) {
    defects.push({
      code: "ai_flat_rhythm",
      detail: `Sentence lengths are uniform (${rhythm.lengths.slice(0, 12).join(", ")} words).`,
      repair: "Vary the rhythm without adding content: make one or two sentences very short and let one run long by joining two related sentences.",
    });
  }

  return defects;
}

/** String leaves of a JSON value with their paths. Short labels and URLs are skipped. */
export function proseLeaves(value: unknown, path = ""): Array<{ path: string; text: string }> {
  if (typeof value === "string") {
    return value.length >= 20 && !/^https?:\/\//.test(value) ? [{ path, text: value }] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item, i) => proseLeaves(item, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => proseLeaves(item, path ? `${path}.${key}` : key));
  }
  return [];
}

/** Writes a string back into a parsed JSON value at a path produced by proseLeaves(). */
export function setAtPath(root: unknown, path: string, next: string): void {
  const keys = path.match(/[^.[\]]+/g) ?? [];
  let node = root as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i += 1) {
    node = node?.[keys[i]] as Record<string, unknown>;
    if (!node || typeof node !== "object") return;
  }
  const lastKey = keys.at(-1);
  if (lastKey !== undefined && typeof node[lastKey] === "string") node[lastKey] = next;
}
