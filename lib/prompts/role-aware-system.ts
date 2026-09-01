// lib/prompts/role-aware-system.ts
// Qalam content engine - role-aware, human-sounding, anti-AI-tell.
// 3-pass pipeline (generate -> humanize -> score/rewrite) feeds from here.
// Role profiles live in ./role-profiles - add a new role there.

export type { PostFormat, VoiceProfile, RoleProfile } from "./role-profiles";
export { ROLE_PROFILES, GENERIC_PROFILE, resolveRoleProfile } from "./role-profiles";

import type { PostFormat, VoiceProfile, RoleProfile } from "./role-profiles";
import { GENERIC_PROFILE, resolveRoleProfile } from "./role-profiles";
import { GENERATE_CRITICAL_RULES } from "./builders/generate";
import { HOOKS_CRITICAL_RULES } from "./builders/hooks";
import { professionalContextPrompt } from "@/lib/professional-context";

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
  return "(No canned examples for this profession - invent hooks that sound like a real person in this line of work, not a template.)";
}

function roleBannedWords(profile: RoleProfile, isCanonical: boolean): string[] {
  return isCanonical ? profile.banned : GENERIC_PROFILE.banned;
}

// ---------------------------------------------------------------------------
// FORMAT CONSTRAINTS
// ---------------------------------------------------------------------------
const FORMAT_RULES: Record<PostFormat, { charLimit: number; lineGuidance: string }> = {
  short: {
    charLimit: 600,
    lineGuidance:
      "Maximum 5-6 lines total. Hook + 2-3 punchy lines + one CTA. No space to waste. Each line must carry weight.",
  },
  medium: {
    charLimit: 1400,
    lineGuidance:
      "8-12 lines. Hook, 3-4 lines of substance, one brief concrete detail or number, CTA. One blank line between each section.",
  },
  long: {
    charLimit: 2800,
    lineGuidance:
      "15-25 lines. Full story arc: hook, context, the thing that happened, what you learned, one specific takeaway, CTA. Blank lines for breath. Mobile-first - no paragraph walls.",
  },
};

// ---------------------------------------------------------------------------
// GLOBAL ANTI-AI-TELL RULES (injected into every pass)
// ---------------------------------------------------------------------------
const ANTI_AI_RULES = `
ABSOLUTE RULES - NEVER BREAK THESE:
- ZERO em dashes (—) and ZERO en dashes (–). These Unicode characters are completely banned. Use a plain hyphen (-) or split into two sentences. This rule has no exceptions.
- Never open with "In today's", "In the world of", "Let's dive in", "I'm excited to share", "As a [role]", "It's no secret".
- Never use: delve, leverage (as a verb), elevate, seamless, unlock, empower, supercharge, revolutionize, paradigm, holistic, ecosystem, synergy, cutting-edge, game-changer, thought leader, passionate.
- No three-item lists that are perfectly parallel ("X, Y, and Z" at the end of every thought). It reads like a template.
- No generic question as the last line. Ban "What do you think?", "Have you experienced this?", and "Are you ready?" A specific question about the reader's real experience is allowed when it is earned.
- No rhyming or near-rhyming at sentence ends.
- No bullet points or numbered lists in the post body. Write in sentences.
- Never summarise the post in the final line. End on the insight or the action, not "and that's why X matters."
- Hashtags at the very end only. 0-3 maximum. No hashtag mid-sentence.
`.trim();

export const LINKEDIN_POSITIONING_RULES = `
LINKEDIN POSITIONING AND TRUST RULES:
- Treat profile, content, and audience as one system. When professional context is available, write for one named audience and reinforce one saved content pillar.
- Every post needs one intent: Authority, Personal, or Offer. Authority teaches from earned expertise. Personal reveals a true moment, belief, or behind-the-scenes lesson. Offer connects a real problem to a relevant service or next step.
- Use only supplied personal facts and proof. Never invent a client, employer, metric, credential, event, quote, or first-person experience.
- Create reading momentum through a specific opening, an earned payoff, and mobile-friendly spacing. Do not claim that any format or tactic guarantees reach.
- Invite meaningful conversation without engagement bait. Never ask readers to comment a keyword, tag friends, join a pod, or engage only to receive something.
- Prefer 0-3 precise topic hashtags. Do not pad the post with broad or unrelated tags.
`.trim();

