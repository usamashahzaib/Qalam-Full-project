import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
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
  userId: string
  userEmail: string
  userName?: string | null
}

export interface RunApprovalOutput {
  approvalId: string
  postTitle: string
  approval: {
    id: string
    post_id: string | null
    reviewer_email: string
    post_title: string
    post_content: string
    status: string
    message: string | null
    comments?: string | null
    created_at: string
    updated_at?: string | null
  }
}

// ─── Use case ─────────────────────────────────────────────────────────────────

export async function runApproval(input: RunApprovalInput): Promise<Result<RunApprovalOutput>> {
  const { reviewerEmail, postContent, postTitle, message, postId, userId, userEmail, userName } = input

  if (!reviewerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewerEmail)) {
    return err({ code: "VALIDATION_ERROR", message: "Valid reviewer email is required" })
  }
  if (!postContent) {
    return err({ code: "VALIDATION_ERROR", message: "Post content is required" })
  }

  const supabase = createServiceClient()
  const reviewToken = generateToken()

  const { data: approval, error } = await supabase
    .from("approvals")
    .insert({
      post_id: postId || null,
      requester_id: userId,
      reviewer_email: reviewerEmail,
      post_title: postTitle || "Untitled post",
      post_content: postContent,
      status: "pending",
      message: message || null,
      review_token_hash: hashToken(reviewToken),
    })
    .select("id, post_id, reviewer_email, post_title, post_content, status, message, comments, created_at, updated_at")
    .single()

  if (error || !approval) {
    console.error("approval_insert_failed", { message: error?.message, code: error?.code })
    const detail = error?.message?.includes("column") ? "Run migration 0026_fix_approvals_schema.sql in Supabase SQL Editor." : (error?.message ?? "DB error")
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
        : "Approval request could not be emailed. Check transactional email settings.",
    })
  }

  return ok({ approvalId: approval.id as string, postTitle: title, approval })
}
