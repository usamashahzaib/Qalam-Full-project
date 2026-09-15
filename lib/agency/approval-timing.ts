const HOUR_MS = 60 * 60 * 1000

export const HEADS_UP_LEAD_MS = 2 * HOUR_MS
export const AUTO_APPROVE_HOUR_OPTIONS = [24, 48, 72, 144] as const

export function isValidAutoApproveHours(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 24 && value <= 144
}

export function autoApproveAt(createdAt: Date, hours: number | null | undefined): Date | null {
  if (!isValidAutoApproveHours(hours)) return null
  return new Date(createdAt.getTime() + hours * HOUR_MS)
}

export type AutoApproveState = {
  status: string
  auto_approve_at: string | null
  heads_up_sent_at: string | null
}

export type AutoApproveAction =
  | { kind: "none" }
  | { kind: "heads_up"; approveAt: Date }
  | { kind: "approve" }

/**
 * A client is never auto-approved without a heads-up at least two hours
 * before the decision. If the sweep arrives late (the heads-up moment has
 * already passed, or even the decision moment), the decision moves to two
 * hours after the heads-up instead of approving on the spot.
 */
export function nextAutoApproveAction(state: AutoApproveState, now: Date): AutoApproveAction {
  if (state.status !== "pending" || !state.auto_approve_at) return { kind: "none" }
  const approveAt = Date.parse(state.auto_approve_at)
  if (!Number.isFinite(approveAt)) return { kind: "none" }
  const nowMs = now.getTime()

  if (!state.heads_up_sent_at) {
    if (nowMs < approveAt - HEADS_UP_LEAD_MS) return { kind: "none" }
    return { kind: "heads_up", approveAt: new Date(Math.max(approveAt, nowMs + HEADS_UP_LEAD_MS)) }
  }

  const headsUpAt = Date.parse(state.heads_up_sent_at)
  if (nowMs >= approveAt && Number.isFinite(headsUpAt) && nowMs - headsUpAt >= HEADS_UP_LEAD_MS - 60_000) {
    return { kind: "approve" }
  }
  return { kind: "none" }
}

export function describeAutoApproveHours(hours: number): string {
  return hours % 24 === 0 ? `${hours / 24} day${hours === 24 ? "" : "s"}` : `${hours} hours`
}
