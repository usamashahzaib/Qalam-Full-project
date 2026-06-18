import { env } from "@/lib/server/env"
import { checkCircuit, recordFailure, recordSuccess } from "@/lib/server/circuit-breaker"

const CIRCUIT_KEY = "linkedin"
export const LINKEDIN_MAX_POST_CHARS = 3000
const USER_AGENT = "Qalam/1.0 (+https://byqalam.com)"

type LinkedInPostPayload = {
  accessToken: string
  authorId: string
  content: string
  media?: { id?: string; title?: string } | null
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

export const shareToLinkedIn = async (payload: LinkedInPostPayload) => {
  assertLinkedInLength(payload.content)
  if (!(await checkCircuit(CIRCUIT_KEY))) throw new Error("linkedin_circuit_open")

  try {
    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: linkedInHeaders(payload.accessToken, true),
      body: JSON.stringify(createSharePayload(payload)),
      cache: "no-store",
    })

    if (!response.ok) throw new LinkedInApiError(await parseLinkedInError(response), response.status)
    const postUrn = response.headers.get("x-restli-id")
    if (!postUrn) throw new Error("linkedin_publish_unconfirmed")

    await recordSuccess(CIRCUIT_KEY)
    return { shared: true, postUrn }
  } catch (err) {
    await recordFailure(CIRCUIT_KEY)
    throw err
  }
}

export const pollLinkedInAnalytics = async (accessToken: string, postUrn: string) => {
  const url = `https://api.linkedin.com/rest/posts/${encodeURIComponent(postUrn)}?fields=lifecycleState,totalShareStatistics`

  if (!(await checkCircuit(CIRCUIT_KEY))) {
    console.warn("LinkedIn circuit open, skipping analytics poll")
    return { impressions: 0, engagementRate: 0 }
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: linkedInHeaders(accessToken),
      cache: "no-store",
    })

    if (!response.ok) throw new LinkedInApiError("linkedin_analytics_failed", response.status)
    const data = await response.json() as { totalShareStatistics?: { impressionCount?: number; engagementRate?: number } }

    await recordSuccess(CIRCUIT_KEY)
    return {
      impressions: data.totalShareStatistics?.impressionCount || 0,
      engagementRate: data.totalShareStatistics?.engagementRate || 0,
    }
  } catch (e) {
    await recordFailure(CIRCUIT_KEY)
    console.error("LinkedIn Analytics API error", e)
    return { impressions: 0, engagementRate: 0 }
  }
}
