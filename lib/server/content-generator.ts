// lib/server/content-generator.ts
// 3-pass pipeline: Generate -> Humanize -> Score + Rewrite (paid only)
// Free users: Pass 1 + 2. Paid users: all 3 passes, up to 3 rewrite attempts.
// Cost per post: ~$0.001 on Groq. Budget neutral even at 1000 users.

import { callAi as routerCallAi } from "@/lib/server/ai-router";
import {
  buildGeneratePrompt,
  buildHumanizePrompt,
  buildScorePrompt,
  buildRewritePrompt,
  buildTopicSuggestionsPrompt,
  buildHookVariantsPrompt,
  buildEngagementPredictionPrompt,
  ROLE_PROFILES,
  GENERIC_PROFILE,
  type PostFormat,
  type VoiceProfile,
} from "@/lib/prompts/role-aware-system";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface GeneratedPost {
  full_text: string;
  hook: string;        // First line extracted
  hashtags: string[];  // Tags extracted from end of post
  word_count: number;
  char_count: number;
}

export interface ScoreResult {
  hook_score: number;
  authenticity_score: number;
  specificity_score: number;
  engagement_score: number;
  formatting_score: number;
  total_score: number;
  is_good_enough: boolean;
  biggest_weakness: string;
  fix_instruction: string;
}

export interface QualityControlResult {
  final_content: string;
  final_score: ScoreResult;
  attempts_used: number;
  improved: boolean;
}

export interface HookVariant {
  style: string;
  hook: string;
}

export interface EngagementPrediction {
  estimated_reactions: number;
  estimated_comments: number;
  confidence: "low" | "medium" | "high";
  reason: string;
}

export interface GenerateOptions {
  topic: string;
  role: string;
  format?: PostFormat;
  goal?: string;
  voiceProfile?: VoiceProfile;
  isPaidUser?: boolean;   // controls whether Pass 3 runs
  maxRetries?: number;    // max rewrite attempts in Pass 3 (default 3)
}

// ---------------------------------------------------------------------------
// AI CALLER
// Thin wrapper over ai-router so call-sites use named options.
// ---------------------------------------------------------------------------

interface AiCallOptions {
  temperature?: number;
  maxTokens?: number;   // noted but ai-router does not forward this yet
  expectJson?: boolean;
}