// ---------------------------------------------------------------------------
// PASS 1 - GENERATE PROMPT
// This is what you send to Groq first. temperature: 0.85
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
  const professionalContext = professionalContextPrompt(voiceProfile?.professionalContext);

  const system = `
You are a LinkedIn ghostwriter. You write for a ${label}.

WHO THIS PERSON IS:
${roleVoiceBlock(label, profile, isCanonical)}

THEIR NATURAL VOCABULARY (use some of these, not all, and only where they fit):
${roleVocabularyLine(label, profile, isCanonical)}

WHAT THEY CARE ABOUT / PAIN POINTS:
${rolePainPointsLine(label, profile, isCanonical)}

${professionalContext}

CONTENT FORMATS THAT WORK FOR THEM:
${roleFormatsBlock(label, profile, isCanonical)}

EXAMPLE HOOKS IN THEIR VOICE (reference for style only - do not copy these):
${roleExampleHooksBlock(profile, isCanonical)}

WORDS THIS PERSON WOULD NEVER USE:
${roleBannedWords(profile, isCanonical).join(", ")}

${ANTI_AI_RULES}

${LINKEDIN_POSITIONING_RULES}

${GENERATE_CRITICAL_RULES}

FORMAT RULES FOR THIS POST:
Length: ${format} (max ${formatRule.charLimit} characters)
${formatRule.lineGuidance}

STRUCTURE:
Line 1: The hook. One or two sentences maximum. Must make someone stop scrolling. Concrete, specific, a little unexpected. No generic opener.
Lines 2 to end: The substance. Show the situation, the thing that happened, the specific detail. One blank line between thoughts.
Last 1-2 lines: An earned close or genuine conversation prompt. No engagement bait and no forced question.
Final line: 0-3 precise hashtags. Omit them when none are useful.

${goal ? `GOAL FOR THIS POST: ${goal}` : ""}

${
  voiceProfile
    ? `MATCH THIS PERSON'S VOICE CLOSELY:
Tone: ${voiceProfile.tone ?? "not specified"}
Sentence length: ${voiceProfile.sentenceLength ?? "not specified"}
Formatting: ${voiceProfile.formatting ?? "not specified"}
Emoji usage: ${voiceProfile.emojiUsage ?? "none"}
Their vocabulary and phrases to weave in: ${(voiceProfile.vocabulary ?? []).join(", ")}
Patterns they use: ${(voiceProfile.patterns ?? []).join(", ")}${
  voiceProfile.examples?.length
    ? `\n\nEXAMPLE POSTS WRITTEN BY THIS PERSON (study the rhythm, structure, and voice - do NOT copy content):\n${voiceProfile.examples.map((ex, i) => `--- Example ${i + 1} ---\n${ex}`).join("\n\n")}`
    : ""
}`
    : ""
}

Write one post only. No explanation, no preamble, no "here is your post:". Just the post.
`.trim();

  const user = `Write a LinkedIn post about: ${topic}

Role: ${label}
Format: ${format}
${goal ? `Goal: ${goal}` : ""}

Remember: First line must be the hook. Real, specific, and a little surprising. Use only supplied personal facts. No AI tells. No em dashes. No generic openers.`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// PASS 2 - HUMANIZE PROMPT
// Feed this the output of Pass 1. temperature: 0.4 (low - we want precise edits not creativity)
// ---------------------------------------------------------------------------
export function buildHumanizePrompt(rawPost: string, role: string): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = `
You are an editor who removes AI tells from LinkedIn posts. You make them sound like a real person wrote them.

You do NOT rewrite the post. You make the minimum edits needed to remove robot patterns.

WHAT TO FIX:
1. Em dashes (-) and en dashes (-): Replace with a hyphen (-) or split into two sentences.
2. Perfect parallel structure in triplets: If three items end a thought cleanly, break one of them.
3. Overly smooth sentence rhythm: Vary it. Mix very short sentences (3-5 words) with longer ones. Real people don't write in perfectly balanced clauses.
4. AI vocabulary: Remove or replace any of these: delve, leverage (as a verb), elevate, seamless, unlock, empower, supercharge, revolutionize, paradigm, holistic, ecosystem, synergy, cutting-edge, game-changer, thought leader, passionate, fostering, navigating, harnessing, transformative.
5. Opening cliches: If the post opens with "In today's", "As a ${label}", "It's no secret", "I'm excited to", "Let's talk about" - rewrite just the first line.
6. Generic closing questions: If the last non-hashtag line is "What do you think?" or "Have you experienced this?" or similar, replace it with a statement or quiet observation.
7. Overly neat endings: If the last line summarises the post ("and that's why X is important"), cut or reframe it.
8. Robotic hashtags mid-sentence: Move all hashtags to the very last line.

WHAT TO KEEP:
- The structure and story arc exactly as written
- The voice and vocabulary that matches ${label}
- Any specific numbers, names, or concrete details
- Line breaks and white space - do not collapse the post
- The CTA if it sounds natural

${ANTI_AI_RULES}

${LINKEDIN_POSITIONING_RULES}

Output the edited post only. No commentary. No "here's the edited version:". Just the post.
`.trim();

  const user = rawPost;

  return { system, user };
}

