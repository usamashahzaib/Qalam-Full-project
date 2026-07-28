import "server-only"

import { env } from "@/lib/server/env"
import { checkCircuit, recordFailure, recordSuccess } from "@/lib/server/circuit-breaker"
import { markLinkedInTokenInvalid } from "@/lib/server/linkedin-credentials"

const CIRCUIT_KEY = "linkedin"
export const LINKEDIN_MAX_POST_CHARS = 3000
const USER_AGENT = "Qalam/1.0 (+https://byqalam.com)"

export type LinkedInPostAnalytics = {
  impressions: number
  reactions: number | null
  comments: number | null
  reposts: number | null
  engagementRate: number | null
}

const EMPTY_ANALYTICS: LinkedInPostAnalytics = {
  impressions: 0,
  reactions: null,
  comments: null,
  reposts: null,
  engagementRate: null,
}

type LinkedInPostPayload = {
  accessToken: string
  authorId: string
  content: string
  media?: { id?: string; title?: string } | null
  // Optional owner context so a 401 can flag the stored credential as expired.
  userId?: string | null
  workspaceId?: string | null
}

export class LinkedInApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "LinkedInApiError"
    this.status = status
  }
}

const assertLinkedInLength = (content: string) => {
  if (content.length > LINKEDIN_MAX_POST_CHARS) {
    throw new LinkedInApiError("linkedin_content_too_long", 400)
  }
}

const linkedInHeaders = (accessToken: string, json = false) => ({
  Authorization: `Bearer ${accessToken}`,
  "X-Restli-Protocol-Version": "2.0.0",
  "Linkedin-Version": env.linkedInVersion,
  "User-Agent": USER_AGENT,
  ...(json ? { "Content-Type": "application/json" } : {}),
})

const parseLinkedInError = async (response: Response) => {
  const body = await response.json().catch(() => ({})) as { message?: string; error?: string }
  return body.message || body.error || response.statusText || "linkedin_request_failed"
}

const createSharePayload = ({ authorId, content, media }: LinkedInPostPayload) => ({
  author: `urn:li:person:${authorId}`,
  commentary: content,
  visibility: "PUBLIC",
  distribution: {
    feedDistribution: "MAIN_FEED",
    targetEntities: [],
    thirdPartyDistributionChannels: [],
  },
  ...(media?.id ? { content: { media: { id: media.id, title: media.title || "Attachment" } } } : {}),
  lifecycleState: "PUBLISHED",
  isReshareDisabledByAuthor: false,
})

const createUgcSharePayload = ({ authorId, content }: LinkedInPostPayload) => ({
  author: `urn:li:person:${authorId}`,
  lifecycleState: "PUBLISHED",
  specificContent: {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: { text: content },
      shareMediaCategory: "NONE",
    },
  },
  visibility: {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
  },
})

export const shareToLinkedIn = async (payload: LinkedInPostPayload) => {
  assertLinkedInLength(payload.content)
  if (!(await checkCircuit(CIRCUIT_KEY))) throw new Error("linkedin_circuit_open")

  try {
    // Share on LinkedIn Default Tier grants w_member_social and publishes text
    // through UGC Posts. The versioned /rest/posts endpoint belongs to the
    // restricted Marketing APIs and rejects Default Tier applications.
    const isDocumentPost = Boolean(payload.media?.id)
    const response = await fetch(isDocumentPost
      ? "https://api.linkedin.com/rest/posts"
      : "https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: linkedInHeaders(payload.accessToken, true),
      body: JSON.stringify(isDocumentPost ? createSharePayload(payload) : createUgcSharePayload(payload)),
      cache: "no-store",
    })

    if (!response.ok) {
      // Token rejected - flag the stored credential so the UI can prompt a reconnect.
      if (response.status === 401 && (payload.userId || payload.workspaceId)) {
        await markLinkedInTokenInvalid({ userId: payload.userId, workspaceId: payload.workspaceId })
      }
      throw new LinkedInApiError(await parseLinkedInError(response), response.status)
    }
    const postUrn = response.headers.get("x-restli-id")
    if (!postUrn) throw new Error("linkedin_publish_unconfirmed")

    await recordSuccess(CIRCUIT_KEY)
    return { shared: true, postUrn }
  } catch (err) {
    await recordFailure(CIRCUIT_KEY)
    throw err
  }
}

