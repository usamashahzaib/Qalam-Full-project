import { NextRequest, NextResponse } from "next/server"
import { analyzeContent, type ContentAnalysis } from "@/lib/content-intelligence"
import { groqApiKey } from "@/lib/server/env"
import { rateLimit } from "@/lib/server/rate-limit"
import { cleanErrorMessage, fallbackHooks, hasAiSlop, sanitizeGeneratedText } from "@/lib/content-guard"
import { requirePlan, getMonthlyCount, enforceMonthlyLimit } from "@/lib/server/require-plan"

type GenerateBody = {
  mode?: "draft" | "intelligence" | "hooks" | "comment-replies" | "repair"
  prompt?: string
  postType?: string
  title?: string
  content?: string
  hook?: string
  previousDraft?: string
  variation?: boolean
  originalPost?: string
  comments?: string
  profile?: {
    name?: string
    title?: string
    industry?: string
    tone?: string
    goals?: string[]
  }
}

const BASE_RULES = [
  "Do not use em dashes in your output. Use a comma or period instead.",
  "Use hyphen only when punctuation is needed.",
  "Write like a sharp operator talking to another human. No corporate filler.",
  "Never use these words or phrases: leverage, delve, foster, navigate, rapidly evolving landscape, future belongs, game-changer, transformative, unlock potential, it is worth noting, in today's world, ever-changing, unlock, empower, seamless, robust, cutting-edge, dive into, embark, maximize, optimize, elevate, revolutionize, synergy, ecosystem.",
  "No markdown headings, bold markers, labels, or preamble.",
]

const buildDraftSystemPrompt = (_body: GenerateBody) => `You are a LinkedIn ghostwriter. Write exactly what was asked - nothing more.

Rules:
- Output ONLY the post text. No title. No "Introduction:" header. No section labels.
- No markdown. No asterisks. No bold. Plain text only.
- Max 1,300 characters unless the user explicitly asks for long form.
- 3-5 hashtags at the end, on a new line. No more.
- Do not add a CTA unless the user asked for one.
- Write like a person, not a content template.
- Start with a specific observation, data point, or contrarian take.
- Match the user's tone literally: friendly means warm, professional means clean, witty means lightly clever.
- Never use: leverage, delve, foster, navigate, rapidly evolving landscape, game-changer, transformative, unlock potential, seamless, robust, cutting-edge, synergy, ecosystem.`

const buildDraftUserMessage = (body: GenerateBody, prompt: string) => {
  if (!body.variation) return prompt
  return [
    "Regenerate this LinkedIn post as a different variation.",
    "Use a different angle and a different hook.",
    body.hook ? `Current hook to avoid repeating:\n${body.hook}` : "",
    body.previousDraft ? `Previous draft to avoid copying:\n${body.previousDraft}` : "",
    `Original instruction:\n${prompt}`,
  ].filter(Boolean).join("\n\n")
}

const buildVisualPrompt = (body: GenerateBody, prompt: string) => [
  "Create a LinkedIn visual post package. Return strict JSON only.",
  "Caption rules: max 150 characters, plain text, no markdown, no em dashes, no generic CTA.",
  "Image prompt rules: describe one simple professional visual that supports the caption.",
  "Return this exact JSON shape:",
  '{"caption":"short caption","imagePrompt":"specific image direction"}',
  body.profile?.title ? `Writer role: ${body.profile.title}` : "",
  body.profile?.industry ? `Industry: ${body.profile.industry}` : "",
  body.profile?.tone ? `Tone: ${body.profile.tone}` : "",
  `Topic:\n${prompt}`,
].filter(Boolean).join("\n")

const QUALITY_LABELS = ["Hook strength", "Body engagement", "CTA clarity"] as const
type QualityLabel = (typeof QUALITY_LABELS)[number]

const toScore = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0
}

const qualityPasses = (analysis: ContentAnalysis) => analysis.overallScore >= 80

const qualityRank = (analysis: ContentAnalysis) =>
  analysis.overallScore + Math.min(...analysis.scores.map((item) => item.score))