// ---------------------------------------------------------------------------
// PASS 3 - SCORE PROMPT (paid users only)
// Feed this the Pass 2 output. temperature: 0.2 (we want consistent, reliable scores)
// ---------------------------------------------------------------------------
export function buildScorePrompt(post: string, role: string): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = `
You are a LinkedIn content quality evaluator. You score posts for ${label}s on 5 dimensions.

Score each dimension 0-100. Be harsh. A 90 should be rare. An average post scores 55-65.

DIMENSIONS:

1. HOOK SCORE: Does the first line make you stop scrolling? Is it specific and concrete? Does it avoid cliches?
   - 90+: Genuinely surprising, specific, you want to read the next line immediately
   - 70-89: Good but slightly predictable
   - 50-69: Generic opener that most people scroll past
   - Below 50: AI opener, cliche, or tells you what the post is about before showing you

2. AUTHENTICITY SCORE: Does it sound like a real ${label} wrote this, or like AI pretending?
   - 90+: Could not tell it was AI-assisted. Specific details, natural voice, real opinions
   - 70-89: Mostly real-sounding, one or two tells
   - 50-69: Some AI patterns visible - smooth transitions, perfect structure, vague specifics
   - Below 50: Clearly AI - em dashes, "leverage", "seamless", or robot-perfect sentences

3. SPECIFICITY SCORE: Are there concrete details (supplied numbers, names, exact situations) or only generalities?
   - 90+: Reader can picture the exact situation without any invented personal proof
   - 70-89: Some specifics but also some vague sections
   - 50-69: Mostly general advice with no grounding detail
   - Below 50: Pure generality - could apply to any person in any situation

4. ENGAGEMENT QUALITY SCORE: Does this give the intended audience a reason to pause, remember the author, or respond meaningfully?
   - 90+: Clear audience, useful payoff, and a specific point worth discussing
   - 70-89: Relevant but slightly broad
   - 50-69: Useful to almost anyone, so it strengthens no clear position
   - Below 50: Unrelated to the author's credible expertise or target audience

5. FORMATTING SCORE: Is it readable on LinkedIn mobile? White space, line breaks, no paragraph walls?
   - 90+: Perfect rhythm - short lines, blank lines between thoughts, easy to scan
   - 70-89: Mostly good, one section too dense
   - 50-69: Some paragraph walls or inconsistent spacing
   - Below 50: Wall of text or very choppy single words

ALSO CHECK:
- Em dashes or en dashes present? Deduct 15 points from authenticity score.
- AI vocabulary (delve, leverage, seamless, etc.) present? Deduct 10 points from authenticity score per instance.
- Generic opening ("In today's", "Let's dive in", etc.)? Deduct 20 points from hook score.

Respond ONLY with valid JSON in this exact shape. No extra text, no markdown:
{
  "hook_score": number,
  "authenticity_score": number,
  "specificity_score": number,
  "engagement_score": number,
  "formatting_score": number,
  "total_score": number,
  "is_good_enough": boolean,
  "biggest_weakness": "one specific sentence about the main problem",
  "fix_instruction": "one specific, actionable instruction to fix the biggest weakness"
}

total_score = average of the 5 scores, rounded to nearest integer.
is_good_enough = total_score >= 82.
`.trim();

  const user = `Score this LinkedIn post written for a ${label}:\n\n${post}`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// PASS 3B - REWRITE WITH FEEDBACK PROMPT
