import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { env } from "@/lib/server/env"
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
  plan: string
}

export interface RunApprovalOutput {
  approvalId: string
  postTitle: string
}

const isProOrAbove = (plan: string) => {
  const p = plan.toLowerCase()
  return p === "pro" || p === "agency" || p.startsWith("agency")
}

// ─── Use case ─────────────────────────────────────────────────────────────────

export async function runApproval(input: RunApprovalInput): Promise<Result<RunApprovalOutput>> {
  const { reviewerEmail, postContent, postTitle, message, postId, userId, userEmail, userName, plan } = input

  if (!isProOrAbove(plan)) {
    return err({ code: "FORBIDDEN", message: "Approval workflow requires Pro plan.", userMessage: "Approval workflow requires Pro plan." })
  }

  if (!reviewerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewerEmail)) {
    return err({ code: "VALIDATION_ERROR", message: "Valid reviewer email is required" })
  }
  if (!postContent) {
    return err({ code: "VALIDATION_ERROR", message: "Post content is required" })
  }

  const supabase = createServiceClient()

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
    })
    .select("id, post_title, status, created_at")
    .single()

  if (error || !approval) {
    console.error("approval_insert_failed", { message: error?.message, code: error?.code })
    const detail = error?.message?.includes("column") ? "Run migration 0026_fix_approvals_schema.sql in Supabase SQL Editor." : (error?.message ?? "DB error")
    return err({ code: "INTERNAL_ERROR", message: "Approval DB not ready", userMessage: detail })
  }

  const reviewUrl = `${env.frontendOrigin}/approvals/${approval.id}/review`
  const requesterName = userName || userEmail || "Someone"
  const title = postTitle || "Untitled post"

  await sendTransactionalEmail({
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

  return ok({ approvalId: approval.id as string, postTitle: title })
}
