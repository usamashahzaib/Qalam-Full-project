// Frozen copy of the comment prompt as it existed before this change.
//
// This is not live code and nothing in lib/ imports it. It exists so the live
// evaluation can put the old output and the new output side by side, unlabelled,
// for a human to rate. Without a baseline, "the new prompt looks better" is an
// opinion about a prompt rather than a comparison of outputs.
//
// Reproduced from app/api/comments/generate/route.ts at commit deaf4c9,
// including the 1200-character truncation, which is the behaviour under test.

export const BASELINE_VARIATIONS = 3;

const BASELINE_STYLE_GUIDES: Record<string, string> = {
  insightful: "Add ONE sharp, specific observation or angle that builds on the post. One point, not a lecture.",
  supportive: "Genuine, warm encouragement in their own words. Specific about what landed. Not gushing.",
  engaging: "React to the post, then ask ONE natural follow-up question. Casual, not interview-style.",
};

export interface BaselineVoice {
  tone?: string;
  sentenceLength?: string;
  vocabulary?: string[];
  patterns?: string[];
  examples?: string[];
}

export function baselineCommentPrompt(input: {
  postText: string;
  style: string;
  profile: string;
  voiceProfile?: BaselineVoice;
  professionalContext?: string;
}): { system: string; user: string } {
  const { postText, style, profile, voiceProfile, professionalContext = "" } = input;

  const voiceBlock = voiceProfile
    ? `WRITE IN THIS PERSON'S OWN VOICE:
Tone: ${voiceProfile.tone || "natural and direct"}
Typical sentence length: ${voiceProfile.sentenceLength || "short"}
Phrases they actually use (weave in only where it fits naturally): ${(voiceProfile.vocabulary ?? []).join(", ") || "none on file"}
Speech patterns: ${(voiceProfile.patterns ?? []).join(", ") || "none on file"}${
        voiceProfile.examples?.length
          ? `\n\nHOW THEY ACTUALLY WRITE (match the rhythm and word choice, do NOT copy the content):\n${voiceProfile.examples.slice(0, 3).map((ex) => `- ${ex.replace(/\s+/g, " ").trim().slice(0, 280)}`).join("\n")}`
          : ""
      }`
    : "";

  const system = `You help a real person write short, authentic LinkedIn comments on someone else's post. You are NOT writing a post or a paragraph - you are writing a quick human reply that sounds like this person dashed it off in ten seconds.

WHO THIS PERSON IS:
${professionalContext || `A ${profile}.`}

${voiceBlock}

Write exactly ${BASELINE_VARIATIONS} comments, all in ONE style the person chose: "${style}".
${style} means: ${BASELINE_STYLE_GUIDES[style]}
Give ${BASELINE_VARIATIONS} genuinely different takes on this one style - different angle, opening, and wording each time. Not minor rewrites of the same sentence.

HARD RULES (breaking these makes it read as AI):
- Each comment is 1 to 2 sentences and never more than ~35 words. Short is the entire point.
- Sound like a person typing on their phone. Contractions, plain words, a real reaction.
- React to the SPECIFIC thing in this post - reference an actual detail from it. No generic praise.
- Do not restate the post back at them. Add something of your own.
- No em dashes and no en dashes. Use a plain hyphen or split into two sentences.
- Never use these words: delve, leverage, elevate, seamless, unlock, empower, resonate, insightful, thought-provoking, holistic, game-changer.
- Never use these filler openers: "Great post", "Well said", "Couldn't agree more", "Spot on", "This resonates", "Thanks for sharing", "Love this", "As a ${profile}".
- No hashtags. No emoji.

Return JSON only, no other text: { "comments": [{ "text": "string" }] }`;

  // The bug under test: the route accepted 5000 characters and sent 1200.
  const user = `Post to comment on:\n${postText.slice(0, 1200)}`;

  return { system, user };
}