// Use when score < 82. Feed score output into this. temperature: 0.7
// ---------------------------------------------------------------------------
export function buildRewritePrompt(
  post: string,
  fixInstruction: string,
  biggestWeakness: string,
  role: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = `
You are rewriting a LinkedIn post for a ${label}. One specific problem has been identified. Fix only that problem.

KEEP:
- The story, structure, and content arc exactly
- The specific numbers, names, and details
- The voice and vocabulary that already works
- The hashtags

CHANGE:
Only what the fix instruction says. Do not improve everything - that creates over-polished AI text. Fix the weak spot.

PROBLEM IDENTIFIED: ${biggestWeakness}

FIX INSTRUCTION: ${fixInstruction}

${ANTI_AI_RULES}

${
  voiceProfile?.vocabulary?.length
    ? `VOICE: Weave in these signature phrases where natural: ${voiceProfile.vocabulary.join(", ")}`
    : ""
}

Output the rewritten post only. No commentary. No "here's the rewrite:". Just the post.
`.trim();

  const user = post;

  return { system, user };
}

// ---------------------------------------------------------------------------
// TOPIC SUGGESTION PROMPT (for the blank-page-killer feature)
// Call this on load to give the user 3 ready topics. temperature: 0.9
// ---------------------------------------------------------------------------
export function buildTopicSuggestionsPrompt(
  role: string,
  recentTopics: string[] = []
): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = `
You generate LinkedIn post topic ideas for ${label}s in Pakistan.

${LINKEDIN_POSITIONING_RULES}

Topics must be:
- Specific enough to write about immediately (not "talk about your experience")
- Based on real pain points this role has
- Varied in format (one story-based, one observation-based, one contrarian take)
- Relevant to Pakistani professional context where appropriate (local market, remote work realities, freelance economy)

Return ONLY a valid JSON array of exactly 3 strings. No explanation. No markdown. No other text.
Example: ["Topic idea one", "Topic idea two", "Topic idea three"]

${recentTopics.length > 0 ? `Do NOT suggest topics similar to these recent ones: ${recentTopics.join(", ")}` : ""}
`.trim();

  const user = `Give me 3 LinkedIn post topic ideas for a ${label} in Pakistan.`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// HOOK VARIANTS PROMPT (for hook cards feature)
// Generates 3 different hook styles for the same topic. temperature: 0.9
// ---------------------------------------------------------------------------
export function buildHookVariantsPrompt(
  topic: string,
  role: string
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);

  const system = `
You write LinkedIn post opening lines (hooks) for ${label}s.

${LINKEDIN_POSITIONING_RULES}

Generate 3 hooks for the same topic, each a different style:
1. STATEMENT hook: A bold or unexpected claim. Concrete and specific.
2. STORY OPENER hook: "I [did/saw/learned] X" - drops the reader into a moment.
3. CONTRARIAN hook: Challenges a common belief this role's audience holds.

${HOOKS_CRITICAL_RULES}

Additional rules:
- Maximum 2 sentences each
- Specific and concrete. If possible, include a number or a named tool/situation.
- Must fit a ${label}'s voice: ${roleVoiceHeadline(label, profile, isCanonical)}.

Return ONLY valid JSON in this exact shape. No other text:
[
  { "style": "Statement", "hook": "..." },
  { "style": "Story Opener", "hook": "..." },
  { "style": "Contrarian", "hook": "..." }
]
`.trim();

  const user = `Topic: ${topic}\nRole: ${label}`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// ENGAGEMENT PREDICTION PROMPT (vanity feature for addiction loop)
// Lightweight - use 8b model. temperature: 0.3
// ---------------------------------------------------------------------------
export function buildEngagementPredictionPrompt(post: string, role: string): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = `
You estimate LinkedIn engagement for a post in the Pakistani professional market.

Be realistic. Most posts get 10-50 reactions. A good post gets 50-200. Viral for Pakistan is 500+.

Base your estimate on:
- Hook strength (first line)
- Specificity and relatability
- Whether it invites identification ("this is me") or comment
- Format and readability

Return ONLY valid JSON. No other text:
{
  "estimated_reactions": number,
  "estimated_comments": number,
  "confidence": "low" | "medium" | "high",
  "reason": "one sentence explaining the main factor driving or limiting engagement"
}
`.trim();

  const user = `Post written for a ${label} in Pakistan:\n\n${post}`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// BACKWARD-COMPAT SHIMS
