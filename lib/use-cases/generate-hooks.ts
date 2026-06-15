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

  const limit = await checkPlanLimit(userId, "hooks")
  if (!limit.allowed) {
    return err({ code: "PLAN_LIMIT_EXCEEDED", message: "Hook limit reached", userMessage: "Hook limit reached. Upgrade your plan." })
  }

  const mappedRole = ROLE_MAP[role] ?? "founder"
  const { system, user: userMsg } = buildHook5StylesPrompt(topic, mappedRole)
  const raw = await callAi(system, userMsg, {
    json: false, temperature: 0.9, maxTokens: 700,
    userId, plan, cache: false,
  })

  const parsed = safeParseJson<unknown>(raw)
  const hooks: Hook[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { hooks?: unknown })?.hooks)
      ? (parsed as { hooks: Hook[] }).hooks
      : []

  if (!hooks.length) {
    return err({ code: "AI_UNAVAILABLE", message: "Hook generation returned no results", userMessage: "Hook generation returned no results. Please try again." })
  }

  const usage = await incrementUsage(userId, "hooks")

  return ok({ hooks: hooks.slice(0, 5), remaining: usage.remaining })
}