async function callAi(
  system: string,
  user: string,
  options: AiCallOptions = {}
): Promise<string> {
  return routerCallAi(system, user, {
    temperature: options.temperature,
    json: options.expectJson,
  });
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function extractHook(fullText: string): string {
  const lines = fullText.split("\n").filter((l) => l.trim().length > 0);
  return lines[0] ?? "";
}

function extractHashtags(fullText: string): string[] {
  const matches = fullText.match(/#[\w؀-ۿ]+/g);
  return matches ?? [];
}

function parseJson<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function buildPost(fullText: string): GeneratedPost {
  return {
    full_text: fullText.trim(),
    hook: extractHook(fullText),
    hashtags: extractHashtags(fullText),
    word_count: fullText.split(/\s+/).filter(Boolean).length,
    char_count: fullText.length,
  };
}

// Validate the role exists - fall back to generic silently
function resolveRole(role: string): string {
  return role in ROLE_PROFILES ? role : "generic";
}

// ---------------------------------------------------------------------------
// PASS 1: GENERATE
// ---------------------------------------------------------------------------

export async function generateRawPost(
  topic: string,
  role: string,
  format: PostFormat = "medium",
  goal?: string,
  voiceProfile?: VoiceProfile
): Promise<string> {
  const resolvedRole = resolveRole(role);
  const { system, user } = buildGeneratePrompt(
    resolvedRole,
    topic,
    format,
    goal,
    voiceProfile
  );

  const raw = await callAi(system, user, { temperature: 0.85, maxTokens: 900 });
  return raw.trim();
}

// ---------------------------------------------------------------------------
// PASS 2: HUMANIZE
// ---------------------------------------------------------------------------

export async function humanizePost(rawPost: string, role: string): Promise<string> {
  const resolvedRole = resolveRole(role);
  const { system, user } = buildHumanizePrompt(rawPost, resolvedRole);

  const humanized = await callAi(system, user, {
    temperature: 0.4,
    maxTokens: 900,
  });
  return humanized.trim();
}

// ---------------------------------------------------------------------------
// PASS 3A: SCORE
// ---------------------------------------------------------------------------

export async function scorePost(post: string, role: string): Promise<ScoreResult | null> {
  const resolvedRole = resolveRole(role);
  const { system, user } = buildScorePrompt(post, resolvedRole);

  const raw = await callAi(system, user, {
    temperature: 0.2,
    maxTokens: 400,
    expectJson: true,
  });

  const parsed = parseJson<ScoreResult>(raw);
  return parsed;
}

// ---------------------------------------------------------------------------
// PASS 3B: REWRITE WITH FEEDBACK
// ---------------------------------------------------------------------------

export async function rewritePost(
  post: string,
  score: ScoreResult,
  role: string,
  voiceProfile?: VoiceProfile
): Promise<string> {
  const resolvedRole = resolveRole(role);
  const { system, user } = buildRewritePrompt(
    post,
    score.fix_instruction,
    score.biggest_weakness,
    resolvedRole,
    voiceProfile
  );

  const rewritten = await callAi(system, user, {
    temperature: 0.7,
    maxTokens: 900,
  });
  return rewritten.trim();
}

// ---------------------------------------------------------------------------
// QUALITY CONTROL LOOP (Pass 3 full - paid users only)
// Retries up to maxRetries times. Keeps the best version by score.
// ---------------------------------------------------------------------------

export async function qualityControlPost(
  post: string,
  role: string,
  voiceProfile?: VoiceProfile,
  maxRetries = 3
): Promise<QualityControlResult> {
  let current = post;
  let bestContent = post;
  let bestScore: ScoreResult | null = null;
  let attemptsUsed = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    attemptsUsed = attempt + 1;

    const score = await scorePost(current, role);

    // If scoring fails (JSON parse error, model hiccup), stop retrying
    if (!score) {
      break;
    }

    // Track best version
    if (!bestScore || score.total_score > bestScore.total_score) {
      bestScore = score;
      bestContent = current;
    }

    // Good enough - stop
    if (score.is_good_enough) {
      break;
    }

    // Last attempt - no point rewriting if we're about to stop
    if (attempt === maxRetries - 1) {
      break;
    }

    // Rewrite targeting the specific weakness
    const rewritten = await rewritePost(current, score, role, voiceProfile);
    current = rewritten;
  }

  const fallbackScore: ScoreResult = {
    hook_score: 0,
    authenticity_score: 0,
    specificity_score: 0,
    engagement_score: 0,
    formatting_score: 0,
    total_score: 0,
    is_good_enough: false,
    biggest_weakness: "Scoring unavailable",
    fix_instruction: "Review manually",
  };

  return {
    final_content: bestContent,
    final_score: bestScore ?? fallbackScore,
    attempts_used: attemptsUsed,
    improved: bestScore ? bestScore.total_score > 60 : false,
  };
}

// ---------------------------------------------------------------------------
// MAIN EXPORT: generatePost
// This is what your API route calls.
// ---------------------------------------------------------------------------

export async function generatePost(options: GenerateOptions): Promise<{
  post: GeneratedPost;
  score: ScoreResult | null;
  quality_result: QualityControlResult | null;
}> {
  const {
    topic,
    role,
    format = "medium",
    goal,
    voiceProfile,
    isPaidUser = false,
    maxRetries = 3,
  } = options;

  // Pass 1: Generate raw post
  let content = await generateRawPost(topic, role, format, goal, voiceProfile);

  // Pass 2: Humanize (runs for everyone)
  content = await humanizePost(content, role);

  let qualityResult: QualityControlResult | null = null;

  // Pass 3: Score + rewrite loop (paid users only)
  if (isPaidUser) {
    qualityResult = await qualityControlPost(content, role, voiceProfile, maxRetries);
    content = qualityResult.final_content;
  }

  return {
    post: buildPost(content),
    score: qualityResult?.final_score ?? null,
    quality_result: qualityResult,
  };
}

// ---------------------------------------------------------------------------
// HOOK VARIANTS (for hook cards feature on writer page)
// ---------------------------------------------------------------------------

export async function generateHookVariants(
  topic: string,
  role: string
): Promise<HookVariant[]> {
  const resolvedRole = resolveRole(role);
  const { system, user } = buildHookVariantsPrompt(topic, resolvedRole);

  const raw = await callAi(system, user, {
    temperature: 0.9,
    maxTokens: 400,
    expectJson: true,
  });

  const parsed = parseJson<HookVariant[]>(raw);
  if (!parsed || !Array.isArray(parsed)) {
    return [];
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// TOPIC SUGGESTIONS (blank-page-killer)
// ---------------------------------------------------------------------------

export async function generateTopicSuggestions(
  role: string,
  recentTopics: string[] = []
): Promise<string[]> {
  const resolvedRole = resolveRole(role);
  const { system, user } = buildTopicSuggestionsPrompt(resolvedRole, recentTopics);

  const raw = await callAi(system, user, {
    temperature: 0.9,
    maxTokens: 300,
    expectJson: true,
  });

  const parsed = parseJson<string[]>(raw);
  if (!parsed || !Array.isArray(parsed)) {
    return [];
  }
  return parsed.slice(0, 3); // Always exactly 3
}

// ---------------------------------------------------------------------------
// ENGAGEMENT PREDICTION (vanity feature for addiction loop)
// Use the 8b model for this - it's a simple estimation task.
// ---------------------------------------------------------------------------

export async function predictEngagement(
  post: string,
  role: string
): Promise<EngagementPrediction | null> {
  const resolvedRole = resolveRole(role);
  const { system, user } = buildEngagementPredictionPrompt(post, resolvedRole);

  const raw = await callAi(system, user, {
    temperature: 0.3,
    maxTokens: 200,
    expectJson: true,
  });

  return parseJson<EngagementPrediction>(raw);
}

// ---------------------------------------------------------------------------
// ROLE LIST (for UI - role selector on onboarding)
// ---------------------------------------------------------------------------

export function getRoleList(): Array<{ value: string; label: string }> {
  return Object.entries(ROLE_PROFILES).map(([value, profile]) => ({
    value,
    label: profile.label,
  }));
}

// ---------------------------------------------------------------------------
// BACKWARD-COMPAT SHIMS
// app/api/generate/route.ts imports these names. They delegate to the new
// pipeline functions above and reshape the return value to the old contract.
// ---------------------------------------------------------------------------

/** @deprecated Use scorePost */
export async function scoreContent(
  content: string,
  role: string
): Promise<ScoreResult & { feedback: string }> {
  const result = await scorePost(content, role);
  const fallback: ScoreResult & { feedback: string } = {
    hook_score: 70,
    authenticity_score: 70,
    specificity_score: 70,
    engagement_score: 70,
    formatting_score: 70,
    total_score: 70,
    is_good_enough: false,
    biggest_weakness: "Add more specific examples and a sharper first line.",
    fix_instruction: "Rewrite the opening line with a concrete detail or number.",
    feedback: "Add more specific examples and a sharper first line.",
  };
  if (!result) return fallback;
  return { ...result, feedback: result.biggest_weakness };
}

/** @deprecated Use qualityControlPost */
export async function qualityControlDraft(
  content: string,
  role: string,
  voiceProfile?: VoiceProfile,
  maxRetries = 3
): Promise<{
  finalContent: string;
  finalScore: ScoreResult & { feedback: string };
  attemptsUsed: number;
}> {
  const qc = await qualityControlPost(content, role, voiceProfile, maxRetries);
  return {
    finalContent: qc.final_content,
    finalScore: { ...qc.final_score, feedback: qc.final_score.biggest_weakness },
    attemptsUsed: qc.attempts_used,
  };
}

/** @deprecated Use generateHookVariants */
export async function generateHooks(
  topic: string,
  role: string,
  count = 3
): Promise<HookVariant[]> {
  const variants = await generateHookVariants(topic, role);
  return variants.slice(0, count);
}

export type { PostFormat, VoiceProfile };