// content-generator.ts and app/api/hooks/route.ts import these.
// They wrap the new profile structure into a flat system-prompt string.
// ---------------------------------------------------------------------------
export function getSystemPrompt(role: string, voiceProfile?: VoiceProfile, goal?: string): string {
  const { profile, label, isCanonical } = resolveRoleProfile(role);
  const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

  let prompt = `You are writing a LinkedIn post as a ${label}.

Voice:
${roleVoiceBlock(label, profile, isCanonical)}

Role-specific vocabulary:
${isCanonical ? list(profile.vocabulary) : roleVocabularyLine(label, profile, isCanonical)}

Pain points this person cares about:
${isCanonical ? list(profile.painPoints) : rolePainPointsLine(label, profile, isCanonical)}

Content formats this role uses:
${isCanonical ? list(profile.formats) : roleFormatsBlock(label, profile, isCanonical)}

Example hooks:
${isCanonical ? list(profile.exampleHooks) : roleExampleHooksBlock(profile, isCanonical)}

Never say:
${list(roleBannedWords(profile, isCanonical))}

Writing rules:
- The first line must stop the scroll.
- Use short paragraphs and line breaks for LinkedIn mobile.
- Use an earned close or a genuine conversation prompt. Never use engagement bait.
- Use 0-3 precise hashtags and omit them when they add no context.
- Stay under 3,000 characters for long, 1,500 for medium, 500 for short.
- Never use generic openers like "In today's world", "Let's dive in", or "In conclusion".
- Never use em dashes or en dashes. Use hyphens only.
- Use concrete details, mistakes, numbers, examples, and tradeoffs.
- Make the reader think: this person really knows their stuff.

${LINKEDIN_POSITIONING_RULES}`;

  if (voiceProfile) {
    prompt += `\n\nVoice guidance:
Write in a ${voiceProfile.tone ?? "natural"} tone. Use ${voiceProfile.sentenceLength ?? "varied"} sentences. Format with ${voiceProfile.formatting ?? "short paragraphs"}. Signature phrases: ${(voiceProfile.vocabulary ?? []).join(", ") || "none provided"}.`
    if (voiceProfile.examples?.length) {
      prompt += `\n\nExample posts from this person (mirror their rhythm and voice, not the content):\n${voiceProfile.examples.map((ex, i) => `[${i + 1}] ${ex}`).join("\n\n")}`
    }
  }

  if (goal) {
    prompt += `\n\nThe goal of this post is to: ${goal}`;
  }

  return prompt;
}

export const buildRoleAwareSystemPrompt = getSystemPrompt;

// ---------------------------------------------------------------------------
// EXPORTS SUMMARY (what content-generator.ts imports from here)
// ---------------------------------------------------------------------------
// buildGeneratePrompt             - Pass 1
// buildHumanizePrompt             - Pass 2
// buildScorePrompt                - Pass 3 scoring
// buildRewritePrompt              - Pass 3 rewrite when score < 80
// buildTopicSuggestionsPrompt     - blank page killer
// buildHookVariantsPrompt         - hook cards
// buildEngagementPredictionPrompt - vanity metric
// ROLE_PROFILES                   - for role selector UI (re-exported from ./role-profiles)
// GENERIC_PROFILE                 - fallback (re-exported from ./role-profiles)
// resolveRoleProfile              - free-text role -> profile resolution (re-exported from ./role-profiles)
// getSystemPrompt                 - legacy compat (content-generator.ts)
// buildRoleAwareSystemPrompt      - legacy compat (app/api/hooks/route.ts)

// ---------------------------------------------------------------------------
// CTA ALTERNATIVES - for /api/generate/cta-alternatives
// 3 alternative last-paragraph CTA lines based on existing post content.
// temperature: 0.9
// ---------------------------------------------------------------------------
export function buildCtaAlternativesPrompt(
  post: string,
  role: string
): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);

  const system = `
You write alternative call-to-action (CTA) closing lines for LinkedIn posts written for ${label}s.

A good CTA is:
- 1-2 sentences at most
- Specific and earned - it follows naturally from the story in the post
- NOT a generic question ("What do you think?", "Have you experienced this?", "Drop a comment below")
- A quiet statement, a soft challenge, a reflection, or a specific action prompt
- Feels like a real ${label} wrote it - matches their vocabulary and concerns
- No em dashes (-), no en dashes (-), no AI vocabulary

Return ONLY valid JSON - a flat array of exactly 3 strings. No other text, no markdown:
["CTA option 1", "CTA option 2", "CTA option 3"]
`.trim();

  const user = `Write 3 different CTA closing lines for this LinkedIn post. Each should take a different angle.\n\nPost:\n${post}`;
  return { system, user };
}