const buildQualityScorePrompt = ({ title, profile, postType }: GenerateBody, prompt: string, draft: string) => [
  "Score this LinkedIn post. Return strict JSON only.",
  "Score with this exact rubric. Total 100 points:",
  "- Hook strength (0-40): scroll-stopping, specific, surprising, contrarian.",
  "- Body engagement (0-35): readable, concrete, keeps attention, no jargon walls.",
  "- CTA clarity (0-25): clear next step, question, save prompt, or direct engagement.",
  "",
  "Return this exact JSON shape:",
  '{"hookStrength":32,"bodyEngagement":30,"ctaClarity":20,"overallScore":82,"scores":[{"label":"Hook strength","score":80,"note":"short note"},{"label":"Body engagement","score":86,"note":"short note"},{"label":"CTA clarity","score":80,"note":"short note"}],"improvements":["short rewrite instruction"]}',
  "",
  title ? `Working title: ${title}` : "",
  postType ? `Post type: ${postType}` : "",
  profile?.title ? `Writer role: ${profile.title}` : "",
  profile?.industry ? `Industry: ${profile.industry}` : "",
  profile?.tone ? `Voice profile tone: ${profile.tone}` : "",
  profile?.goals?.length ? `Voice profile goals: ${profile.goals.join(", ")}` : "",
  `Original user request:\n${prompt}`,
  "",
  `Draft to score:\n${draft}`,
].filter(Boolean).join("\n")

const normalizeQualityAnalysis = (raw: string, draft: string, body: GenerateBody): ContentAnalysis => {
  const fallback = analyzeContent({ title: body.title, content: draft, type: body.postType, profile: body.profile })
  let parsed: Record<string, unknown> = {}
  try { parsed = JSON.parse(raw) as Record<string, unknown> } catch {}
  const rawScores = Array.isArray(parsed.scores) ? parsed.scores as Record<string, unknown>[] : []
  const weightedScores: Record<string, number> = {
    "Hook strength": toScore(parsed.hookStrength) * 2.5,
    "Body engagement": Math.round(toScore(parsed.bodyEngagement) * (100 / 35)),
    "CTA clarity": toScore(parsed.ctaClarity) * 4,
  }
  const scores = QUALITY_LABELS.map((label) => {
    const matched = rawScores.find((item) => String(item.label || "").toLowerCase() === label.toLowerCase())
    const local = fallback.scores.find((item) => item.label === label)
    const score = toScore(matched?.score ?? weightedScores[label] ?? local?.score ?? 0)
    return {
      label: label as QualityLabel,
      score,
      note: String(matched?.note || local?.note || "No note returned"),
      actionHint: score < 70 ? `Improve ${label.toLowerCase()}` : undefined,
    }
  })
  const total = toScore(parsed.overallScore ?? (toScore(parsed.hookStrength) + toScore(parsed.bodyEngagement) + toScore(parsed.ctaClarity)))
  const improvements = Array.isArray(parsed.improvements)
    ? parsed.improvements.filter((item): item is string => typeof item === "string").slice(0, 4)
    : fallback.improvements
  return {
    ...fallback,
    overallScore: total,
    overallLabel: total >= 90 ? "Ready to publish" : total >= 80 ? "Strong" : "Needs polish",
    scores,
    improvements,
  }
}

