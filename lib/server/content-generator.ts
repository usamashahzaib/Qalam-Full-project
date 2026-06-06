import { callAi } from "./ai-router"

type RoleProfile = {
  vocabulary: string[]
  pain_points: string[]
  hook_templates: string[]
  banned_words: string[]
  tone: string
}

const ROLE_PROFILES: Record<string, RoleProfile> = {
  ai_engineer: {
    vocabulary: ["architecture", "inference", "latency", "fine-tuning", "orchestration", "embedding", "vector DB", "RAG", "transformer", "LLM"],
    pain_points: ["model hallucination", "production deployment", "cost optimization", "eval metrics"],
    hook_templates: [
      "I built 3 AI systems. Here's what actually broke in production:",
      "Stop treating LLMs like black boxes. Here's the debugging framework I use:",
      "The real reason your RAG pipeline is failing (it's not chunking):",
    ],
    banned_words: ["synergy", "leverage", "paradigm", "disruptive", "innovative"],
    tone: "technical, precise, slightly cynical, experience-backed",
  },
  ceo: {
    vocabulary: ["unit economics", "burn rate", "runway", "CAC", "LTV", "retention", "expansion revenue", "net dollar retention"],
    pain_points: ["hiring mistakes", "market timing", "board management", "cash flow", "competition"],
    hook_templates: [
      "I fired my CTO in month 6. Here's what I learned about technical hiring:",
      "Your startup isn't failing because of product. It's failing because of this:",
      "The 3 metrics every board actually cares about (and 5 they pretend to):",
    ],
    banned_words: ["passion", "hustle", "grind", "manifest", "vibes"],
    tone: "direct, contrarian, data-backed, leadership-oriented",
  },
  hr: {
    vocabulary: ["retention", "onboarding", "culture fit", "performance review", "1:1", "engagement score", "exit interview", "talent density"],
    pain_points: ["quiet quitting", "toxic high performers", "remote isolation", "compensation transparency"],
    hook_templates: [
      "I interviewed 200 candidates this year. The best ones all had this trait:",
      "Your 'rockstar' engineer is destroying your team. Here's the data:",
      "The real reason top talent leaves (it's never money):",
    ],
    banned_words: ["family", "rockstar", "ninja", "guru", "warrior"],
    tone: "empathetic, evidence-based, people-first, direct",
  },
  sales: {
    vocabulary: ["pipeline", "forecast", "deal velocity", "multi-threading", "champion", "economic buyer", "MEDDPICC", "discovery"],
    pain_points: ["ghosting", "price objections", "long cycles", "no-decision losses", "CRM hygiene"],
    hook_templates: [
      "I lost a $500K deal because I asked this question too early:",
      "The 'nice' prospect is the most dangerous. Here's why:",
      "Your demo is boring. Here's how to fix it in 48 hours:",
    ],
    banned_words: ["synergy", "circle back", "touch base", "value-add", "game-changer"],
    tone: "aggressive, honest, story-driven, metric-obsessed",
  },
  designer: {
    vocabulary: ["user research", "interaction pattern", "design system", "accessibility", "Figma", "prototype", "usability testing", "HCI"],
    pain_points: ["stakeholder design", "scope creep", "handoff gaps", "designer vs developer friction", "portfolio pressure"],
    hook_templates: [
      "I redesigned a checkout flow. Conversion dropped 12%. Here's what I missed:",
      "Your design system is a lie. Here's the audit framework:",
      "The best designers I know all do this one thing differently:",
    ],
    banned_words: ["intuitive", "clean", "sleek", "minimal", "aesthetic"],
    tone: "critical, process-oriented, user-advocate, humble",
  },
  founder: {
    vocabulary: ["product-market fit", "traction", "pivot", "MVP", "validation", "customer development", "go-to-market", "burn multiple"],
    pain_points: ["building without selling", "co-founder conflict", "investor rejection", "feature bloat", "indifference"],
    hook_templates: [
      "I spent 6 months building. Nobody cared. Here's the 2-week fix:",
      "Your MVP is too minimum. Here's the viability test:",
      "The investors who passed on us (and why they were wrong):",
    ],
    banned_words: ["disrupt", "revolutionary", "groundbreaking", "first-ever", "unique"],
    tone: "raw, vulnerable, lesson-heavy, action-oriented",
  },
  consultant: {
    vocabulary: ["stakeholder alignment", "change management", "OKRs", "KPIs", "baseline", "deliverable", "scope", "retainer", "SOW"],
    pain_points: ["scope creep", "unpaid discovery", "client resistance", "implementation gap", "recommendation rejection"],
    hook_templates: [
      "My client ignored my recommendation. It cost them $2M. Here's the deck:",
      "The 'quick win' every consultant promises (and rarely delivers):",
      "I stopped doing free discovery calls. Revenue doubled in 90 days:",
    ],
    banned_words: ["holistic", "synergy", "bandwidth", "deep dive", "actionable insights"],
    tone: "candid, framework-driven, slightly cynical, results-obsessed",
  },
}

type VoiceProfile = { sample_posts?: Array<{ text?: string } | string> } | null
type PostFormat = "short" | "medium" | "long"

type GeneratedPost = {
  hook: string
  body: string
  cta: string
  full_text: string
  engagement_prediction: string
  suggested_hashtags: string[]
}

type ContentScore = {
  total_score: number
  hook_score: number
  authenticity_score: number
  specificity_score: number
  engagement_score: number
  formatting_score: number
  feedback: string
  is_good_enough: boolean
}