// ---------------------------------------------------------------------------
// 5-STYLE HOOK GENERATION - for /api/generate/hooks
// Generates one hook per style: SHARP, AUTHORITY, STORY, CURIOSITY, DIRECT
// temperature: 0.9
// ---------------------------------------------------------------------------
export function buildHook5StylesPrompt(
  topic: string,
  role: string,
  goal?: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);
  const professionalContext = professionalContextPrompt(voiceProfile?.professionalContext);

  const system = `
You write LinkedIn post opening lines for ${label}s.

${professionalContext}

${LINKEDIN_POSITIONING_RULES}

Generate exactly 5 hooks for the same topic, one per style:
1. SHARP: An uncomfortable truth or bold claim. Concrete and specific.
2. AUTHORITY: Lead with credibility, data, or hard-won experience. Shows expertise.
3. STORY: "I [did/saw/realized] X" - drops the reader into a specific moment.
4. CURIOSITY: Creates a knowledge gap. Must end as a statement, not a question.
5. DIRECT: States the value clearly. No buildup, no mystery. Pure clarity.

${HOOKS_CRITICAL_RULES}

Additional rules:
- Maximum 2 sentences per hook
- Specific and concrete. Include a number, date, or named situation only when supplied by the user or profile context
- Match this voice: ${roleVoiceHeadline(label, profile, isCanonical)}
- Words never to use: ${roleBannedWords(profile, isCanonical).slice(0, 5).join(", ")}

Return ONLY valid JSON array. No other text, no markdown, no code fences:
[
  { "style": "SHARP", "text": "..." },
  { "style": "AUTHORITY", "text": "..." },
  { "style": "STORY", "text": "..." },
  { "style": "CURIOSITY", "text": "..." },
  { "style": "DIRECT", "text": "..." }
]
`.trim();

  const goalLine = goal?.trim() ? `\nGoal: ${goal.trim()}` : "";
  const user = `Topic: ${topic}\nRole: ${label}${goalLine}`;
  return { system, user };
}

// ---------------------------------------------------------------------------
// POST FROM HOOK - for /api/generate/post
// Generates a full post that starts with the provided hook verbatim.
// temperature: 0.85
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
  const professionalContext = professionalContextPrompt(voiceProfile?.professionalContext);
  const wordTargets: Record<PostFormat, string> = {
    short: "150-200 words",
    medium: "250-350 words",
    long: "400-500 words",
  };

  const system = `
You are a LinkedIn ghostwriter for ${label}s.

${roleVoiceBlock(label, profile, isCanonical)}

${professionalContext}

Vocabulary to draw from (use some, not all): ${isCanonical ? profile.vocabulary.slice(0, 10).join(", ") : roleVocabularyLine(label, profile, isCanonical)}

${ANTI_AI_RULES}

${LINKEDIN_POSITIONING_RULES}

${GENERATE_CRITICAL_RULES}

Words never to use: ${[...roleBannedWords(profile, isCanonical), "delve", "utilize", "leverage (as verb)", "seamless", "empower"].join(", ")}

FORMAT:
- Target length: ${wordTargets[format]}
- ${formatRule.lineGuidance}
- The FIRST LINE must be exactly the hook provided - copy it word for word.
- Continue naturally from where the hook leads
- End with an earned close or genuine conversation prompt
- Use 0-3 precise hashtags on the very last line, or omit them

${goal ? `GOAL OF THIS POST: ${goal}` : ""}
${voiceProfile?.vocabulary?.length ? `VOICE PHRASES TO WEAVE IN: ${voiceProfile.vocabulary.join(", ")}` : ""}

Output the post only. No preamble, no "Here is the post:".
`.trim();

  const user = `Hook (first line - copy this verbatim): "${hook}"

Topic: ${topic}
Role: ${label}`;
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
  const professionalContext = professionalContextPrompt(voiceProfile?.professionalContext);

  const system = `
You are editing an existing LinkedIn post for a ${label}.

${roleVoiceBlock(label, profile, isCanonical)}

${professionalContext}

${ANTI_AI_RULES}

${LINKEDIN_POSITIONING_RULES}

TASK:
- Replace the opening hook only.
- The FIRST LINE must be exactly the new hook - copy it word for word.
- Preserve the existing post's body, meaning, examples, CTA, hashtags, and length.
- Lightly adjust only the first 1-2 body lines if needed so the new hook connects naturally.
- Do not invent new facts, numbers, client stories, or outcomes.
- Do not turn this into a new post.

${goal ? `GOAL OF THIS POST: ${goal}` : ""}
${voiceProfile?.vocabulary?.length ? `VOICE PHRASES TO KEEP NATURAL: ${voiceProfile.vocabulary.join(", ")}` : ""}

Output the revised post only. No commentary. No labels.
`.trim();

  const user = `New hook (first line - copy this verbatim): "${hook}"

Existing post:
${post}`;
  return { system, user };
}

