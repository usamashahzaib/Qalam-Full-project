// lib/prompts/role-aware-system.ts
// Qalam content engine - role-aware prompt builders for posts, hooks, scoring
// and revision.
//
// The shared writing rules live in ./writing-policy. This file only holds what
// is specific to a task: what the role knows, what the format needs, what JSON
// shape comes back. Anything that would apply to every writing surface belongs
// in the policy, not here.
//
// Role profiles live in ./role-profiles - add a new role there.

export type { PostFormat, VoiceProfile, RoleProfile } from "./role-profiles";
export { ROLE_PROFILES, GENERIC_PROFILE, resolveRoleProfile } from "./role-profiles";

import type { PostFormat, VoiceProfile, RoleProfile } from "./role-profiles";
import { GENERIC_PROFILE, resolveRoleProfile } from "./role-profiles";
import { POST_TASK_RULES } from "./builders/generate";
import { HOOK_TASK_RULES } from "./builders/hooks";
import {
  WRITING_POLICY,
  MECHANICAL_RULES,
  GROUNDING_RULES,
  LANGUAGE_RULE,
  authorContext,
  voiceGuidance,
  sourceMaterial,
} from "./writing-policy";
import { repairBrief, type Defect } from "./output-checks";

// ---------------------------------------------------------------------------
// ROLE ADAPTATION HELPERS
// For a canonical role (one of the profiles in role-profiles.ts) these just
// return the curated data. For any other free-text profession (a plumber, a
// dentist, a teacher...) there is no canned vocabulary/pain-point list to
// draw from, so instead of falling back to generic "professional" filler,
// these instruct the model to derive authentic, profession-specific detail
// itself from the literal role label the user typed.
// ---------------------------------------------------------------------------
function roleVoiceBlock(label: string, profile: RoleProfile, isCanonical: boolean): string {
  if (isCanonical) return profile.voice;
  return `Writes as a real ${label} - grounded in the actual day-to-day of that work. Real tools, jargon, workflows, frustrations, and small wins specific to being a ${label}, drawn from genuine knowledge of that profession. Concrete and specific, never generic "professional" language.`;
}

function roleVoiceHeadline(label: string, profile: RoleProfile, isCanonical: boolean): string {
  if (isCanonical) return profile.voice.split(".")[0];
  return `Writes like a real ${label}, grounded in the specifics of that work`;
}

function roleVocabularyLine(label: string, profile: RoleProfile, isCanonical: boolean): string {
  if (isCanonical) return profile.vocabulary.join(", ");
  return `(No canned list for this profession - use real, specific vocabulary and shorthand that a ${label} would actually use on the job, not generic corporate speak.)`;
}

function rolePainPointsLine(label: string, profile: RoleProfile, isCanonical: boolean): string {
  if (isCanonical) return profile.painPoints.join("; ");
  return `Infer the real, specific frustrations and pressures a ${label} deals with day to day - from clients, bosses, tools, schedules, or the public. Be specific, not generic.`;
}

function roleFormatsBlock(label: string, profile: RoleProfile, isCanonical: boolean): string {
  if (isCanonical) return profile.formats.join("\n");
  return `A concrete story from the job, a mistake and the fix, a myth outsiders believe about ${label}s, or a specific detail that reveals what the work actually involves.`;
}

function roleExampleHooksBlock(profile: RoleProfile, isCanonical: boolean): string {
  if (isCanonical) return profile.exampleHooks.map((h) => `"${h}"`).join("\n");
  return "(No canned examples for this profession - write openings that sound like a real person in this line of work, not a template.)";
}

function roleBannedWords(profile: RoleProfile, isCanonical: boolean): string[] {
  return isCanonical ? profile.banned : GENERIC_PROFILE.banned;
}

// A role tells you the subject matter someone can speak to. It does not tell
// you what they have personally done. Every builder that mentions a role also
// carries this line, because "write as a Founder" is the single strongest pull
// towards fabricated war stories in the whole pipeline.
const ROLE_IS_NOT_EXPERIENCE =
  "This role describes the subject matter this person can speak to. It is not a record of anything they have personally done. Do not give them a company, a team, a client, a funding round, a launch, or a result unless the supplied context states it.";

