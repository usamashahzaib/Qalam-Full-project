import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { env } from "@/lib/server/env"

const isProOrAbove = (plan: string) => {
  const p = plan.toLowerCase()
  return p === "pro" || p === "agency" || p.startsWith("agency")
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const supabase = createServiceClient()

    const { data: rows } = await supabase
      .from("approvals")
      .select("id, post_id, reviewer_email, post_title, post_content, status, message, comment, created_at, updated_at")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    return NextResponse.json({ approvals: rows || [] })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    if (!isProOrAbove(user.plan)) {
      return NextResponse.json({ error: "Approval workflow requires Pro plan." }, { status: 403 })
    }

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const reviewerEmail = String(body.reviewerEmail || "").trim().toLowerCase()
    const postContent = String(body.postContent || "").trim()
    const postTitle = String(body.postTitle || "").trim() || "Untitled post"
    const message = String(body.message || "").trim()
    const postId = body.postId ? String(body.postId) : null

    if (!reviewerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewerEmail)) {
      return NextResponse.json({ error: "Valid reviewer email is required" }, { status: 400 })
    }
    if (!postContent) {
      return NextResponse.json({ error: "Post content is required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: approval, error } = await supabase
      .from("approvals")
      .insert({
        post_id: postId,
        requester_id: user.id,
        reviewer_email: reviewerEmail,
        post_title: postTitle,
        post_content: postContent,
        status: "pending",
        message: message || null,
      })
      .select("id, post_title, status, created_at")
      .single()

    if (error || !approval) {
      return NextResponse.json({ error: "Failed to create approval request" }, { status: 500 })
    }

    const reviewUrl = `${env.frontendOrigin}/approvals/${approval.id}/review`
    const requesterName = user.name || user.email || "Someone"

    await sendTransactionalEmail({
      to: reviewerEmail,
      subject: `Review request: "${postTitle}"`,
      text: [
        `${requesterName} has sent you a LinkedIn post to review.`,
        "",
        message ? `Their message: "${message}"` : "",
        "",
        `Post: "${postTitle}"`,
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

    return NextResponse.json({ approval }, { status: 201 })
  })(request)
}
