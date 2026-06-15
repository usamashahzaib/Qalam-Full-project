import "server-only"

import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { checkPlanLimit, incrementUsage } from "@/lib/server/plan-limits-v2"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { buildHook5StylesPrompt } from "@/lib/prompts/role-aware-system"

export const ROLE_MAP: Record<string, string> = {
  HR: "hr",
  Marketing: "marketer",
  Founder: "founder",
  Consultant: "consultant",
  Sales: "sales",
  Tech: "developer",
  Other: "ceo",
}

export interface GenerateHooksInput {
  topic: string
  role: string
  format?: string
  goal?: string
  userId: string
  plan: string
}

export interface Hook {
  style: string
  text: string
}

export async function generateHooks(input: GenerateHooksInput): Promise<Result<{ hooks: Hook[]; remaining: number }>> {
  const { topic, role, userId, plan } = input

  let limit: Awaited<ReturnType<typeof checkPlanLimit>>
  try {
    limit = await checkPlanLimit(userId, "hooks")
  } catch {
    return err({ code: "INTERNAL_ERROR", message: "Usage check failed", userMessage: "Could not verify your usage limit. Please try again in a moment." })
  }

  if (!limit.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Hook limit reached", userMessage: "Hook limit reached. Upgrade your plan." })
  }

  const mappedRole = ROLE_MAP[role] ?? "founder"
  const { system, user: userMsg } = buildHook5StylesPrompt(topic, mappedRole)
  const fallback = [
    { style: "SHARP", text: `${topic}: the hidden cost is not the tool, it is the workflow around it.` },
    { style: "AUTHORITY", text: `Most teams approach ${topic} backwards: they buy first, then define the use case.` },
    { style: "STORY", text: `I changed my mind about ${topic} after seeing what actually breaks in the field.` },
    { style: "CURIOSITY", text: `What if the biggest blocker to ${topic} is not technical at all?` },
    { style: "DIRECT", text: `${topic} works when the outcome is specific before the system is built.` },
  ]
  const raw = await callAi(system, userMsg, {
    json: false, temperature: 0.9, maxTokens: 700,
    userId, plan, cache: false,
  }).catch(() => JSON.stringify(fallback))

  const parsed = safeParseJson<unknown>(raw)
  const hooks: Hook[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { hooks?: unknown })?.hooks)
      ? (parsed as { hooks: Hook[] }).hooks
      : []

  const safeIncrement = async () => {
    try {
      return await incrementUsage(userId, "hooks")
    } catch {
      return { remaining: limit.remaining - 1 }
    }
  }

  if (!hooks.length) {
    const usage = await safeIncrement()
    return ok({ hooks: fallback, remaining: usage.remaining })
  }

  const usage = await safeIncrement()
  return ok({ hooks: hooks.slice(0, 5), remaining: usage.remaining })
}