// ---------------------------------------------------------------------------
// FORMAT CONSTRAINTS
// ---------------------------------------------------------------------------
const FORMAT_RULES: Record<PostFormat, { charLimit: number; lineGuidance: string }> = {
  short: {
    charLimit: 600,
    lineGuidance:
      "Roughly 4 to 7 lines. There is only room for the point and the detail that supports it. Cut anything else.",
  },
  medium: {
    charLimit: 1400,
    lineGuidance:
      "Roughly 8 to 14 lines. Enough room for the point, the reasoning, and one concrete detail. Blank lines where the thought changes.",
  },
  long: {
    charLimit: 2800,
    lineGuidance:
      "Roughly 15 to 25 lines. Enough room to develop the idea properly. Blank lines where the thought changes, and no paragraph walls on mobile. Length is permission, not a quota to fill.",
  },
};

// ---------------------------------------------------------------------------
// LINKEDIN POSITIONING AND TRUST
// Kept separate from the writing policy because these are platform and product
// constraints rather than writing quality.
// ---------------------------------------------------------------------------
export const LINKEDIN_POSITIONING_RULES = `
LINKEDIN POSITIONING AND TRUST RULES:
- When professional context is available, write for the audience it names and stay inside the author's saved content pillars. Without that context, stay on the topic the author gave you and do not drift.
- Use only supplied personal facts and proof. Never invent a client, employer, metric, credential, event, quote, or first-person experience.
- Do not claim that any format or tactic guarantees reach, impressions, or algorithmic distribution.
- Invite conversation only when there is something real to discuss. Never ask readers to comment a keyword, tag friends, join a pod, or engage in exchange for something.
- Prefer 0-3 precise topic hashtags. Do not pad the post with broad or unrelated tags.
`.trim();

// ---------------------------------------------------------------------------
// PASS 1 - GENERATE PROMPT
// ---------------------------------------------------------------------------
export function buildGeneratePrompt(
  role: string,
  topic: string,
  format: PostFormat,
  goal?: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);
  const formatRule = FORMAT_RULES[format];

  const system = [
    `You are writing one LinkedIn post on behalf of a ${label}. Write it as they would write it, not as a ghostwriter performing a LinkedIn post.`,
    `SUBJECT MATTER THEY KNOW:\n${roleVoiceBlock(label, profile, isCanonical)}\n\n${ROLE_IS_NOT_EXPERIENCE}`,
    `VOCABULARY THAT FITS THIS WORK (draw on it where it fits, do not tick items off):\n${roleVocabularyLine(label, profile, isCanonical)}`,
    `WHAT PEOPLE IN THIS WORK ACTUALLY CARE ABOUT:\n${rolePainPointsLine(label, profile, isCanonical)}`,
    authorContext(voiceProfile),
    `ANGLES THAT SUIT THIS ROLE (options, not a checklist):\n${roleFormatsBlock(label, profile, isCanonical)}`,
    `OPENINGS IN THIS REGISTER (style reference only, never copy):\n${roleExampleHooksBlock(profile, isCanonical)}`,
    `WORDS THIS PERSON WOULD NOT USE: ${roleBannedWords(profile, isCanonical).join(", ")}`,
    WRITING_POLICY,
    LANGUAGE_RULE,
    LINKEDIN_POSITIONING_RULES,
    POST_TASK_RULES,
    `LENGTH:\n${format}, up to ${formatRule.charLimit} characters. ${formatRule.lineGuidance}`,
    goal ? `GOAL FOR THIS POST: ${goal}` : "",
    "Write one post. Nothing before it, nothing after it.",
  ].filter(Boolean).join("\n\n");

  const user = [
    `Write a LinkedIn post about: ${topic}`,
    `Role: ${label}`,
    `Format: ${format}`,
    goal ? `Goal: ${goal}` : "",
    "Use only the facts above. If the topic needs a specific number or story you were not given, write the version that works without it.",
  ].filter(Boolean).join("\n");

  return { system, user };
}