const buildQualityRewritePrompt = (body: GenerateBody, prompt: string, draft: string, analysis: ContentAnalysis) => {
  const weak = analysis.scores.filter((item) => item.score < 70)
  const strong = analysis.scores.filter((item) => item.score >= 80)
  return [
    "Rewrite this LinkedIn post to pass the quality gate.",
    "Return only the full rewritten post text.",
    "Keep strong sections unchanged where possible.",
    "Rewrite weak sections specifically. Do not rewrite for the sake of rewriting.",
    "No markdown. No labels. No em dashes.",
    "Quality gate: overall score >= 80 using Hook strength 40, Body engagement 35, CTA clarity 25.",
    "",
    `Current overall score: ${analysis.overallScore}`,
    weak.length ? `Weak sections: ${weak.map((item) => `${item.label} ${item.score}/100 - ${item.note}`).join("; ")}` : "",
    strong.length ? `Strong sections to preserve: ${strong.map((item) => `${item.label} ${item.score}/100`).join(", ")}` : "",
    analysis.improvements.length ? `Rewrite instructions: ${analysis.improvements.join(" ")}` : "",
    body.profile?.tone ? `Voice tone to preserve: ${body.profile.tone}` : "",
    body.profile?.title ? `Writer role: ${body.profile.title}` : "",
    `Original user request:\n${prompt}`,
    "",
    `Draft:\n${draft}`,
  ].filter(Boolean).join("\n")
}

const qualityControlDraft = async (body: GenerateBody, prompt: string, initialText: string) => {
  let bestText = sanitizeGeneratedText(initialText)
  let usageCost = 1
  let bestAnalysis = normalizeQualityAnalysis(await callGroq(
    buildQualityScorePrompt(body, prompt, bestText),
    "Score this draft.",
    0.2,
  ), bestText, body)

  for (let attempt = 0; attempt < 3 && !qualityPasses(bestAnalysis); attempt++) {
    usageCost += 1
    const candidate = sanitizeGeneratedText(await callGroqText(
      buildDraftSystemPrompt(body),
      buildQualityRewritePrompt(body, prompt, bestText, bestAnalysis),
      0.55,
    ))
    if (!candidate) break
    const candidateAnalysis = normalizeQualityAnalysis(await callGroq(
      buildQualityScorePrompt(body, prompt, candidate),
      "Score this rewritten draft.",
      0.2,
    ), candidate, body)
    if (qualityRank(candidateAnalysis) >= qualityRank(bestAnalysis)) {
      bestText = candidate
      bestAnalysis = candidateAnalysis
    }
  }

  const metTarget = qualityPasses(bestAnalysis)
  const visibleAnalysis = metTarget ? bestAnalysis : { ...bestAnalysis, overallScore: Math.max(80, bestAnalysis.overallScore), overallLabel: "Needs polish" }
  return { text: bestText, analysis: visibleAnalysis, metTarget, needsPolish: !metTarget, usageCost }
}

const buildIntelligencePrompt = ({ title, content, profile, postType }: GenerateBody) =>
  [
    "You are a senior LinkedIn content strategist.",
    "Analyze the post below and return strict JSON only.",
    "Keep all outputs short, specific, and immediately actionable.",
    ...BASE_RULES,
    "",
    "Return this exact JSON shape:",
    '{"hashtags":["#RealHashtag","#RealHashtag"],"improvements":["short actionable tip"],"hookSuggestions":[{"style":"Sharp","text":"..."},{"style":"Authority","text":"..."},{"style":"Story","text":"..."},{"style":"Curiosity","text":"..."},{"style":"Direct","text":"..."}]}',
    "",
    "HASHTAG RULES: Generate 8 to 12 real LinkedIn discovery hashtags based on the actual post topic.",
    "Use hashtags real professionals search: #HumanResources #Leadership #ProductManagement #Hiring #B2BSales #Entrepreneurship etc.",
    "Never return placeholder hashtags like #One #Two #Tag #Post or generic noise.",
    "Mix: 2-3 broad category tags + 3-4 niche topic tags + 1-2 audience function tags.",
    profile?.industry ? `Industry context for hashtags: ${profile.industry}` : "",
    profile?.title ? `Role context for hashtags: ${profile.title}` : "",
    "",
    "HOOK SUGGESTIONS RULES: Write 5 alternative first-line hooks for this post.",
    "Each hook must be derived from the actual post content, not generic.",
    "Sharp: contrarian or challenging take. Authority: specific result or credential. Story: first-person moment. Curiosity: open loop. Direct: clean numbered or practical.",
    "Each hook should be under 100 characters. No em dashes.",
    "",
    "IMPROVEMENTS RULES: 2 to 3 short, specific suggestions.",
    "",
    title ? `Title: ${title}` : "",
    postType ? `Type: ${postType}` : "",
    profile?.title ? `Role: ${profile.title}` : "",
    profile?.industry ? `Industry: ${profile.industry}` : "",
    profile?.tone ? `Tone preference: ${profile.tone}` : "",
    profile?.goals?.length ? `Goals: ${profile.goals.join(", ")}` : "",
    `Post:\n${content || ""}`,
  ].filter(Boolean).join("\n")

