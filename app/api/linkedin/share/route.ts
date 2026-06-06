import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/clerk-client"
import { getClerkAuthContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { shareToLinkedIn } from "@/lib/server/linkedin"
import { getLinkedInPublishingAccount, getLinkedInToken } from "@/lib/server/linkedin-credentials"
import { supabaseInsert } from "@/lib/server/supabase-rest"

type ShareRequestBody = {
  content?: string
  postId?: string | null
  media?: { id?: string; title?: string } | null
}

export async function POST(request: NextRequest) {
    const userId = await requireAuth()

  const ctx = await getClerkAuthContext()
  const body = (await request.json()) as ShareRequestBody
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "share_payload_invalid" }, { status: 400 })
  }

  let workspaceId: string
  try {
    workspaceId = await resolveWorkspaceId(request)
  } catch (error) {
    const message = (error as Error).message || "auth_required"
    return NextResponse.json({ error: message }, { status: (message === "auth_required" || message === "Unauthorized") ? 401 : 500 })
  }

  const account = await getLinkedInPublishingAccount(workspaceId)
  const legacyCred = account ? null : await getLinkedInToken(ctx.email)
  const accessToken = account?.access_token || legacyCred?.access_token || null
  const authorId = account?.provider_account_id || legacyCred?.member_id || null
  const expiresAt = account?.expires_at ? Date.parse(account.expires_at) : legacyCred?.token_expires_at || null

  if (!accessToken || !authorId) {
    return NextResponse.json({ error: "linkedin_auth_required" }, { status: 401 })
  }
  if (expiresAt && expiresAt < Date.now()) {
    return NextResponse.json({ error: "linkedin_token_expired" }, { status: 401 })
  }

  let shared: { shared: boolean; postUrn: string | null }
  try {
    shared = await shareToLinkedIn({
      accessToken,
      authorId,
      content: body.content,
      media: body.media || undefined,
    })
  } catch (error) {
    const publishError = (error as Error).message || "linkedin_publish_failed"
    if (body.postId) {
      await supabaseInsert(
        "publish_logs",
        {
          post_id: body.postId,
          account_id: account?.id || null,
          status: "failed",
          error_message: publishError,
          provider_response: null,
        },
        "return=minimal"
      ).catch(() => undefined)
    }
    return NextResponse.json({ error: publishError }, { status: 502 })
  }

  if (body.postId && shared.postUrn) {
    await supabaseInsert(
      "publish_logs",
      {
        post_id: body.postId,
        account_id: account?.id || null,
        status: "success",
        error_message: null,
        provider_response: { postUrn: shared.postUrn },
      },
      "return=minimal"
    ).catch(() => undefined)
  }

  return NextResponse.json(shared)
}
