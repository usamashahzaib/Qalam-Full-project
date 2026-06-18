import { env } from "@/lib/server/env"
import { fetchJson } from "@/lib/server/supabase-rest"
import { checkCircuit, recordFailure, recordSuccess } from "@/lib/server/circuit-breaker"

const CIRCUIT_KEY = "linkedin"
const USER_AGENT = "Qalam/1.0 (+https://byqalam.com)"

type LinkedInPostPayload = {
  accessToken: string
  authorId: string
  content: string
  media?: { id?: string; title?: string } | null
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
  const circuitOpen = !(await checkCircuit(CIRCUIT_KEY))
  if (circuitOpen) throw new Error("linkedin_circuit_open")

  try {
    const post = await fetchJson<unknown>("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "Linkedin-Version": env.linkedInVersion,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(createSharePayload(payload)),
      cache: "no-store",
    })
    const postUrn = post.headers.get("x-restli-id")
    if (!postUrn) throw new Error("linkedin_publish_unconfirmed")

    await recordSuccess(CIRCUIT_KEY)
    return { shared: true, postUrn }
  } catch (err) {
    await recordFailure(CIRCUIT_KEY)
    throw err
  }
}

export const pollLinkedInAnalytics = async (accessToken: string, postUrn: string) => {
  // Use the posts statistics endpoint which works for both personal and organization posts
  const url = `https://api.linkedin.com/rest/posts/${encodeURIComponent(postUrn)}?fields=lifecycleState,totalShareStatistics`

  const circuitOpen = !(await checkCircuit(CIRCUIT_KEY))
  if (circuitOpen) {
    console.warn("LinkedIn circuit open, skipping analytics poll")
    return { impressions: 0, engagementRate: 0 }
  }

  try {
    const response = await fetchJson<{ totalShareStatistics?: { impressionCount?: number; engagementRate?: number } }>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "Linkedin-Version": env.linkedInVersion,
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
    })

    await recordSuccess(CIRCUIT_KEY)
    return {
      impressions: response.data?.totalShareStatistics?.impressionCount || 0,
      engagementRate: response.data?.totalShareStatistics?.engagementRate || 0,
    }
  } catch (e) {
    await recordFailure(CIRCUIT_KEY)
    console.error("LinkedIn Analytics API error", e)
    return { impressions: 0, engagementRate: 0 }
  }
}
