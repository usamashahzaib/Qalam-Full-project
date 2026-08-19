import { NextRequest, NextResponse } from "next/server"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { getPlanLimits } from "@/lib/entitlements"
import { checkAndIncrementCommentUsage, getCommentUsage } from "@/lib/server/comment-usage"
import { getPlanStatus } from "@/lib/server/plan-limits-v2"
import { getWorkspaceVoiceProfile } from "@/lib/server/voice-profile"
import { professionalContextPrompt } from "@/lib/professional-context"
import { readExtensionToken } from "@/lib/server/extension-auth"

const styles = ["insightful", "supportive", "engaging"] as const
type Style = (typeof styles)[number]
const styleGuide: Record<Style, string> = {
  insightful: "Add one sharp, specific observation that builds on the post.",
  supportive: "Offer genuine, specific encouragement without gushing.",
  engaging: "React to a detail, then ask one natural follow-up question.",
}

const identityFor = (request: NextRequest) => readExtensionToken(request.headers.get("authorization"))

export async function GET(request: NextRequest) {
  const identity = identityFor(request)
  if (!identity) return NextResponse.json({ error: "extension_auth_required" }, { status: 401 })
  const status = await getPlanStatus(identity.userId)
  const limit = getPlanLimits(status.plan).commentGenerationsPerMonth
  if (limit === "unlimited") return NextResponse.json({ plan: status.plan, current: 0, limit, remaining: limit }, { headers: { "Cache-Control": "no-store" } })
  const usage = await getCommentUsage(identity.userId, limit)
  return NextResponse.json({ plan: status.plan, ...usage, remaining: Math.max(0, usage.limit - usage.current) }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const identity = identityFor(request)
  if (!identity) return NextResponse.json({ error: "extension_auth_required" }, { status: 401 })
  const status = await getPlanStatus(identity.userId)
  if (!status.isActive) return NextResponse.json({ error: "plan_expired", message: "Renew your Qalam plan to continue." }, { status: 403 })
  const limit = getPlanLimits(status.plan).commentGenerationsPerMonth
  if (limit !== "unlimited") {
    const usage = await getCommentUsage(identity.userId, limit)
    if (usage.current >= usage.limit) return NextResponse.json({ error: "monthly_limit_reached", limit: usage.limit, current: usage.current }, { status: 403 })
  }
  const body = await request.json().catch(() => null) as { postText?: unknown; style?: unknown } | null
  const postText = String(body?.postText || "").trim()
  const style = String(body?.style || "insightful").toLowerCase() as Style
  if (postText.length < 10 || postText.length > 5000) return NextResponse.json({ error: "postText must be 10 to 5000 characters" }, { status: 400 })
  if (!styles.includes(style)) return NextResponse.json({ error: "Invalid comment style" }, { status: 400 })
  const voice = identity.workspaceId ? await getWorkspaceVoiceProfile(identity.workspaceId).catch(() => undefined) : undefined
  const context = professionalContextPrompt(voice?.professionalContext)
  const prompt = `Write exactly 3 short LinkedIn comments in the ${style} style. ${styleGuide[style]} Use the professional context and voice when supplied. Reference a specific detail in the post. Do not use generic praise, hashtags, emoji, em dashes, or en dashes. Each comment is one or two sentences, under 35 words. Return JSON only: {"comments":[{"text":"string"}]}.\n\nProfessional context:\n${context || "Professional LinkedIn user"}\n\nPost:\n${postText.slice(0, 1200)}`
  try {
    const raw = await callAi("chat-strategist", prompt, "Generate the comments.", { json: true, temperature: 0.8, maxTokens: 320, userId: identity.userId, plan: status.plan, cache: false })
    const parsed = safeParseJson<{ comments?: Array<{ text?: string }> }>(raw)
    const comments = (parsed?.comments || []).filter((item) => typeof item?.text === "string" && item.text.trim()).slice(0, 3).map((item) => ({ style, text: item.text!.trim() }))
    if (!comments.length) return NextResponse.json({ error: "ai_unavailable" }, { status: 503 })
    if (limit === "unlimited") {
      return NextResponse.json({ comments, plan: status.plan, usage: { current: 0, limit, remaining: limit } }, { headers: { "Cache-Control": "no-store" } })
    }
    const usage = await checkAndIncrementCommentUsage(identity.userId, limit)
    if (!usage.allowed) return NextResponse.json({ error: "monthly_limit_reached", limit: usage.limit, current: usage.current }, { status: 403 })
    return NextResponse.json({ comments, plan: status.plan, usage: { ...usage, remaining: Math.max(0, usage.limit - usage.current) } }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 })
  }
}