// ---------------------------------------------------------------------------
// REVISION - replaces the old unconditional "humanize" pass
//
// The humanize pass used to run on every generation with no voice profile, no
// knowledge of what was wrong, and a standing order to break parallel
// structure and vary sentence rhythm. On a draft that was already fine it
// rewrote a specific voice into a generically "human" one. It now runs only
// when something is actually wrong, and it is told what.
// ---------------------------------------------------------------------------
export function buildRevisePrompt(
  post: string,
  role: string,
  defects: Defect[],
  voiceProfile?: VoiceProfile,
  context?: { topic?: string; goal?: string }
): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = [
    `You are making targeted edits to a LinkedIn post written for a ${label}. You are not rewriting it.`,
    `FIX EXACTLY THESE PROBLEMS AND NOTHING ELSE:\n${repairBrief(defects)}`,
    [
      "KEEP:",
      "- Every fact, number, name and specific detail exactly as written.",
      "- The structure, the order of ideas, and the line breaks.",
      "- Any sentence that is already working. Untouched is the correct outcome for most of the post.",
      "- The author's voice. If a phrase sounds like them, it stays, even if you would have written it differently.",
    ].join("\n"),
    "Do not add a new claim, example, statistic or experience while fixing something. If a fix would require a fact you do not have, make the smallest edit that removes the problem instead.",
    authorContext(voiceProfile),
    context?.topic ? `The post is about: ${context.topic}` : "",
    context?.goal ? `Its goal: ${context.goal}` : "",
    MECHANICAL_RULES,
    GROUNDING_RULES,
    LANGUAGE_RULE,
    "Output the edited post only.",
  ].filter(Boolean).join("\n\n");

  return { system, user: post };
}

// ---------------------------------------------------------------------------
// SCORING (5 dimension, used by the draft pipeline)
// ---------------------------------------------------------------------------
export function buildScorePrompt(post: string, role: string): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = `
You evaluate a LinkedIn post written for a ${label}. Score each dimension 0-100. Be honest rather than generous: an ordinary competent post is 55-70, and 90+ is rare.

You are judging whether a specific person said something worth reading. You are not checking the post against a template. A post that is calm, plain and useful can score high. A post that is dramatic, punchy and empty cannot.

1. RELEVANCE: Does it actually say something about its subject, or is it generic advice with the topic pasted on?

2. GROUNDING: Are the specifics real, or are there invented numbers, clients, results or experiences? An unsupported first-person claim is the worst thing a post can contain. Score below 40 if you find one, whatever else is good.

3. VOICE: Does it read as one particular person talking, with consistent register and vocabulary? Or as content produced for the platform? Penalise manufactured personality as heavily as no personality.

4. PHRASING: Is the language doing work? Look for stock openers, sentences that only announce the next sentence, tidy closing summaries, forced profundity, and rhetorical patterns repeated for effect. A common word used correctly is not a problem.

5. READABILITY: Can this be read on a phone. Spacing, sentence length, structure that matches the content.

Objective deductions:
- Any long dash character (em dash or en dash): deduct 15 from PHRASING.
- Markdown, code fences or "Hook:" style labels: deduct 15 from READABILITY.

Respond with valid JSON only, no markdown:
{
  "relevance_score": number,
  "grounding_score": number,
  "voice_score": number,
  "phrasing_score": number,
  "readability_score": number,
  "total_score": number,
  "is_good_enough": boolean,
  "biggest_weakness": "one sentence naming the single biggest problem, quoting the text where possible",
  "fix_instruction": "one specific instruction that fixes only that problem, phrased so the rest of the post stays untouched"
}

total_score = mean of the five scores, rounded.
is_good_enough = total_score >= 82.
`.trim();

  const user = sourceMaterial(`The post to score, written for a ${label}`, post);

  return { system, user };
}