// VALIDATORS - AI agar garbage return kare toh app crash nahi hoga
function validatePostJson(raw: unknown): GeneratedPost {
  if (typeof raw !== 'object' || raw === null) throw new Error("Invalid JSON structure");
  const obj = raw as Record<string, unknown>;
  
  const required = ['hook', 'body', 'cta', 'full_text', 'engagement_prediction', 'suggested_hashtags'];
  for (const key of required) {
    if (!(key in obj)) throw new Error(`Missing required field: ${key}`);
  }
  
  if (!Array.isArray(obj.suggested_hashtags)) throw new Error("hashtags must be an array");
  
  return {
    hook: String(obj.hook),
    body: String(obj.body),
    cta: String(obj.cta),
    full_text: String(obj.full_text),
    engagement_prediction: String(obj.engagement_prediction),
    suggested_hashtags: obj.suggested_hashtags.map(h => String(h)),
  };
}

function validateScoreJson(raw: unknown): ContentScore {
  if (typeof raw !== 'object' || raw === null) throw new Error("Invalid score JSON");
  const obj = raw as Record<string, unknown>;
  
  const scores = ['total_score', 'hook_score', 'authenticity_score', 'specificity_score', 'engagement_score', 'formatting_score'];
  for (const key of scores) {
    if (typeof obj[key] !== 'number') throw new Error(`Missing or invalid score: ${key}`);
  }
  
  return {
    total_score: Number(obj.total_score),
    hook_score: Number(obj.hook_score),
    authenticity_score: Number(obj.authenticity_score),
    specificity_score: Number(obj.specificity_score),
    engagement_score: Number(obj.engagement_score),
    formatting_score: Number(obj.formatting_score),
    feedback: String(obj.feedback || ""),
    is_good_enough: Boolean(obj.is_good_enough),
  };
}

// SAFE JSON PARSER - Pehle regex se parse kar raha tha, ab proper validation
const parseJson = <T>(raw: string, validator: (data: unknown) => T): T => {
  const text = raw.trim();
  // Pehle markdown code block check karo
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = codeBlockMatch ? codeBlockMatch[1] : text;
  
  // First { aur last } dhoondo
  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No valid JSON object found in AI response");
  }
  
  const parsed = JSON.parse(jsonText.slice(start, end + 1));
  return validator(parsed);
};

export const roleOptions = Object.keys(ROLE_PROFILES)

export async function generatePost(params: {
  topic: string
  role: string
  tone?: string
  voiceProfile?: VoiceProfile
  goal?: string
  format?: PostFormat
}) {
  const profile = ROLE_PROFILES[params.role] || ROLE_PROFILES.founder
  const fewShotExamples = params.voiceProfile?.sample_posts?.slice(0, 3) || []
  const fewShotText = fewShotExamples.length
    ? `Here are examples of my writing style:\n${fewShotExamples.map((p, i) => `Example ${i + 1}:\n${typeof p === "string" ? p : p.text || ""}`).join("\n\n")}`
    : ""
  const format = params.format || "medium"
  const length = format === "short" ? "100-150 words" : format === "long" ? "400-600 words" : "200-350 words"
  const prompt = `You are a world-class LinkedIn ghostwriter who specializes in ${params.role.replace("_", " ")} content.

ROLE PROFILE:
- Tone: ${params.tone || profile.tone}
- Key vocabulary: ${profile.vocabulary.join(", ")}
- Common pain points: ${profile.pain_points.join(", ")}
- NEVER use these words: ${profile.banned_words.join(", ")}

${fewShotText}

TASK: Write a ${format} LinkedIn post about "${params.topic}".
Goal: ${params.goal || "drive qualified comments"}.

REQUIREMENTS:
1. Hook: Use one of these patterns or create better: ${profile.hook_templates.join(" | ")}
2. The hook must be specific, not generic.
3. Body: Share a real insight, lesson, or story. Include specific numbers or timeframes if possible.
4. CTA: End with a question that drives comments or a clear next step.
5. Tone must match the role exactly.
6. Format: Short paragraphs. Use line breaks for readability.
7. Length: ${length}.

OUTPUT JSON:
{
  "hook": "the first sentence",
  "body": "main content",
  "cta": "call to action",
  "full_text": "hook + body + cta",
  "engagement_prediction": "why this will work",
  "suggested_hashtags": ["tag1", "tag2", "tag3"]
}`
  return parseJson(await callAi("Return strict JSON only.", prompt, { json: true, temperature: 0.7, timeout: 15000 }), validatePostJson)
}

export async function scoreContent(content: string, role: string) {
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.founder
  const prompt = `Score this LinkedIn post for a ${role.replace("_", " ")} audience.

POST:
${content}

ROLE REQUIREMENTS:
- Tone: ${profile.tone}
- Must avoid: ${profile.banned_words.join(", ")}
- Must include: specific insights, real experience, or data

OUTPUT JSON:
{
  "total_score": number,
  "hook_score": number,
  "authenticity_score": number,
  "specificity_score": number,
  "engagement_score": number,
  "formatting_score": number,
  "feedback": "specific improvements",
  "is_good_enough": boolean
}`
  return parseJson(await callAi("Return strict JSON only.", prompt, { json: true, temperature: 0.3, timeout: 10000 }), validateScoreJson)
}

export async function rewriteWithFeedback(content: string, feedback: string, role: string) {
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.founder
  const prompt = `Rewrite this LinkedIn post based on feedback.

ORIGINAL:
${content}

FEEDBACK:
${feedback}

ROLE: ${role.replace("_", " ")}
Tone: ${profile.tone}
Banned words: ${profile.banned_words.join(", ")}

Return only the rewritten post text.`
  return callAi("You rewrite LinkedIn posts without changing the core insight.", prompt, { temperature: 0.8, timeout: 15000 })
}