type DocumentUploadPayload = {
  accessToken: string
  authorId: string
  pdfBytes: Buffer
  userId?: string | null
  workspaceId?: string | null
}

/**
 * Uploads a PDF as a LinkedIn "document" asset (LinkedIn's carousel format)
 * and returns its URN, ready to pass as `media.id` to shareToLinkedIn.
 * Two-step LinkedIn flow: initializeUpload gives a one-time upload URL and
 * a document URN, then the raw bytes are PUT to that URL.
 */
export const uploadLinkedInDocument = async (payload: DocumentUploadPayload): Promise<string> => {
  if (!(await checkCircuit(CIRCUIT_KEY))) throw new Error("linkedin_circuit_open")

  try {
    const initRes = await fetch("https://api.linkedin.com/rest/documents?action=initializeUpload", {
      method: "POST",
      headers: linkedInHeaders(payload.accessToken, true),
      body: JSON.stringify({
        initializeUploadRequest: { owner: `urn:li:person:${payload.authorId}` },
      }),
      cache: "no-store",
    })

    if (!initRes.ok) {
      if (initRes.status === 401 && (payload.userId || payload.workspaceId)) {
        await markLinkedInTokenInvalid({ userId: payload.userId, workspaceId: payload.workspaceId })
      }
      throw new LinkedInApiError(await parseLinkedInError(initRes), initRes.status)
    }

    const initData = await initRes.json() as { value?: { uploadUrl?: string; document?: string } }
    const uploadUrl = initData.value?.uploadUrl
    const documentUrn = initData.value?.document
    if (!uploadUrl || !documentUrn) throw new Error("linkedin_document_init_failed")

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
        "Content-Type": "application/pdf",
      },
      body: new Uint8Array(payload.pdfBytes),
    })

    if (!uploadRes.ok) throw new LinkedInApiError("linkedin_document_upload_failed", uploadRes.status)

    await recordSuccess(CIRCUIT_KEY)
    return documentUrn
  } catch (err) {
    await recordFailure(CIRCUIT_KEY)
    throw err
  }
}

export const pollLinkedInAnalytics = async (
  accessToken: string,
  postUrn: string,
  userId?: string | null
): Promise<LinkedInPostAnalytics> => {
  const url = `https://api.linkedin.com/rest/posts/${encodeURIComponent(postUrn)}?fields=lifecycleState,totalShareStatistics`

  if (!(await checkCircuit(CIRCUIT_KEY))) {
    console.warn("LinkedIn circuit open, skipping analytics poll")
    return { ...EMPTY_ANALYTICS }
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: linkedInHeaders(accessToken),
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 401 && userId) {
        await markLinkedInTokenInvalid({ userId })
      }
      throw new LinkedInApiError("linkedin_analytics_failed", response.status)
    }
    const data = await response.json() as {
      totalShareStatistics?: {
        impressionCount?: number
        engagementRate?: number
        likeCount?: number
        commentCount?: number
        shareCount?: number
      }
    }
    const stats = data.totalShareStatistics

    await recordSuccess(CIRCUIT_KEY)
    return {
      impressions: stats?.impressionCount ?? 0,
      reactions: stats?.likeCount ?? null,
      comments: stats?.commentCount ?? null,
      reposts: stats?.shareCount ?? null,
      engagementRate: stats?.engagementRate ?? null,
    }
  } catch (e) {
    await recordFailure(CIRCUIT_KEY)
    console.error("LinkedIn Analytics API error", e)
    return { ...EMPTY_ANALYTICS }
  }
}