// ---------------------------------------------------------------------------
// SCORE-DRIVEN REWRITE
// ---------------------------------------------------------------------------
export function buildRewritePrompt(
  post: string,
  fixInstruction: string,
  biggestWeakness: string,
  role: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = [
    `You are fixing one identified problem in a LinkedIn post written for a ${label}.`,
    `PROBLEM: ${biggestWeakness}`,
    `FIX: ${fixInstruction}`,
    [
      "Change only what that fix requires. Improving everything is how a draft turns into over-polished AI text, so leave the rest alone:",
      "- Keep every fact, number and name.",
      "- Keep the structure and the hashtags.",
      "- Keep wording that already sounds like this person.",
      "- Do not add a claim, statistic, client or personal experience that is not already there.",
    ].join("\n"),
    authorContext(voiceProfile),
    MECHANICAL_RULES,
    GROUNDING_RULES,
    LANGUAGE_RULE,
    "Output the revised post only.",
  ].filter(Boolean).join("\n\n");

  return { system, user: post };
}

// ---------------------------------------------------------------------------
// HOOK VARIANTS (3 styles, used inside the draft pipeline)
// ---------------------------------------------------------------------------
export function buildHookVariantsPrompt(
  topic: string,
  role: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);

  const system = [
    `You write opening lines for LinkedIn posts by a ${label}.`,
    ROLE_IS_NOT_EXPERIENCE,
    authorContext(voiceProfile),
    [
      "Write 3 openings for the same topic, each taking a different route in:",
      "1. Statement: says the actual point outright.",
      "2. Situation: starts inside a concrete situation. Only use a first-person situation if the supplied context supports it, otherwise describe the situation generally.",
      "3. Reframe: challenges an assumption the audience holds, but only where there is a real disagreement to have. If there is not, write a third angle that is genuinely different instead of manufacturing one.",
    ].join("\n"),
    MECHANICAL_RULES,
    GROUNDING_RULES,
    LANGUAGE_RULE,
    HOOK_TASK_RULES,
    `Register to match: ${roleVoiceHeadline(label, profile, isCanonical)}.`,
    `Return valid JSON only:\n[\n  { "style": "Statement", "hook": "..." },\n  { "style": "Situation", "hook": "..." },\n  { "style": "Reframe", "hook": "..." }\n]`,
  ].filter(Boolean).join("\n\n");

  return { system, user: `Topic: ${topic}\nRole: ${label}` };
}

// ---------------------------------------------------------------------------
// 5-STYLE HOOK GENERATION - for /api/generate/hooks
// ---------------------------------------------------------------------------
export function buildHook5StylesPrompt(
  topic: string,
  role: string,
  goal?: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);

  const system = [
    `You write opening lines for LinkedIn posts by a ${label}.`,
    ROLE_IS_NOT_EXPERIENCE,
    authorContext(voiceProfile),
    [
      "Write exactly 5 openings for the same topic, one per style. The style sets the angle, not a sentence pattern:",
      "1. SHARP: the uncomfortable or under-said part of the subject.",
      "2. AUTHORITY: leads with what is actually known, using only supplied evidence. If there is no supplied evidence, lead with the substance of the idea rather than with a credential.",
      "3. STORY: opens inside a specific situation. First person only where the supplied context supports it.",
      "4. CURIOSITY: opens a real gap the post will close. Do not tease something the post cannot deliver.",
      "5. DIRECT: states the useful thing plainly, no setup.",
    ].join("\n"),
    MECHANICAL_RULES,
    GROUNDING_RULES,
    LANGUAGE_RULE,
    HOOK_TASK_RULES,
    LINKEDIN_POSITIONING_RULES,
    `Register to match: ${roleVoiceHeadline(label, profile, isCanonical)}`,
    `Words to avoid: ${roleBannedWords(profile, isCanonical).slice(0, 5).join(", ")}`,
    `Return valid JSON array only, no markdown:\n[\n  { "style": "SHARP", "text": "..." },\n  { "style": "AUTHORITY", "text": "..." },\n  { "style": "STORY", "text": "..." },\n  { "style": "CURIOSITY", "text": "..." },\n  { "style": "DIRECT", "text": "..." }\n]`,
  ].filter(Boolean).join("\n\n");

  const goalLine = goal?.trim() ? `\nGoal: ${goal.trim()}` : "";
  return { system, user: `Topic: ${topic}\nRole: ${label}${goalLine}` };
}

