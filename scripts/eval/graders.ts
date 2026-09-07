// Graders for the writing evaluation.
//
// Read this before trusting any number these produce.
//
// Every grader here is a PROXY. None of them can tell you whether a comment is
// good. They measure properties that correlate with the failures we are trying
// to fix, and they are useful for two things: catching a regression across many
// cases at once, and pointing a human at the outputs worth reading.
//
// What they explicitly are not:
// - Not a "human score". There is no such thing as a detector for that. An AI
//   detector score is not evidence and this file does not compute one.
// - Not a grounding oracle. unsupportedClaimFlags finds first-person claim
//   SHAPES. A flag means "a person should read this line", not "this is a lie",
//   and an absent flag does not mean the text is grounded.
//
// The dimensions are kept separate on purpose. A comment can be perfectly
// grounded and completely irrelevant to the post it replies to, and averaging
// those into one number hides exactly the failure we care about.

import { similarity } from "@/lib/prompts/output-checks";

const words = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

const sentences = (text: string) =>
  text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 1);

// ---------------------------------------------------------------------------
// 1. Source relevance
// ---------------------------------------------------------------------------

export interface RelevanceResult {
  /** Fraction of the post's distinctive terms the reply engages with. */
  anchorHitRate: number;
  hitAnchors: string[];
  /** Anchors that only appear late in a long post. The truncation canary. */
  tailAnchorHits: string[];
  /** High overlap with the source usually means the reply is paraphrasing it. */
  paraphraseRatio: number;
}

export function gradeRelevance(
  output: string,
  sourceAnchors: string[],
  tailAnchors: string[] = [],
  sourceText = ""
): RelevanceResult {
  const lower = output.toLowerCase();
  const hit = (anchor: string) => lower.includes(anchor.toLowerCase());
  const hitAnchors = sourceAnchors.filter(hit);
  return {
    anchorHitRate: sourceAnchors.length ? hitAnchors.length / sourceAnchors.length : 0,
    hitAnchors,
    tailAnchorHits: tailAnchors.filter(hit),
    paraphraseRatio: sourceText ? similarity(output, sourceText) : 0,
  };
}

// ---------------------------------------------------------------------------
// 2. Factual grounding (flags for human review)
// ---------------------------------------------------------------------------