const buildHooksPrompt = ({ content, title, profile }: GenerateBody) =>
  [
    "You are a LinkedIn hook specialist.",
    "Generate 5 alternative opening lines (hooks) for the post below.",
    "Use these exact frameworks once each: Contrarian, Data Shock, Personal Story, Direct Challenge, Curiosity Gap.",
    "Score each hook from 0-100 for scroll-stopping strength.",
    "Each hook must be directly tied to the post content, not generic.",
    ...BASE_RULES,
    "",
    "Return strict JSON only with this shape:",
    '{"hooks":[{"style":"Contrarian","text":"...","score":85},{"style":"Data Shock","text":"...","score":85},{"style":"Personal Story","text":"...","score":85},{"style":"Direct Challenge","text":"...","score":85},{"style":"Curiosity Gap","text":"...","score":85}]}',
    "",
    "RULES:",
    "Every hook must reference something specific from the post content.",
    "No generic placeholders. No em dashes. Under 100 characters each.",
    profile?.name ? `Writer: ${profile.name}` : "",
    profile?.title ? `Role: ${profile.title}` : "",
    profile?.tone ? `Tone: ${profile.tone}` : "",
    title ? `Title: ${title}` : "",
    `Post:\n${content || ""}`,
  ].filter(Boolean).join("\n")

const scoreLocalHook = (text: string) => {
  const t = text.trim()
  let score = 55
  if (/[?]/.test(t)) score += 10
  if (/\d/.test(t)) score += 14
  if (/most people|nobody|stop|mistake|truth|unpopular|why|what if|I\b|we\b/i.test(t)) score += 16
  if (t.length > 15 && t.length <= 100) score += 10
  return Math.min(100, score)
}

const cleanHookItems = (hooks: { style?: string; text?: string; score?: number }[], content: string, title?: string) => {
  const fallback = fallbackHooks(content, title).map((hook) => ({ text: hook.text, score: scoreLocalHook(hook.text) }))
  const scored = hooks
    .filter((h) => h?.text && h.text.length > 8)
    .map((h) => ({ text: sanitizeGeneratedText(String(h.text)).slice(0, 100), score: toScore(h.score ?? scoreLocalHook(String(h.text))) }))
    .concat(fallback)
    .sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  return scored.filter((item) => item.score >= 80 && !seen.has(item.text.toLowerCase()) && seen.add(item.text.toLowerCase())).map((item) => item.text).slice(0, 5)
}

const buildCommentRepliesPrompt = ({ originalPost, comments, profile }: GenerateBody) =>
  [
    "You are a LinkedIn engagement specialist.",
    "Parse the comments below and generate multiple reply options per comment.",
    "Replies must feel like a real human who actually read and understood the discussion.",
    ...BASE_RULES,
    "",
    "REPLY RULES:",
    "Replies must be short: 1 to 3 sentences max.",
    "Never sound like AI. No generic praise like 'Great point!' or 'Totally agree!'",
    "Reference something specific from the comment.",
    "Different styles: Thoughtful adds perspective, Warm is friendly and personal, Sharp is direct or slightly challenging, Concise is minimal and crisp.",
    "",
    "Return strict JSON only with this shape:",
    '{"replies":[{"comment":"the original comment text","style":"Thoughtful","reply":"..."},{"comment":"same comment","style":"Warm","reply":"..."},{"comment":"same comment","style":"Sharp","reply":"..."}]}',
    "",
    "Generate 3 reply styles per comment (Thoughtful, Warm, Sharp).",
    "Parse each comment from the comments block below as a separate comment.",
    "",
    originalPost ? `Original post context:\n${originalPost.slice(0, 600)}` : "",
    profile?.name ? `Replier name: ${profile.name}` : "",
    profile?.title ? `Replier role: ${profile.title}` : "",
    profile?.tone ? `Tone preference: ${profile.tone}` : "",
    `Comments:\n${comments || ""}`,
  ].filter(Boolean).join("\n")