// ---------------------------------------------------------------------------
// POST FROM HOOK - for /api/generate/post
// ---------------------------------------------------------------------------
export function buildPostFromHookPrompt(
  hook: string,
  topic: string,
  role: string,
  format: PostFormat,
  goal?: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);
  const formatRule = FORMAT_RULES[format];
  const wordTargets: Record<PostFormat, string> = {
    short: "roughly 150-200 words",
    medium: "roughly 250-350 words",
    long: "roughly 400-500 words",
  };

  const system = [
    `You are writing a LinkedIn post for a ${label}, starting from an opening line they chose.`,
    `${roleVoiceBlock(label, profile, isCanonical)}\n\n${ROLE_IS_NOT_EXPERIENCE}`,
    authorContext(voiceProfile),
    `Vocabulary that fits this work: ${isCanonical ? profile.vocabulary.slice(0, 10).join(", ") : roleVocabularyLine(label, profile, isCanonical)}`,
    `Words this person would not use: ${roleBannedWords(profile, isCanonical).join(", ")}`,
    WRITING_POLICY,
    LANGUAGE_RULE,
    LINKEDIN_POSITIONING_RULES,
    POST_TASK_RULES,
    [
      "THIS POST:",
      `- Target length ${wordTargets[format]}. ${formatRule.lineGuidance}`,
      "- The first line must be exactly the opening provided, word for word.",
      "- Continue where that opening actually leads. If the opening promises something specific, deliver it.",
    ].join("\n"),
    goal ? `GOAL OF THIS POST: ${goal}` : "",
    "Output the post only.",
  ].filter(Boolean).join("\n\n");

  const user = `Opening line to use verbatim as the first line: "${hook}"\n\nTopic: ${topic}\nRole: ${label}`;
  return { system, user };
}

export function buildPostWithReplacedHookPrompt(
  hook: string,
  post: string,
  role: string,
  goal?: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);

  const system = [
    `You are swapping the opening line of an existing LinkedIn post by a ${label}. Everything else stays.`,
    `${roleVoiceBlock(label, profile, isCanonical)}\n\n${ROLE_IS_NOT_EXPERIENCE}`,
    authorContext(voiceProfile),
    [
      "TASK:",
      "- The first line must be exactly the new opening, word for word.",
      "- Keep the existing body, meaning, examples, close, hashtags and length.",
      "- Adjust at most the first line or two of the body so the new opening connects.",
      "- Do not invent new facts, numbers, client stories or outcomes.",
      "- Do not turn this into a new post.",
    ].join("\n"),
    MECHANICAL_RULES,
    GROUNDING_RULES,
    LANGUAGE_RULE,
    goal ? `GOAL OF THIS POST: ${goal}` : "",
    "Output the revised post only.",
  ].filter(Boolean).join("\n\n");

  const user = `New opening line, to be used verbatim as the first line: "${hook}"\n\n${sourceMaterial("The existing post", post)}`;
  return { system, user };
}

