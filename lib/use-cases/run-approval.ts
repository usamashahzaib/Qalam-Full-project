import "server-only"

import { z } from "zod"
import { createScopedClient, createServiceClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { env } from "@/lib/server/env"
import { generateToken, hashToken } from "@/lib/server/password"
import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunApprovalInput {
  reviewerEmail: string
  postContent: string
  postTitle: string
  message?: string
  postId?: string | null
  workspaceId: string
  userId: string
  userEmail: string
  userName?: string | null
}

export interface RunApprovalOutput {
  approvalId: string
  postTitle: string
  /**
   * Only the hash is persisted server-side, so this raw token exists solely in this
   * response - it cannot be recovered later (e.g. on a page reload / GET /api/approvals).
   * Callers should let the requester copy/open the review link now or never.
   */
  reviewToken: string
  approval: {
    id: string
    post_id: string | null
    reviewer_email: string
    post_title: string
    post_content: string
    status: string
    message: string | null
    comment?: string | null
    created_at: string
    updated_at?: string | null
  }
}

const postIdSchema = z.string().uuid("Post ID must be a valid UUID")

// ─── Use case ─────────────────────────────────────────────────────────────────

export async function runApproval(input: RunApprovalInput): Promise<Result<RunApprovalOutput>> {
  const { reviewerEmail, postContent, postTitle, message, postId, workspaceId, userId, userEmail, userName } = input

  if (!reviewerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewerEmail)) {
    return err({ code: "VALIDATION_ERROR", message: "Valid reviewer email is required" })
  }
  if (!postContent) {
    return err({ code: "VALIDATION_ERROR", message: "Post content is required" })
  }

  const supabase = createServiceClient()
  const reviewToken = generateToken()

  if (postId) {
    const parsedPostId = postIdSchema.safeParse(postId)
    if (!parsedPostId.success) {
      return err({ code: "VALIDATION_ERROR", message: "Post ID must be a valid UUID" })
    }
    const { data: linkedPost, error: linkedPostError } = await createScopedClient(workspaceId)
      .from("posts")
      .select("id")
      .eq("id", parsedPostId.data)
      .maybeSingle()
    if (linkedPostError) {
      return err({ code: "INTERNAL_ERROR", message: "Could not verify the linked post" })
    }
    if (!linkedPost) {
      return err({ code: "VALIDATION_ERROR", message: "Post does not belong to this workspace" })
    }
  }

  const { data: approval, error } = await supabase
    .from("approvals")
    .insert({
      post_id: postId || null,
      workspace_id: workspaceId,
      requester_id: userId,
      reviewer_email: reviewerEmail,
      post_title: postTitle || "Untitled post",
      post_content: postContent,
      status: "pending",
      message: message || null,
      review_token_hash: hashToken(reviewToken),
      review_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, post_id, reviewer_email, post_title, post_content, status, message, comment, created_at, updated_at")
    .single()

  if (error || !approval) {
    console.error("approval_insert_failed", { message: error?.message, code: error?.code })
    let detail = error?.message ?? "DB error"
    if (error?.message?.includes("review_token_hash")) {
      detail = "Run migration 0027_approval_review_tokens.sql in Supabase SQL Editor."
    } else if (error?.message?.includes("workspace_id")) {
      detail = "Run migration 0048_agency_team_and_approvals.sql in Supabase SQL Editor."
    } else if (error?.message?.includes("column") || error?.message?.includes("schema_not_applied")) {
      detail = "Run migrations 0026 and 0027 in Supabase SQL Editor (supabase/migrations/)."
    }
    return err({ code: "INTERNAL_ERROR", message: "Approval DB not ready", userMessage: detail })
  }

  const reviewUrl = `${env.frontendOrigin}/approvals/${approval.id}/review?token=${encodeURIComponent(reviewToken)}`
  const requesterName = userName || userEmail || "Someone"
  const title = postTitle || "Untitled post"

  const sent = await sendTransactionalEmail({
    to: reviewerEmail,
    subject: `Review request: "${title}"`,
    text: [
      `${requesterName} has sent you a LinkedIn post to review.`,
      "",
      message ? `Their message: "${message}"` : "",
      "",
      `Post: "${title}"`,
      "",
      "---",
      postContent.slice(0, 500) + (postContent.length > 500 ? "..." : ""),
      "---",
      "",
      `Review it here: ${reviewUrl}`,
      "",
      "You can approve or request changes at the link above.",
    ].filter((l) => l !== undefined).join("\n"),
  })
  if (!sent.ok) {
    await supabase.from("approvals").delete().eq("id", approval.id)
    return err({
      code: "INTERNAL_ERROR",
      message: `Approval email failed: ${sent.error || "unknown"}`,
      userMessage: sent.error === "no_api_key"
        ? "Email is not configured. Set RESEND_API_KEY to send approval requests."
        : `Approval email failed: ${sent.error || "unknown error"}.`,
    })
  }

  return ok({ approvalId: approval.id as string, postTitle: title, reviewToken, approval })
}