async function callGroq(systemPrompt: string, userMessage: string, temperature = 0.6): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  })
  const raw = await response.text()
  const data = raw ? JSON.parse(raw) : {}
  if (!response.ok) {
    const message = data?.error?.message || "AI service error"
    throw new Error(message)
  }
  return String(data?.choices?.[0]?.message?.content || "{}")
}

async function callGroqText(systemPrompt: string, userMessage: string, temperature = 0.7): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
    }),
    cache: "no-store",
  })
  const raw = await response.text()
  const data = raw ? JSON.parse(raw) : {}
  if (!response.ok) throw new Error(data?.error?.message || "AI service error")
  return String(data?.choices?.[0]?.message?.content || "")
}

const strengthenDraft = (text: string, prompt: string, postType?: string) => {
  const cleaned = sanitizeGeneratedText(text)
  if (postType?.toLowerCase().includes("carousel") || postType?.toLowerCase().includes("visual")) return cleaned
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length >= 130 && !hasAiSlop(cleaned)) return cleaned
  const topic = prompt.replace(/\s+/g, " ").trim().slice(0, 80) || "this topic"
  const base = cleaned || `Most teams treat ${topic} like a content problem. It is usually a clarity problem.`
  return sanitizeGeneratedText(`${base}

Here is the part that matters: people can feel when a post was written to fill a slot. They keep reading when it sounds like someone has actually dealt with the problem.

A better draft should do three things:

1. Name the real tension.
2. Show one specific example.
3. Leave the reader with a useful next move.

For ${topic}, the useful move is simple: write from the decision, mistake, or tradeoff behind the idea. That is where the human part lives.

What would you add from your own experience?`)
}

const buildRepairPrompt = (draft: string, prompt: string, analysis: ReturnType<typeof analyzeContent>, body: GenerateBody) => [
  "Repair this LinkedIn draft.",
  "Keep the same topic and overall claim.",
  "Make it feel more human and more specific.",
  "No markdown, no headings, no em dashes.",
  "Do not invent fake metrics or credentials.",
  body.profile?.title ? `Writer role: ${body.profile.title}.` : "",
  body.profile?.industry ? `Industry: ${body.profile.industry}.` : "",
  body.profile?.tone ? `Tone to match: ${body.profile.tone}.` : "",
  body.profile?.goals?.length ? `Goals: ${body.profile.goals.join(", ")}.` : "",
  "Target shape:",
  "- 170 to 240 words",
  "- first line under 90 characters",
  "- 4 to 6 short paragraphs",
  "- one concrete example or consequence",
  "- one practical takeaway",
  "- one natural CTA",
  `Current score: ${analysis.overallScore}/100.`,
  `Weak dimensions: ${analysis.scores.filter((item) => item.score < 75).map((item) => `${item.label} (${item.score})`).join(", ") || "none"}.`,
  `Fix list: ${analysis.improvements.join(" ") || "Make the post stronger overall."}`,
  "",
  `Prompt:\n${prompt}`,
  "",
  `Draft to repair:\n${draft}`,
].filter(Boolean).join("\n")

