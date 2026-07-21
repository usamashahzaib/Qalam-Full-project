import { NextRequest, NextResponse } from "next/server"
import { requireAuth, getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { requireRole, errorToStatus } from "@/lib/server/roles"
import { requirePlan } from "@/lib/server/require-plan"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { shareToLinkedIn, uploadLinkedInDocument, LinkedInApiError, LINKEDIN_MAX_POST_CHARS } from "@/lib/server/linkedin"
import { ensureFreshLinkedInPublishingAccount, ensureFreshLinkedInToken } from "@/lib/server/linkedin-credentials"

const MAX_PDF_BYTES = 20 * 1024 * 1024

/**
 * Takes an already-rendered PDF from the client (multipart form) rather than
 * rebuilding one server-side. The editor's branding - author name, photo,
 * background image, color overrides - lives only in client render state and
 * is never persisted, so the server has no way to reconstruct the same PDF
 * the user previewed and downloaded. Publishing the client's own capture is
 * the only way the LinkedIn post matches what the user actually approved.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await requireAuth()
  const planCheck = await requirePlan(request, "Solo")
  if (!planCheck.ok) return planCheck.response
  if (!planCheck.limits.linkedinPublish) {
    return NextResponse.json({ error: "upgrade_required", requiredFeature: "linkedinPublish" }, { status: 403 })
  }

  const { id } = await context.params
  const ctx = await getWorkspaceSessionContext()

  let workspaceId: string
  try {
    workspaceId = await resolveWorkspaceId(request)
    // Client reviewers/viewers can view a carousel but must not be able to
    // push it live to the client's own LinkedIn account.
    await requireRole(request, workspaceId, "editor")
  } catch (error) {
    const message = (error as Error).message || "auth_required"
    return NextResponse.json({ error: message }, { status: errorToStatus(message) })
  }

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "share_payload_invalid" }, { status: 400 })

  const commentary = String(form.get("commentary") || "").trim()
  if (!commentary) return NextResponse.json({ error: "share_payload_invalid" }, { status: 400 })
  if (commentary.length > LINKEDIN_MAX_POST_CHARS) {
    return NextResponse.json({ error: "Post exceeds LinkedIn's 3000 character limit." }, { status: 400 })
  }

  const pdfFile = form.get("pdf")
  if (!(pdfFile instanceof Blob) || pdfFile.size === 0) {
    return NextResponse.json({ error: "carousel_pdf_missing" }, { status: 400 })
  }
  if (pdfFile.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "carousel_pdf_too_large" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: carousel, error: loadError } = await supabase
    .from("carousels")
    .select("id, topic")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })
  if (!carousel) return NextResponse.json({ error: "Carousel not found" }, { status: 404 })

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

  let documentUrn: string
  try {
    const pdfBytes = Buffer.from(await pdfFile.arrayBuffer())
    documentUrn = await uploadLinkedInDocument({
      accessToken,
      authorId,
      pdfBytes,
      userId: ctx.supabaseUserId,
      workspaceId,
    })
  } catch (error) {
    const message = (error as Error).message || "linkedin_document_upload_failed"
    const status = error instanceof LinkedInApiError ? error.status : 502
    return NextResponse.json({ error: message }, { status })
  }

  let shared: { shared: boolean; postUrn: string | null }
  try {
    shared = await shareToLinkedIn({
      accessToken,
      authorId,
      content: commentary,
      media: { id: documentUrn, title: carousel.topic || "Carousel" },
      userId: ctx.supabaseUserId,
      workspaceId,
    })
  } catch (error) {
    const message = (error as Error).message || "linkedin_publish_failed"
    const status = error instanceof LinkedInApiError ? error.status : 502
    return NextResponse.json({ error: message }, { status })
  }

  // LinkedIn share succeeded - the carousel is live. A failure to record that
  // here is a display-only issue (the carousel list won't show "published"),
  // never a reason to report the publish itself as failed.
  const { error: markError } = await supabase
    .from("carousels")
    .update({ linkedin_post_urn: shared.postUrn, published_at: new Date().toISOString() })
    .eq("id", id)
  if (markError) console.error("[carousel publish] failed to record publish state:", markError.message)

  return NextResponse.json({ ...shared, documentUrn })
}
