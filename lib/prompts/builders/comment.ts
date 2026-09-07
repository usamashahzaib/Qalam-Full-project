// lib/prompts/builders/comment.ts
// The one comment prompt. Both the in-app comment generator
// (app/api/comments/generate) and the browser extension
// (app/api/extension/comments) used to carry their own copy, and they had
// drifted: the extension dropped the voice profile entirely and the app copy
// hard-capped every comment at ~35 words, which made all three variants come
// out the same shape.

import type { VoiceProfile } from "../role-profiles";
import { REPLY_POLICY, LANGUAGE_RULE, authorContext, fitSourceText, sourceMaterial } from "../writing-policy";
import { type Defect, repairBrief } from "../output-checks";

export const COMMENT_STYLES = ["insightful", "supportive", "engaging"] as const;
export type CommentStyle = (typeof COMMENT_STYLES)[number];

/**
 * The whole post the caller accepts. Comments used to be generated from
 * postText.slice(0, 1200) while the route accepted 5000 characters, so the
 * model routinely never saw the point the author was making. There is no
 * budget reason for the gap: 5000 characters is roughly 1300 tokens.
 */
export const COMMENT_SOURCE_BUDGET = 5000;

export const MAX_COMMENT_CHARS = 400;

// Intent, not a sentence formula. The old guides prescribed shape
// ("react to the post, THEN ask one follow-up question"), which is why every
// engaging comment came out as the same two-clause sentence.
const STYLE_INTENT: Record<CommentStyle, string> = {
  insightful:
    "Contribute one thing the author did not say: a consequence they did not mention, a case where it works differently, a relevant detail from your own area. One idea, said plainly. It does not have to sound profound, and a small concrete point beats a grand one.",
  supportive:
    "Respond warmly to something specific in the post. Say what actually landed and why. Simple and short is correct here. Do not inflate it into a lesson or add advice they did not ask for.",
  engaging:
    "Ask something you would genuinely want the answer to, arising from a specific thing they wrote. If the post does not raise an open question, react to a detail first and ask the smaller question that follows from it. Do not interrogate them, and do not ask something the post already answered.",
};

export interface CommentPromptInput {
  postText: string;
  style: CommentStyle;
  /** Coarse role label from the UI selector. Used only when no richer context exists. */
  profileLabel?: string;
  voiceProfile?: VoiceProfile | null;
  variants: number;
  /** Set on a repair pass. Fix only these. */
  defects?: Defect[];
  previousAttempt?: string[];
}

export function buildCommentPrompt(input: CommentPromptInput): { system: string; user: string } {
  const { postText, style, profileLabel, voiceProfile, variants, defects = [], previousAttempt = [] } = input;

  const fitted = fitSourceText(postText, COMMENT_SOURCE_BUDGET);
  const author = authorContext(voiceProfile, profileLabel ? `A ${profileLabel}. Nothing more is known about them, so do not assume any specific experience, employer, client or achievement.` : undefined);

  const system = [
    `You are writing LinkedIn comments as one specific person, replying to someone else's post.`,
    author,
    `THE STYLE THEY PICKED: ${style}\n${STYLE_INTENT[style]}`,
    REPLY_POLICY,
    LANGUAGE_RULE,
    [
      "THE SET OF COMMENTS:",
      `- Write exactly ${variants} comments in the ${style} style.`,
      "- Each one is a different thought about the post. Different thing noticed, different angle, different reason to reply. Rewording the same comment three times does not count.",
      "- Let them differ in length and rhythm too. One can be a single short line and another two or three sentences, if that is what the thought needs.",
      `- Keep each comment under ${MAX_COMMENT_CHARS} characters. Comments are short by nature, not by rule.`,
      "- No hashtags. No emoji unless the author's own samples show they use them.",
    ].join("\n"),
    defects.length
      ? `A previous attempt had these problems. Fix exactly these and keep everything that was already fine:\n${repairBrief(defects)}`
      : "",
    previousAttempt.length
      ? `The previous attempt, for reference:\n${previousAttempt.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "",
    `Return JSON only: {"comments":[{"text":"string"}]}`,
  ].filter(Boolean).join("\n\n");

  const user = [
    sourceMaterial("The post being commented on", fitted.text),
    fitted.truncated
      ? "The middle of this post was omitted to fit. Comment on what you can actually see, and do not guess at the removed part."
      : "",
    `Write ${variants} ${style} comments on this post.`,
  ].filter(Boolean).join("\n\n");

  return { system, user };
}

// ---------------------------------------------------------------------------
// REPLIES IN A THREAD - /api/generate/replies
//
// Replying to a comment on your own post, or to a reply on your own comment.
// The route used to build this prompt inline, capping the original post at 400
// characters and asking for a fixed trio: "one warm/personal, one
// authoritative/insightful, one question-based". That is three sentence
// formulas, which is why the three options always came back in the same shapes
// regardless of what the other person actually said.
// ---------------------------------------------------------------------------

export const REPLY_SOURCE_BUDGET = 2500;

export interface ReplyPromptInput {
  /** The comment or reply this person is responding to. Always present. */
  target: string;
  /** The author's own post the thread hangs off, when available. */
  originalPost?: string;
  /** The author's own comment, when replying to a reply on it. */
  parentComment?: string;
  mode: "comment" | "reply";
  roleLabel?: string;
  voiceProfile?: VoiceProfile | null;
  variants: number;
}

export function buildReplyPrompt(input: ReplyPromptInput): { system: string; user: string } {
  const { target, originalPost, parentComment, mode, roleLabel, voiceProfile, variants } = input;

  const author = authorContext(
    voiceProfile,
    roleLabel ? `A ${roleLabel}. Nothing more is known about them, so do not assume any specific experience, employer, client or achievement.` : undefined
  );

  const situation = mode === "reply"
    ? "Someone replied to your comment. You are answering them inside that thread."
    : "Someone commented on your post. You are replying to them.";

  const system = [
    `You are writing replies as one specific person, inside a LinkedIn thread on their own post.`,
    situation,
    author,
    REPLY_POLICY,
    LANGUAGE_RULE,
    [
      "THE SET OF REPLIES:",
      `- Write exactly ${variants} replies.`,
      "- Each is a different genuine response to what this person said. Different replies exist because there are different things worth saying, not because a warm one, a knowledgeable one and a question-shaped one are always required.",
      "- If a question does not follow naturally from what they wrote, do not ask one.",
      "- Where they asked something, answer it. Do not thank them and change the subject.",
      "- Vary the length. Some replies are one line.",
      `- Label each with a short style word that describes what you actually wrote, not a category you were assigned.`,
      "- No hashtags. No engagement bait. No pitching anything.",
    ].join("\n"),
    `Return JSON only: {"replies":[{"style":"string","reply":"string"}]}`,
  ].filter(Boolean).join("\n\n");

  // The author's own post is context for what they can credibly say next. It is
  // budgeted generously because a reply that contradicts the post it hangs off
  // is worse than a slightly longer prompt.
  const fittedPost = originalPost ? fitSourceText(originalPost, REPLY_SOURCE_BUDGET) : null;

  const user = [
    fittedPost ? sourceMaterial("Your own post, for context", fittedPost.text) : "",
    parentComment ? sourceMaterial("Your own comment they are replying to", parentComment) : "",
    sourceMaterial(mode === "reply" ? "The reply you received" : "The comment you are replying to", target),
    `Write ${variants} replies.`,
  ].filter(Boolean).join("\n\n");

  return { system, user };
}