// ---------------------------------------------------------------------------
// 7-METRIC SCORE - for /api/generate/score
// Returns scores for 7 dimensions plus tips and hashtag suggestions.
// temperature: 0.2
// ---------------------------------------------------------------------------
export function build7MetricScorePrompt(
  post: string,
  role: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { label } = resolveRoleProfile(role);
  const professionalContext = professionalContextPrompt(voiceProfile?.professionalContext);

  const voiceFitDimension = voiceProfile?.tone || voiceProfile?.vocabulary?.length
    ? `7. VOICE_FIT (matches the author's trained personal voice)
   Trained voice profile:
   - Tone: ${voiceProfile.tone || "not specified"}
   - Sentence length: ${voiceProfile.sentenceLength || "not specified"}
   - Signature phrases: ${(voiceProfile.vocabulary || []).join(", ") || "none"}
   - Patterns: ${(voiceProfile.patterns || []).join(", ") || "none"}
   90+: Post clearly reflects this trained voice in tone, rhythm, and signature phrases
   70-89: Mostly matches but some sections feel off-brand
   Below 50: Voice doesn't match the profile at all`
    : `7. VOICE_FIT (matches ${label} role voice)
   90+: Indistinguishable from a real ${label} - vocabulary, concerns, tone
   70-89: Close, a couple of off-notes
   Below 50: Wrong voice entirely`;

  const system = `
You score LinkedIn posts for ${label}s on 7 dimensions, 0-100 each.
Be strict. Average posts score 55-65. A 90 is rare.

${professionalContext}

${LINKEDIN_POSITIONING_RULES}

DIMENSIONS:

1. HOOK (first line quality)
   90+: Stops the scroll immediately, specific and concrete
   70-89: Decent but slightly predictable
   Below 50: Generic, AI-sounding, or tells the punchline upfront
   Deduct 20 for "In today's...", "Let's dive in", "As a ${label}"

2. READABILITY (mobile reading experience)
   90+: Perfect rhythm - short lines, blank lines between thoughts, scannable
   70-89: Mostly good, one dense section
   Below 50: Wall of text or choppy single words

3. AUTHORITY (credibility, evidence, and positioning)
   90+: Sounds grounded in supplied expertise and clearly serves the intended audience
   70-89: Mostly credible, a little vague
   Below 50: Generic advice anyone could have written

4. SPECIFICITY (concrete details)
   90+: Numbers, names, exact situations - reader can picture it
   70-89: Some specifics, some vague
   Below 50: Pure generality, no grounding detail

5. CTA (closing quality)
   90+: Earned close or genuine, specific conversation prompt with no engagement bait
   70-89: Present but generic
   Below 50: Forced engagement, keyword bait, tag requests, or an unrelated sales pitch

6. HUMAN_LIKENESS (sounds like a real person, not AI)
   90+: Zero AI tells, natural rhythm, real voice
   70-89: Mostly human, one or two tells
   Below 50: AI vocabulary, perfect parallel structure, or robot-smooth sentences
   Deduct 15 for each em dash (-) or en dash (-)
   Deduct 10 per AI word: delve, leverage (verb), seamless, elevate, empower, unlock, holistic, synergy

${voiceFitDimension}

Respond with ONLY valid JSON. No markdown, no explanation:
{
  "hook": number,
  "readability": number,
  "authority": number,
  "specificity": number,
  "cta": number,
  "human": number,
  "voiceFit": number,
  "overall": number,
  "tips": {
    "hook": "one specific action to improve this dimension",
    "readability": "one specific action to improve this dimension",
    "authority": "one specific action to improve this dimension",
    "specificity": "one specific action to improve this dimension",
    "cta": "one specific action to improve this dimension",
    "human": "one specific action to improve this dimension",
    "voiceFit": "one specific action to improve this dimension"
  },
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}
overall = arithmetic mean of all 7 scores, rounded to nearest integer.
`.trim();

  const user = `Score this LinkedIn post for a ${label}:\n\n${post}`;
  return { system, user };
}