// First-person claim shapes. These are the sentence forms the model reaches for
// when it decides to borrow credibility it was never given.
const CLAIM_PATTERNS: Array<{ code: string; re: RegExp }> = [
  { code: "first_person_experience", re: /\b(?:when|after|once)\s+(?:i|we)\s+\w+/i },
  { code: "possessive_client", re: /\b(?:my|our)\s+(?:client|clients|customer|customers|team|company|startup|agency|students)\b/i },
  { code: "personal_result", re: /\b(?:i|we)\s+(?:grew|scaled|reduced|increased|cut|saved|doubled|tripled|shipped|launched|hired|fired|raised)\b/i },
  { code: "years_of_experience", re: /\b(?:in|over|after)\s+(?:my\s+)?\d+\+?\s+years?\b/i },
  { code: "witnessed_claim", re: /\bi(?:'ve| have)\s+(?:seen|watched|worked with|advised|coached|reviewed)\b/i },
  { code: "unsourced_statistic", re: /\b\d{1,3}(?:\.\d+)?%|\b\d+x\b|\$\s?\d/i },
];

export interface GroundingResult {
  /** Every claim-shaped line found. Needs human review, not automatic failure. */
  flags: Array<{ code: string; excerpt: string }>;
  /** Case-specific claims the case author said must not appear. */
  forbiddenHits: string[];
}

export function gradeGrounding(output: string, forbiddenClaims: string[] = [], suppliedFacts = ""): GroundingResult {
  const flags: Array<{ code: string; excerpt: string }> = [];
  const suppliedLower = suppliedFacts.toLowerCase();

  for (const line of sentences(output)) {
    for (const { code, re } of CLAIM_PATTERNS) {
      const match = line.match(re);
      if (!match) continue;
      // If the exact phrase appears in what the author supplied, it is quoted
      // material rather than an invention.
      if (suppliedLower.includes(match[0].toLowerCase())) continue;
      flags.push({ code, excerpt: line.slice(0, 160) });
      break;
    }
  }

  const lower = output.toLowerCase();
  return {
    flags,
    forbiddenHits: forbiddenClaims.filter((claim) => lower.includes(claim.toLowerCase())),
  };
}

// ---------------------------------------------------------------------------
// 3. Voice fidelity
// ---------------------------------------------------------------------------

const contractionRate = (text: string) => {
  const total = words(text).length || 1;
  return (text.match(/\b\w+['’](?:s|t|re|ve|ll|d|m)\b/gi) || []).length / total;
};

const meanSentenceWords = (text: string) => {
  const list = sentences(text);
  if (!list.length) return 0;
  return list.reduce((sum, s) => sum + words(s).length, 0) / list.length;
};

export interface VoiceResult {
  /** null when the case has no samples: there is nothing to compare against. */
  sentenceLengthDelta: number | null;
  contractionDelta: number | null;
  vocabularyOverlap: number | null;
  /** Copying a sample's content rather than its style. High is bad. */
  maxSampleSimilarity: number | null;
}

export function gradeVoice(output: string, samples: string[] = [], vocabulary: string[] = []): VoiceResult {
  if (!samples.length) {
    return {
      sentenceLengthDelta: null,
      contractionDelta: null,
      vocabularyOverlap: vocabulary.length
        ? vocabulary.filter((v) => output.toLowerCase().includes(v.toLowerCase())).length / vocabulary.length
        : null,
      maxSampleSimilarity: null,
    };
  }

  const sampleText = samples.join("\n\n");
  return {
    sentenceLengthDelta: meanSentenceWords(output) - meanSentenceWords(sampleText),
    contractionDelta: contractionRate(output) - contractionRate(sampleText),
    vocabularyOverlap: vocabulary.length
      ? vocabulary.filter((v) => output.toLowerCase().includes(v.toLowerCase())).length / vocabulary.length
      : null,
    maxSampleSimilarity: Math.max(...samples.map((sample) => similarity(output, sample))),
  };
}

// ---------------------------------------------------------------------------
// 4. Natural phrasing
// ---------------------------------------------------------------------------

// Observations, not violations. Each of these can be the right choice once.
// The signal is a pattern showing up across many outputs, which is what the
// aggregate report surfaces.
const PHRASING_OBSERVATIONS: Array<{ code: string; re: RegExp }> = [
  { code: "stock_opener", re: /^\s*(?:great post|well said|couldn't agree more|spot on|this resonates|thanks for sharing|love this|so true|absolutely)\b/i },
  { code: "announcing_frame", re: /\b(?:here's the thing|the real (?:issue|problem) is|let me be clear|at the end of the day|the hard part is|the easy part is|make no mistake)\b/i },
  { code: "closing_summary", re: /\b(?:in (?:conclusion|short)|to sum up|and that's why|the lesson (?:here )?is|bottom line)\b/i },
  { code: "generic_question_close", re: /(?:what do you think|have you experienced this|thoughts\?|am i wrong)\s*\??\s*$/i },
  { code: "forced_profundity", re: /\b(?:this is (?:the|a) (?:real|hard) truth|profound|paradigm|game[- ]changer|the future belongs)\b/i },
  { code: "long_dash", re: /[\u2013\u2014]/ },
  { code: "engagement_bait", re: /\b(?:comment ["“]?\w+["”]? below|tag someone|drop a comment|dm me the word)\b/i },
];

export interface PhrasingResult {
  observations: Array<{ code: string; excerpt: string }>;
  meanSentenceWords: number;
  sentenceLengthSpread: number;
}

export function gradePhrasing(output: string): PhrasingResult {
  const observations: Array<{ code: string; excerpt: string }> = [];
  for (const { code, re } of PHRASING_OBSERVATIONS) {
    const match = output.match(re);
    if (match) observations.push({ code, excerpt: match[0].slice(0, 80) });
  }
  const lengths = sentences(output).map((s) => words(s).length);
  const mean = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const spread = lengths.length > 1 ? Math.max(...lengths) - Math.min(...lengths) : 0;
  return { observations, meanSentenceWords: mean, sentenceLengthSpread: spread };
}

// ---------------------------------------------------------------------------
// 5. Variation
// ---------------------------------------------------------------------------

export interface VariationResult {
  /** Highest pairwise overlap. High means variants are synonym swaps. */
  maxPairSimilarity: number;
  meanPairSimilarity: number;
  /** Openings that repeat across runs are the clearest template signature. */
  repeatedOpenings: string[];
  lengthSpread: number;
}

export function gradeVariation(outputs: string[]): VariationResult {
  const pairs: number[] = [];
  for (let i = 1; i < outputs.length; i += 1) {
    for (let j = 0; j < i; j += 1) pairs.push(similarity(outputs[i], outputs[j]));
  }

  const openings = outputs.map((o) => words(o).slice(0, 4).join(" ")).filter(Boolean);
  const counts = new Map<string, number>();
  for (const opening of openings) counts.set(opening, (counts.get(opening) ?? 0) + 1);

  const lengths = outputs.map((o) => words(o).length);
  return {
    maxPairSimilarity: pairs.length ? Math.max(...pairs) : 0,
    meanPairSimilarity: pairs.length ? pairs.reduce((a, b) => a + b, 0) / pairs.length : 0,
    repeatedOpenings: [...counts.entries()].filter(([, n]) => n > 1).map(([opening]) => opening),
    lengthSpread: lengths.length > 1 ? Math.max(...lengths) - Math.min(...lengths) : 0,
  };
}
