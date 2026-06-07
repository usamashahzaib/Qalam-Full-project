import { env } from "@/lib/server/env"
import { fetchJson } from "@/lib/server/supabase-rest"

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
  const post = await fetchJson<unknown>("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${payload.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": env.linkedInVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createSharePayload(payload)),
    cache: "no-store",
  })

  return {
    shared: true,
    postUrn: post.headers.get("x-restli-id") || null,
  }
}

export const pollLinkedInAnalytics = async (accessToken: string, postUrn: string) => {
  const url = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(postUrn)}`

  try {
    const response = await fetchJson<{ elements: Array<{ totalShareStatistics: { impressionCount: number; engagementRate: number } }> }>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "Linkedin-Version": env.linkedInVersion,
      },
      cache: "no-store",
    })

    return {
      impressions: response.data?.elements?.[0]?.totalShareStatistics?.impressionCount || 0,
      engagementRate: response.data?.elements?.[0]?.totalShareStatistics?.engagementRate || 0,
    }
  } catch (e) {
    console.error("LinkedIn Analytics API error", e)
    return { impressions: 0, engagementRate: 0 }
  }
}
