import "server-only"

import { timingSafeEqual } from "node:crypto"
import { env } from "@/lib/server/env"
import { hashToken, generateToken } from "@/lib/server/password"
import { supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"
import { createNotification } from "@/lib/server/notifications"
import { sendTransactionalEmail } from "@/lib/server/email"
import { log } from "@/lib/server/logging"
import { sanitizeInlineComments, parseStoredInlineComments, type InlineComment } from "@/lib/agency/red-pen"
import { HEADS_UP_LEAD_MS, nextAutoApproveAction } from "@/lib/agency/approval-timing"
import { approvalHeadsUpEmail, sendAgencyEmail } from "@/lib/server/agency/emails"
import { scheduleAgencyCallback } from "@/lib/server/agency/qstash"

export type ApprovalRecord = {
  id: string
  post_id: string | null
  workspace_id: string | null
  requester_id: string
  reviewer_email: string
  post_title: string | null
  post_content: string
  status: "pending" | "approved" | "rejected"
  message: string | null
  comment: string | null
  created_at: string
  updated_at: string | null
  review_token_hash: string | null
  review_token_expires_at: string | null
  reminder_token_hash: string | null
  auto_approve_at: string | null
  heads_up_sent_at: string | null
  auto_approved: boolean
  decided_at: string | null
  inline_comments: unknown
}

const APPROVAL_COLUMNS =
  "id,post_id,workspace_id,requester_id,reviewer_email,post_title,post_content,status,message,comment,created_at,updated_at,review_token_hash,review_token_expires_at,reminder_token_hash,auto_approve_at,heads_up_sent_at,auto_approved,decided_at,inline_comments"

const sameHash = (a: string, b: string | null) => {
  if (!b || a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function loadApproval(id: string): Promise<ApprovalRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await supabaseSelect<ApprovalRecord>("approvals", `id=eq.${id}&select=${APPROVAL_COLUMNS}&limit=1`)
  return rows?.[0] ?? null
}

/** Accepts the original review link and the heads-up link, both only while the token window is open. */
export function reviewTokenMatches(approval: ApprovalRecord, token: string): boolean {
  if (!token || !approval.review_token_expires_at) return false
  if (Date.parse(approval.review_token_expires_at) <= Date.now()) return false
  const hash = hashToken(token)
  return sameHash(hash, approval.review_token_hash) || sameHash(hash, approval.reminder_token_hash)
}

export function publicApprovalView(approval: ApprovalRecord) {
  return {
    id: approval.id,
    post_title: approval.post_title,
    post_content: approval.post_content,
    status: approval.status,
    message: approval.message,
    comment: approval.comment,
    created_at: approval.created_at,
    updated_at: approval.updated_at,
    auto_approve_at: approval.status === "pending" ? approval.auto_approve_at : null,
    auto_approved: approval.auto_approved,
    inline_comments: parseStoredInlineComments(approval.inline_comments),
  }
}

export type DecisionResult =
  | { ok: true; status: "approved" | "rejected"; comment: string | null; inlineComments: InlineComment[] }
  | { ok: false; error: "not_found" | "already_reviewed" | "update_failed" }

export async function decideApproval(input: {
  approval: ApprovalRecord
  decision: "approved" | "rejected"
  comment?: string
  inlineComments?: unknown
  automatic?: boolean
}): Promise<DecisionResult> {
  const { approval, decision } = input
  if (approval.status !== "pending") return { ok: false, error: "already_reviewed" }
  const comment = (input.comment || "").trim().slice(0, 2000) || null
  const inlineComments = sanitizeInlineComments(input.inlineComments, approval.post_content)
  const now = new Date().toISOString()

  let updated: { id: string }[] | null
  try {
    updated = await supabasePatch<{ id: string }>("approvals", `id=eq.${approval.id}&status=eq.pending`, {
      status: decision,
      comment,
      inline_comments: inlineComments,
      auto_approved: Boolean(input.automatic),
      decided_at: now,
      review_token_hash: null,
      reminder_token_hash: null,
      review_token_expires_at: null,
      updated_at: now,
    })
  } catch (error) {
    log.error("approvals.decision_update_failed", { approvalId: approval.id, error: (error as Error).message })
    return { ok: false, error: "update_failed" }
  }
  if (!updated?.length) return { ok: false, error: "already_reviewed" }

  if (approval.post_id && approval.workspace_id) {
    await supabasePatch(
      "posts",
      `id=eq.${approval.post_id}&workspace_id=eq.${approval.workspace_id}&status=eq.pending_approval`,
      { status: decision, updated_at: now }
    ).catch(() => undefined)
  }

  await notifyRequester(approval, decision, comment, inlineComments, Boolean(input.automatic))
  return { ok: true, status: decision, comment, inlineComments }
}

async function notifyRequester(approval: ApprovalRecord, decision: "approved" | "rejected", comment: string | null, inlineComments: InlineComment[], automatic: boolean) {
  const title = approval.post_title || "Untitled post"
  const headline = decision === "approved"
    ? automatic ? `"${title}" was approved by silence` : `Approved: "${title}"`
    : `Needs revision: "${title}"`
  const clientParam = approval.workspace_id ? `?client=${encodeURIComponent(approval.workspace_id)}` : ""
  const body = decision === "approved"
    ? automatic ? "No reply arrived before the auto-approve window closed. It is ready to schedule." : comment || "The reviewer approved it. It is ready to schedule."
    : inlineComments.length ? `${inlineComments.length} line comment${inlineComments.length === 1 ? "" : "s"} to address.` : comment || "The reviewer asked for changes."

  await createNotification({
    userId: approval.requester_id,
    workspaceId: approval.workspace_id,
    type: "approval_decided",
    title: headline,
    body,
    link: approval.post_id ? `/writer?postId=${approval.post_id}${clientParam ? `&client=${encodeURIComponent(approval.workspace_id as string)}` : ""}` : `/approvals${clientParam}`,
  })

  try {
    const users = await supabaseSelect<{ email: string | null }>("users", `id=eq.${encodeURIComponent(approval.requester_id)}&select=email&limit=1`)
    const email = users?.[0]?.email
    if (!email) return
    await sendTransactionalEmail({
      to: email,
      subject: headline,
      text: [
        headline,
        comment ? `Reviewer note: "${comment}"` : "",
        ...inlineComments.map((item) => `On "${item.quote}": ${item.note}`),
        automatic ? "The client did not respond within the agreed window, so the draft was treated as approved." : "",
        "",
        `Open your desk: ${env.frontendOrigin}/desk`,
      ].filter(Boolean).join("\n"),
    })
  } catch (error) {
    log.warn("approvals.requester_email_failed", { approvalId: approval.id, error: (error as Error).message })
  }
}

/**
 * Advances one approval through silence-as-consent. Safe to call any number
 * of times from QStash deliveries and the daily sweep: every transition is a
 * conditional update, and the heads-up claim is written before the email.
 */
export async function processAutoApprove(approvalId: string, now = new Date()): Promise<"none" | "heads_up" | "approved" | "skipped"> {
  const approval = await loadApproval(approvalId)
  if (!approval) return "skipped"
  const action = nextAutoApproveAction(approval, now)

  if (action.kind === "heads_up") {
    const reminderToken = generateToken()
    const approveAt = action.approveAt.toISOString()
    const tokenExpiry = new Date(Math.max(
      Date.parse(approval.review_token_expires_at || "") || 0,
      action.approveAt.getTime() + 24 * 60 * 60 * 1000,
    )).toISOString()
    const claimed = await supabasePatch<{ id: string }>(
      "approvals",
      `id=eq.${approval.id}&status=eq.pending&heads_up_sent_at=is.null`,
      {
        heads_up_sent_at: now.toISOString(),
        auto_approve_at: approveAt,
        reminder_token_hash: hashToken(reminderToken),
        review_token_expires_at: tokenExpiry,
        updated_at: now.toISOString(),
      }
    )
    if (!claimed?.length) return "skipped"
    const workspaceName = await workspaceNameFor(approval.workspace_id)
    await sendAgencyEmail(approval.reviewer_email, approvalHeadsUpEmail({
      workspaceName,
      postTitle: approval.post_title || "Untitled post",
      approveAt: action.approveAt,
      reviewUrl: `${env.frontendOrigin}/approvals/${approval.id}/review?token=${encodeURIComponent(reminderToken)}`,
    }), "approvals.heads_up")
    await scheduleAgencyCallback("auto-approve", { approvalId: approval.id }, new Date(action.approveAt.getTime() + 60_000))
    return "heads_up"
  }

  if (action.kind === "approve") {
    const result = await decideApproval({ approval, decision: "approved", automatic: true })
    return result.ok ? "approved" : "skipped"
  }
  return "none"
}

export async function scheduleAutoApproveCallbacks(approvalId: string, autoApproveAt: Date) {
  await scheduleAgencyCallback("auto-approve", { approvalId }, new Date(autoApproveAt.getTime() - HEADS_UP_LEAD_MS))
}

async function workspaceNameFor(workspaceId: string | null) {
  if (!workspaceId) return "your workspace"
  const rows = await supabaseSelect<{ name: string | null }>("workspaces", `id=eq.${workspaceId}&select=name&limit=1`).catch(() => [])
  return rows?.[0]?.name || "your workspace"
}