// ---------------------------------------------------------------------------
// 7-METRIC SCORE - for /api/generate/score
// The dimension names are part of the API response contract consumed by the
// writer UI, so they stay. What changed is what each one rewards.
// ---------------------------------------------------------------------------
export function build7MetricScorePrompt(
  post: string,
  role: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);
  const voiceEvidence = voiceGuidance(voiceProfile, { sampleCount: 2, sampleChars: 400 });

  const voiceFitDimension = voiceEvidence
    ? `7. VOICE_FIT: does it match the author's own voice below.\n${voiceEvidence}\n   90+: reads as this person. 70-89: mostly, with off-notes. Below 50: a different person entirely, or a personality invented to fill the gap.`
    : `7. VOICE_FIT: does it read as one consistent person who works as a ${label}, in plain language, without a manufactured persona. With no voice samples on file, plain and specific scores well. Performed personality scores badly.`;

  const system = [
    `You score a LinkedIn post written for a ${label} on 7 dimensions, 0-100 each. Be strict. An ordinary competent post is 55-70. 90 is rare.`,
    "You are judging whether a specific person said something worth reading, not whether the post matches a template. Calm, plain and useful can score high. Dramatic, punchy and empty cannot.",
    authorContext(voiceProfile),
    LINKEDIN_POSITIONING_RULES,
    [
      "DIMENSIONS:",
      "",
      "1. HOOK: does the first line make the subject worth reading about. A plain factual opening about something interesting scores well. Manufactured drama that the post does not pay off scores badly.",
      "",
      "2. READABILITY: mobile reading experience. Spacing and sentence length that match the content. Neither a wall of text nor every line broken out for effect.",
      "",
      "3. AUTHORITY: is there real substance, and does it serve the intended audience. Generic advice anyone could have written scores low regardless of how confident it sounds.",
      "",
      "4. SPECIFICITY: concrete detail the reader can picture. Detail must be supplied or general knowledge. Invented numbers, clients or results score 0 on this dimension and drag HUMAN_LIKENESS down with them.",
      "",
      "5. CTA: the close. Earned and specific, or an honest stop, both score well. Engagement bait, keyword requests, or a generic question tacked on score low. A post with no closing line is not penalised when it ends on a complete thought.",
      "",
      "6. HUMAN_LIKENESS: does it read as a person writing, not content being produced. Penalise stock openers, sentences that only announce the next sentence, tidy closing summaries, forced profundity, repeated rhetorical patterns, and unsupported personal claims. Do not penalise ordinary professional vocabulary used correctly, longer sentences, or bullets where the content is genuinely a list. Deduct 15 for each long dash character (em dash or en dash).",
      "",
      voiceFitDimension,
    ].join("\n"),
    `Respond with valid JSON only, no markdown:\n{\n  "hook": number,\n  "readability": number,\n  "authority": number,\n  "specificity": number,\n  "cta": number,\n  "human": number,\n  "voiceFit": number,\n  "overall": number,\n  "tips": {\n    "hook": "one specific action",\n    "readability": "one specific action",\n    "authority": "one specific action",\n    "specificity": "one specific action",\n    "cta": "one specific action",\n    "human": "one specific action",\n    "voiceFit": "one specific action"\n  },\n  "hashtags": ["#tag1", "#tag2", "#tag3"]\n}\noverall = arithmetic mean of all 7, rounded.`,
  ].filter(Boolean).join("\n\n");

  const user = sourceMaterial(`The post to score, written for a ${label}`, post);
  return { system, user };
}

