import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { shareToLinkedIn, LinkedInApiError, LINKEDIN_MAX_POST_CHARS } from "@/lib/server/linkedin"
import { ensureFreshLinkedInPublishingAccount, ensureFreshLinkedInToken } from "@/lib/server/linkedin-credentials"
import { createServiceClient, supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"
import { SupabasePostRepository } from "@/lib/repositories/supabase/SupabasePostRepository"
import { isReadyContentScore, MIN_READY_CONTENT_SCORE } from "@/lib/content-score-gate"
import { acquireLinkedInPublishLock } from "@/lib/server/linkedin-publish-lock"

type ShareRequestBody = {
  content?: string
  postId?: string | null
  media?: { id?: string; title?: string } | null
}

const postRepo = new SupabasePostRepository()

export async function POST(request: NextRequest) {
  const { requirePlan } = await import("@/lib/server/require-plan")
  // Solo and above: PLAN_CONFIG grants linkedinPublish from Solo up, and the
  // flag check below is the real capability gate.
  const planCheck = await requirePlan(request, "Solo")
  if (!planCheck.ok) return planCheck.response
  if (!planCheck.limits.linkedinPublish) {
    return NextResponse.json({ error: "upgrade_required", requiredFeature: "linkedinPublish" }, { status: 403 })
  }

  const ctx = await getWorkspaceSessionContext()
  const body = (await request.json()) as ShareRequestBody
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "share_payload_invalid" }, { status: 400 })
  }
  if (body.content.length > LINKEDIN_MAX_POST_CHARS) {
    return NextResponse.json({ error: "Post exceeds LinkedIn's 3000 character limit." }, { status: 400 })
  }

  let workspaceId: string
  try {
    workspaceId = await resolveWorkspaceId(request)
    // A client_reviewer or viewer can be a member of a workspace to approve
    // or read drafts, but must not be able to publish to the client's
    // LinkedIn account directly.
    await requireRole(request, workspaceId, "editor")
  } catch (error) {
    const message = (error as Error).message || "auth_required"
    return NextResponse.json({ error: message }, { status: errorToStatus(message) })
  }

  if (!body.postId) {
    return NextResponse.json({ error: "post_id_required" }, { status: 400 })
  }

  const post = await postRepo.get(body.postId, workspaceId)
  if (!post) return NextResponse.json({ error: "post_not_found" }, { status: 404 })
  if ((post.content || "").trim() !== body.content.trim()) {
    return NextResponse.json({ error: "post_content_changed" }, { status: 409 })
  }
  if (post.status === "published" && post.linkedin_post_id) {
    return NextResponse.json({ shared: true, postUrn: post.linkedin_post_id, alreadyPublished: true })
  }
  const prior = await supabaseSelect<{ provider_response?: { postUrn?: string } | null }>(
    "publish_logs",
    `post_id=eq.${encodeURIComponent(body.postId)}&status=eq.success&select=provider_response&order=created_at.desc&limit=1`
  ).catch(() => [])
  const priorUrn = prior?.[0]?.provider_response?.postUrn
  if (priorUrn) {
    await postRepo.update(body.postId, workspaceId, {
      status: "published",
      publishedAt: new Date().toISOString(),
      externalPostUrn: priorUrn,
    }).catch(() => null)
    return NextResponse.json({ shared: true, postUrn: priorUrn, alreadyPublished: true })
  }
  if (!isReadyContentScore(post.engagement_score)) {
    return NextResponse.json(
      {
        error: "content_score_below_minimum",
        minimum: MIN_READY_CONTENT_SCORE,
        currentScore: post.engagement_score ?? null,
      },
      { status: 409 }
    )
  }

  const lock = await acquireLinkedInPublishLock(body.postId)
  if (!lock.locked) {
    return NextResponse.json({ error: "publish_already_in_progress" }, { status: 409 })
  }

  let claimed = false
  let sharedOnLinkedIn = false
  try {
    const service = createServiceClient()
    const { data: claimState, error: claimError } = await service.rpc("claim_manual_linkedin_publish", {
      p_post_id: body.postId,
      p_workspace_id: workspaceId,
      p_content: body.content,
    })
    if (claimError) return NextResponse.json({ error: "publish_claim_failed" }, { status: 503 })
    if (claimState === "published") {
      return NextResponse.json({ shared: true, postUrn: post.linkedin_post_id || null, alreadyPublished: true })
    }
    if (claimState !== "claimed") {
      const status = claimState === "not_found" ? 404 : claimState === "score_too_low" ? 409 : 409
      return NextResponse.json({ error: `publish_${claimState || "not_ready"}` }, { status })
    }
    claimed = true

    const account = await ensureFreshLinkedInPublishingAccount(workspaceId)
    const legacyCred = account ? null : await ensureFreshLinkedInToken(ctx.supabaseUserId)
    const accessToken = account?.access_token || legacyCred?.access_token || null
    const authorId = account?.provider_account_id || legacyCred?.member_id || null
    const expiresAt = account?.expires_at ? Date.parse(account.expires_at) : legacyCred?.token_expires_at || null

    if (!accessToken || !authorId) {
      return NextResponse.json({ error: "linkedin_auth_required" }, { status: 401 })
    }
    if (expiresAt && expiresAt < Date.now()) {
      return NextResponse.json({ error: "linkedin_token_expired", reconnectRequired: true }, { status: 401 })
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    const tokenNearExpiry = expiresAt != null && expiresAt - Date.now() < SEVEN_DAYS_MS

    let shared: { shared: boolean; postUrn: string | null }
    try {
      shared = await shareToLinkedIn({
        accessToken,
        authorId,
        content: body.content,
        media: body.media || undefined,
        userId: ctx.supabaseUserId,
        workspaceId,
      })
      sharedOnLinkedIn = true
    } catch (error) {
      const publishError = (error as Error).message || "linkedin_publish_failed"
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
      const status = error instanceof LinkedInApiError ? error.status : 502
      return NextResponse.json({ error: publishError }, { status })
    }

    let finalized = false
    for (let attempt = 0; attempt < 3 && !finalized; attempt++) {
      const { data, error } = await service.rpc("finalize_manual_linkedin_publish", {
        p_post_id: body.postId,
        p_workspace_id: workspaceId,
        p_account_id: account?.id || null,
        p_post_urn: shared.postUrn,
      })
      finalized = !error && data === true
      if (!finalized && attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
    if (!finalized) {
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
      await postRepo.update(body.postId, workspaceId, {
        status: "published",
        publishedAt: new Date().toISOString(),
        externalPostUrn: shared.postUrn,
      }).catch(() => null)
    }

    return NextResponse.json({ ...shared, tokenNearExpiry })
  } finally {
    if (claimed && !sharedOnLinkedIn) {
      try {
        await createServiceClient().rpc("release_manual_linkedin_publish", {
          p_post_id: body.postId,
          p_workspace_id: workspaceId,
        })
      } catch {}
    }
    await lock.release()
  }
}