// ---------------------------------------------------------------------------
// PUSH TO 90+ (IMPROVE) - for /api/generate/improve
// Aggressively rewrites ALL 7 dimensions to guarantee 90+ scores.
// temperature: 0.7
// ---------------------------------------------------------------------------
export function buildPushTo90Prompt(
  post: string,
  scores: Record<string, unknown>,
  role: string,
  voiceProfile?: VoiceProfile
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);
  const professionalContext = professionalContextPrompt(voiceProfile?.professionalContext);

  const dimScores = Object.entries(scores)
    .filter(([k]) => k !== "overall" && k !== "tips" && k !== "hashtags")
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `${k}: ${v}/100`)
    .join(", ");

  const system = `
You are rewriting a LinkedIn post for a ${label} so it scores 90+ on EVERY single quality dimension.

${roleVoiceBlock(label, profile, isCanonical)}

${professionalContext}

${ANTI_AI_RULES}

${LINKEDIN_POSITIONING_RULES}

BANNED WORDS (remove every instance): ${[...roleBannedWords(profile, isCanonical), "delve", "leverage (verb)", "seamless", "empower", "unlock", "holistic", "synergy"].join(", ")}

CURRENT SCORES: ${dimScores || "not yet scored"}
TARGET: ALL 7 dimensions must reach 90+. Be aggressive. Do not hold back.

WHAT 90+ REQUIRES ON EACH DIMENSION:

1. HOOK - first line must stop the scroll immediately. Start with a surprising number, a bold claim, or a real challenge. Never "In today's...", "Let's talk about", "As a ${label}".

2. READABILITY - short lines, blank lines between every thought, mobile-first. One idea per line. No wall of text longer than 2 sentences.

3. AUTHORITY - sound grounded in supplied experience. Drop generic advice, but never manufacture lived experience.

4. SPECIFICITY - make the idea concrete with supplied numbers, names, timelines, or exact situations. If none were supplied, use a clear scenario without presenting it as the author's experience.

5. CTA - end with an earned close or a specific prompt for genuine conversation. Never use keyword bait, tag requests, or a generic "What do you think?"

6. HUMAN-LIKENESS - zero AI tells. Natural rhythm. Real conversational voice. No em dashes (-), no en dashes (-), no perfect parallel structure.

7. VOICE FIT - ${voiceProfile?.tone || voiceProfile?.vocabulary?.length
    ? `Write in the author's trained voice: tone "${voiceProfile!.tone || "not specified"}", sentence length "${voiceProfile!.sentenceLength || "not specified"}". Weave in these signature phrases where natural: ${(voiceProfile!.vocabulary || []).join(", ") || "none"}.`
    : `indistinguishable from a real ${label}. Their vocabulary, their concerns, their tone.`}

KEEP:
- All specific numbers, names, and facts from the original
- The core story and content arc

NEVER add a new personal claim, metric, client, employer, event, or outcome.

Output the rewritten post ONLY. No commentary. No labels.
`.trim();

  const user = post;
  return { system, user };
}

// ---------------------------------------------------------------------------
// HOOK ALTERNATIVES - for /api/generate/hook-alternatives
// 3 alternative hooks based on existing post content.
// temperature: 0.9
// ---------------------------------------------------------------------------
export function buildHookAlternativesPrompt(
  post: string,
  role: string
): { system: string; user: string } {
  const { profile, label, isCanonical } = resolveRoleProfile(role);
  const existingHook = post.split("\n").find((l) => l.trim())?.trim() || "";

  const system = `
You write alternative opening hooks for LinkedIn posts for ${label}s.

The existing hook is: "${existingHook}"

Write 3 alternative hooks for the same post - each meaningfully different in angle, not just different words.

${HOOKS_CRITICAL_RULES}

Additional rules:
- Maximum 2 sentences each
- Specific, concrete, role-appropriate
- Match this voice: ${roleVoiceHeadline(label, profile, isCanonical)}

Return ONLY valid JSON. No other text:
[
  { "style": "SHARP", "text": "..." },
  { "style": "STORY", "text": "..." },
  { "style": "CURIOSITY", "text": "..." }
]
`.trim();

  const user = `Full post:\n\n${post}`;
  return { system, user };
}
