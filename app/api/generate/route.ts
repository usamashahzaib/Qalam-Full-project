import { NextRequest, NextResponse } from "next/server"
import { analyzeContent } from "@/lib/content-intelligence"
import { groqApiKey } from "@/lib/server/env"
import { rateLimit } from "@/lib/server/rate-limit"
import { cleanErrorMessage, fallbackHooks, hasAiSlop, sanitizeGeneratedText } from "@/lib/content-guard"
import { requirePlan, getMonthlyCount, enforceMonthlyLimit } from "@/lib/server/require-plan"
import { getPlanLimits } from "@/lib/entitlements"

type GenerateBody = {
  mode?: "draft" | "intelligence" | "hooks" | "comment-replies"
  prompt?: string
  postType?: string
  title?: string
  content?: string
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
  "Never use these words or phrases: leverage, delve, foster, navigate, rapidly evolving landscape, future belongs, game-changer, transformative, unlock potential, it is worth noting.",
  "No markdown headings, bold markers, labels, or preamble.",
]

const buildDraftSystemPrompt = ({ profile, postType, title }: GenerateBody) => {
  const goals = Array.isArray(profile?.goals) ? profile.goals.filter(Boolean).join(", ") : ""
  return [
    "You are an expert LinkedIn ghostwriter.",
    "Write one polished LinkedIn post based on the user's prompt.",
    "The post must be ready to paste into LinkedIn without edits.",
    postType ? `Format target: ${postType}.` : "",
    title ? `Working title: ${title}.` : "",
    profile?.name ? `Writer name: ${profile.name}.` : "",
    profile?.title ? `Writer role: ${profile.title}.` : "",
    profile?.industry ? `Industry: ${profile.industry}.` : "",
    profile?.tone ? `Tone to match: ${profile.tone}.` : "",
    goals ? `Content goals: ${goals}.` : "",
    postType?.toLowerCase().includes("carousel")
      ? "Write a carousel-ready outline: 6 to 8 slide blocks, each with a punchy title and 1 useful line."
      : postType?.toLowerCase().includes("visual")
        ? "Write a visual post: one strong caption plus a clear visual concept line for the image/designer."
        : "Write a text post of 150 to 220 words.",
    "Open with a scroll-stopping first line under 90 characters.",
    "Use at least 4 short paragraphs. Add one concrete example, one practical takeaway, and a natural CTA.",
    "If the prompt is broad, choose a specific angle instead of writing generic advice.",
    "Do not include hashtags unless the user asks.",
    "Do not include preamble, labels, quotation marks, or explanations.",
    "Return only the post body.",
    ...BASE_RULES,
  ].filter(Boolean).join(" ")
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
    "Each hook must be directly tied to the post content, not generic.",
    ...BASE_RULES,
    "",
    "Return strict JSON only with this shape:",
    '{"hooks":[{"style":"Sharp","text":"..."},{"style":"Authority","text":"..."},{"style":"Story","text":"..."},{"style":"Curiosity","text":"..."},{"style":"Direct","text":"..."}]}',
    "",
    "HOOK STYLES:",
    "Sharp: a contrarian or challenging take that stops the scroll.",
    "Authority: leads with a specific result, credential, or years of experience.",
    "Story: a short first-person moment or observation from real experience.",
    "Curiosity: an open loop or unexpected question that makes the reader want to continue.",
    "Direct: a clean list opener or plain practical statement.",
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

export async function POST(request: NextRequest) {
  try {
    // Free plan is allowed — every tier can generate, just with different caps
    const planCheck = await requirePlan(request, "Free")
    if (!planCheck.ok) return planCheck.response
    const { session, workspaceId, plan } = planCheck

    if (!rateLimit(`gen_${session.email}`, 12, 60)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 })
    }

    const body = (await request.json()) as GenerateBody
    const mode = body.mode || "draft"

    // Enforce monthly draft limit on draft mode only
    if (mode === "draft") {
      const limits = getPlanLimits(plan)
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

      let parsed: { hooks?: { style: string; text: string }[] } = {}
      try {
        const contentJson = await callGroq(buildHooksPrompt(body), "Generate hook alternatives.", 0.8)
        parsed = JSON.parse(contentJson)
      } catch {
        return NextResponse.json({ hooks: fallbackHooks(content, body.title) })
      }

      const cleanHooks = (parsed.hooks || [])
        .filter((h) => h?.style && h?.text && h.text.length > 8)
        .map((h) => ({ ...h, text: sanitizeGeneratedText(h.text).slice(0, 100) }))
        .slice(0, 5)

      return NextResponse.json({ hooks: cleanHooks.length ? cleanHooks : fallbackHooks(content, body.title) })
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

    // --- draft mode ---
    const prompt = String(body.prompt || "").trim()
    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 })
    if (!groqApiKey) {
      return NextResponse.json({ error: "AI generation is not configured on this server." }, { status: 503 })
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: buildDraftSystemPrompt(body) },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
      cache: "no-store",
    })

    const raw = await response.text()
    const data = raw ? JSON.parse(raw) : {}
    if (!response.ok) {
      const message = data?.error?.message || data?.message || "Failed to generate content."
      console.error("Groq API error:", message)
      return NextResponse.json({ error: cleanErrorMessage(message) }, { status: response.status })
    }

    const text = strengthenDraft(String(data?.choices?.[0]?.message?.content || ""), prompt, body.postType)
    if (!text) return NextResponse.json({ error: "AI returned an empty draft." }, { status: 502 })
    return NextResponse.json({ text })
  } catch (error) {
    const message = (error as Error).message || "Internal server error"
    if (message === "auth_required") {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    }
    console.error("Generate error:", error)
    return NextResponse.json({ error: cleanErrorMessage(message) }, { status: 500 })
  }
}