export async function POST(request: NextRequest) {
  try {
    // Free plan is allowed - every tier can generate, just with different caps
    const planCheck = await requirePlan(request, "Free")
    if (!planCheck.ok) return planCheck.response
    const { session, workspaceId, limits } = planCheck

    if (!rateLimit(`gen_${session.email}`, 12, 60)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 })
    }

    const body = (await request.json()) as GenerateBody
    const mode = body.mode || "draft"

    // Enforce monthly draft limit on draft mode only
    if (mode === "draft") {
      if (limits.aiDraftsPerMonth !== "unlimited") {
        const used = await getMonthlyCount("posts", workspaceId)
        const limitErr = enforceMonthlyLimit(used, limits.aiDraftsPerMonth, "AI drafts")
        if (limitErr) return limitErr
      }
    }

    // --- intelligence mode ---
    if (mode === "intelligence") {
      const content = String(body.content || "").trim()
      if (!content) return NextResponse.json({ error: "Content is required." }, { status: 400 })

      const analysis = analyzeContent({
        title: body.title,
        content,
        type: body.postType,
        profile: body.profile,
      })

      if (!groqApiKey) return NextResponse.json({ analysis })

      try {
        const contentJson = await callGroq(buildIntelligencePrompt(body), "Analyze this post.", 0.4)
        let parsed: {
          hashtags?: string[]
          improvements?: string[]
          hookSuggestions?: { style: string; text: string }[]
        } = {}
        try { parsed = JSON.parse(contentJson) } catch {}

        const cleanHashtags = (parsed.hashtags || [])
          .filter((t): t is string => typeof t === "string" && t.startsWith("#") && t.length > 3 && !/^#(one|two|three|tag|post|here|real|this|your)$/i.test(t))
          .slice(0, 12)

        const cleanHooks = (parsed.hookSuggestions || [])
          .filter((h) => h?.style && h?.text && h.text.length > 10)
          .map((h) => ({ ...h, text: sanitizeGeneratedText(h.text).slice(0, 100) }))
          .slice(0, 5)

        return NextResponse.json({
          analysis: {
            ...analysis,
            hashtags: cleanHashtags.length >= 3 ? cleanHashtags : analysis.hashtags,
            improvements: parsed.improvements?.filter(Boolean)?.slice(0, 3) || analysis.improvements,
          },
          hookSuggestions: cleanHooks,
        })
      } catch {
        return NextResponse.json({ analysis })
      }
    }

    // --- hooks mode ---
    if (mode === "hooks") {
      const content = String(body.content || "").trim()
      if (!content) return NextResponse.json({ error: "Content is required." }, { status: 400 })

      if (!groqApiKey) {
        return NextResponse.json({ error: "AI generation is not configured on this server." }, { status: 503 })
      }

      let usageCost = 1
      let parsed: { hooks?: { style?: string; text?: string; score?: number }[] } = {}
      try {
        const contentJson = await callGroq(buildHooksPrompt(body), "Generate hook alternatives.", 0.8)
        parsed = JSON.parse(contentJson)
        let cleanHooks = cleanHookItems(parsed.hooks || [], content, body.title)
        if (!cleanHooks.length) {
          usageCost += 1
          const retryJson = await callGroq(buildHooksPrompt(body), "Generate stronger hook alternatives over 80 score.", 0.9)
          parsed = JSON.parse(retryJson)
          cleanHooks = cleanHookItems(parsed.hooks || [], content, body.title)
        }
        return NextResponse.json({ hooks: cleanHooks.length ? cleanHooks : fallbackHooks(content, body.title).map((hook) => hook.text).slice(0, 5), usageCost })
      } catch {
        return NextResponse.json({ hooks: fallbackHooks(content, body.title).map((hook) => hook.text).slice(0, 5), usageCost })
      }
    }

    // --- comment-replies mode ---
    if (mode === "comment-replies") {
      const comments = String(body.comments || "").trim()
      if (!comments) return NextResponse.json({ error: "Comments are required." }, { status: 400 })

      if (!groqApiKey) {
        return NextResponse.json({ error: "AI generation is not configured on this server." }, { status: 503 })
      }

      const contentJson = await callGroq(buildCommentRepliesPrompt(body), "Generate replies.", 0.7)
      let parsed: { replies?: { comment: string; style: string; reply: string }[] } = {}
      try { parsed = JSON.parse(contentJson) } catch {}

      const cleanReplies = (parsed.replies || [])
        .filter((r) => r?.comment && r?.reply && r.reply.length > 5)
        .slice(0, 18)

      return NextResponse.json({ replies: cleanReplies })
    }

    // --- repair mode ---
    if (mode === "repair") {
      const content = String(body.content || "").trim()
      if (!content) return NextResponse.json({ error: "Content is required." }, { status: 400 })
      if (!groqApiKey) {
        return NextResponse.json({ error: "AI generation is not configured on this server." }, { status: 503 })
      }

      const currentAnalysis = analyzeContent({
        title: body.title,
        content,
        type: body.postType,
        profile: body.profile,
      })

      try {
        const repaired = sanitizeGeneratedText(await callGroqText(
          buildDraftSystemPrompt(body),
          buildRepairPrompt(content, String(body.prompt || body.title || "Improve this draft"), currentAnalysis, body),
          0.55,
        ))
        const repairedAnalysis = analyzeContent({
          title: body.title,
          content: repaired,
          type: body.postType,
          profile: body.profile,
        })
        return NextResponse.json({ text: repaired, analysis: repairedAnalysis, metTarget: repairedAnalysis.overallScore >= 90, usageCost: 1 })
      } catch (error) {
        return NextResponse.json({ error: cleanErrorMessage((error as Error).message) }, { status: 502 })
      }
    }

    // --- draft mode ---
    const prompt = String(body.prompt || "").trim()
    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 })
    if (!groqApiKey) {
      return NextResponse.json({ error: "AI generation is not configured on this server." }, { status: 503 })
    }

    if (body.postType?.toLowerCase().includes("visual")) {
      try {
        const contentJson = await callGroq(buildVisualPrompt(body, prompt), "Generate visual caption.", body.variation ? 0.9 : 0.6)
        let parsed: { caption?: string; imagePrompt?: string } = {}
        try { parsed = JSON.parse(contentJson) } catch {}
        const caption = sanitizeGeneratedText(String(parsed.caption || "")).slice(0, 150)
        const imagePrompt = String(parsed.imagePrompt || `Professional LinkedIn visual about ${prompt}`).trim()
        if (!caption) return NextResponse.json({ error: "AI returned an empty caption." }, { status: 502 })
        const analysis = analyzeContent({ title: body.title, content: caption, type: body.postType, profile: body.profile })
        return NextResponse.json({ text: caption, analysis, metTarget: true, usageCost: 1, visual: { imagePrompt } })
      } catch (error) {
        return NextResponse.json({ error: cleanErrorMessage((error as Error).message) }, { status: 502 })
      }
    }

    let text = ""
    try {
      const userMessage = buildDraftUserMessage(body, prompt)
      text = strengthenDraft(await callGroqText(buildDraftSystemPrompt(body), userMessage, body.variation ? 0.9 : 0.7), prompt, body.postType)
    } catch (error) {
      const message = (error as Error).message || "Failed to generate content."
      console.error("Groq API error:", message)
      return NextResponse.json({ error: cleanErrorMessage(message) }, { status: 502 })
    }

    let finalAnalysis = analyzeContent({
      title: body.title,
      content: text,
      type: body.postType,
      profile: body.profile,
    })

    let usageCost = 1
    let needsPolish = false
    if (!body.postType?.toLowerCase().includes("carousel") && !body.postType?.toLowerCase().includes("visual")) {
      try {
        const quality = await qualityControlDraft(body, prompt, text)
        text = quality.text
        finalAnalysis = quality.analysis
        usageCost = quality.usageCost
        needsPolish = quality.needsPolish
      } catch {
        // keep first visible draft if internal quality control fails
      }
    }

    if (!text) return NextResponse.json({ error: "AI returned an empty draft." }, { status: 502 })
    return NextResponse.json({ text, analysis: finalAnalysis, metTarget: qualityPasses(finalAnalysis), needsPolish, usageCost })
  } catch (error) {
    const message = (error as Error).message || "Internal server error"
    if (message === "auth_required") {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    }
    console.error("Generate error:", error)
    return NextResponse.json({ error: cleanErrorMessage(message) }, { status: 500 })
  }
}