// ---------------------------------------------------------------------------
// IMPROVE - for /api/generate/improve
//
// This used to be buildPushTo90Prompt: "rewrite so it scores 90+ on EVERY
// single quality dimension. Be aggressive. Do not hold back." Chasing a score
// on all seven dimensions at once is exactly the instruction that flattens a
// draft into the house style, so the pass now works from the weakest
// dimensions and the scorer's own tips, and is told to leave the rest alone.
// ---------------------------------------------------------------------------
export function buildImprovePrompt(
  post: string,
  scores: Record<string, unknown>,
  role: string,
  voiceProfile?: VoiceProfile,
  defects: Defect[] = []
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);

  const numeric = Object.entries(scores)
    .filter(([key]) => key !== "overall" && key !== "tips" && key !== "hashtags")
    .filter((entry): entry is [string, number] => typeof entry[1] === "number");
  const weakest = [...numeric].sort((a, b) => a[1] - b[1]).slice(0, 3);
  const tips = scores.tips && typeof scores.tips === "object" && !Array.isArray(scores.tips)
    ? scores.tips as Record<string, string>
    : {};

  const focus = weakest.length
    ? weakest.map(([key, value]) => `- ${key} (${value}/100)${tips[key] ? `: ${tips[key]}` : ""}`).join("\n")
    : "- No scores available. Improve only what is clearly weak, and leave the rest.";

  const system = [
    `You are improving a LinkedIn post for a ${label}. Improve the weak parts. Leave the rest exactly as it is.`,
    `${roleVoiceBlock(label, profile, isCanonical)}\n\n${ROLE_IS_NOT_EXPERIENCE}`,
    authorContext(voiceProfile),
    `WHERE THIS DRAFT IS WEAKEST. Work on these and nothing else:\n${focus}`,
    defects.length ? `Objective problems to fix as well:\n${repairBrief(defects)}` : "",
    [
      "HOW TO IMPROVE IT:",
      "- Rewriting the whole post to raise every score is the wrong move. It produces the polished, interchangeable text this product exists to avoid.",
      "- Keep every fact, number, name and specific detail. Never add a personal claim, metric, client, employer, event or outcome that is not already there.",
      "- If a dimension scores low because the draft lacks a fact you do not have, improve what you can and leave that gap alone. Do not fill it with an invented example.",
      "- Keep the author's voice, including phrasing that is theirs rather than yours.",
      "- A post that ends up better on two dimensions and unchanged on five is a success.",
    ].join("\n"),
    `Words this person would not use: ${roleBannedWords(profile, isCanonical).join(", ")}`,
    WRITING_POLICY,
    LANGUAGE_RULE,
    LINKEDIN_POSITIONING_RULES,
    "Output the improved post only.",
  ].filter(Boolean).join("\n\n");

  return { system, user: post };
}


// ---------------------------------------------------------------------------
// CTA ALTERNATIVES - for /api/generate/cta-alternatives
// ---------------------------------------------------------------------------
export function buildCtaAlternativesPrompt(
  post: string,
  role: string
): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = [
    `You write alternative closing lines for a LinkedIn post by a ${label}.`,
    [
      "A good close:",
      "- Follows from what the post actually said. It is not bolted on.",
      "- Can be a statement, a specific question, a next step, or simply the last real thing worth saying.",
      "- Is not a generic prompt (\"What do you think?\", \"Drop a comment below\") and is not engagement bait.",
      "- Does not summarise the post back to the reader.",
      "- Makes no claim about the author's experience that the post has not already established.",
      "Give three genuinely different closes, not one close reworded. They may differ in length.",
    ].join("\n"),
    MECHANICAL_RULES,
    GROUNDING_RULES,
    LANGUAGE_RULE,
    `Return valid JSON only, a flat array of exactly 3 strings:\n["...", "...", "..."]`,
  ].join("\n\n");

  const user = sourceMaterial("The post that needs a new close", post);
  return { system, user };
}

// ---------------------------------------------------------------------------
// HOOK ALTERNATIVES - for /api/generate/hook-alternatives
// ---------------------------------------------------------------------------
export function buildHookAlternativesPrompt(
  post: string,
  role: string
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);
  const existingHook = post.split("\n").find((l) => l.trim())?.trim() || "";

  const system = [
    `You write alternative opening lines for a LinkedIn post by a ${label}.`,
    existingHook ? `The current opening is: "${existingHook}"` : "",
    "Write 3 alternatives for this same post. Each must take a different route into the subject, not reword the current opening. Each must fit the post that follows it, and must not promise anything the post does not deliver.",
    MECHANICAL_RULES,
    GROUNDING_RULES,
    LANGUAGE_RULE,
    HOOK_TASK_RULES,
    `Register to match: ${roleVoiceHeadline(label, profile, isCanonical)}`,
    `Return valid JSON only:\n[\n  { "style": "SHARP", "text": "..." },\n  { "style": "STORY", "text": "..." },\n  { "style": "CURIOSITY", "text": "..." }\n]`,
  ].filter(Boolean).join("\n\n");

  const user = sourceMaterial("The full post", post);
  return { system, user };
}
