import { randomUUID } from "node:crypto"
import { env, requireLinkedInEnv } from "@/lib/server/env"
import { fetchJson } from "@/lib/server/supabase-rest"
import { createSignedToken, readSignedToken } from "@/lib/server/token"

type StatePayload = {
  nonce: string
  redirectTo: string
  createdAt: number
}

type LinkedInSession = {
  accessToken: string
  expiresAt: number
  idToken: string | null
  profile: Record<string, unknown>
}

type SessionPayload = LinkedInSession & {
  createdAt: number
}

type LinkedInPostPayload = {
  accessToken: string
  authorId: string
  content: string
  media?: { id?: string; title?: string } | null
}

const LINKEDIN_STATE_MAX_AGE_MS = 10 * 60 * 1000
export const linkedInSessionCookieName = "qalam_linkedin_session"
export const linkedInSessionCookieMaxAgeSeconds = 5 * 60

const linkedInAuthUrl = (state: string) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.linkedInClientId,
    redirect_uri: env.linkedInRedirectUri,
    state,
    scope: "openid profile email w_member_social",
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
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

const normalizeRedirectTo = (redirectTo?: string) => {
  const fallback = `${env.frontendOrigin}/auth/linkedin/callback`
  if (!redirectTo) return fallback
  try {
    const frontendOrigin = new URL(env.frontendOrigin)
    const nextUrl = new URL(redirectTo, frontendOrigin)
    if (nextUrl.origin !== frontendOrigin.origin) return fallback
    return `${nextUrl.origin}${nextUrl.pathname}${nextUrl.search}`
  } catch {
    return fallback
  }
}

export const createLinkedInAuth = (redirectTo?: string) => {
  requireLinkedInEnv()
  const statePayload: StatePayload = {
    nonce: randomUUID(),
    redirectTo: normalizeRedirectTo(redirectTo),
    createdAt: Date.now(),
  }
  const state = createSignedToken(statePayload)
  return {
    state,
    url: linkedInAuthUrl(state),
  }
}

export const handleLinkedInCallback = async (state: string, code: string) => {
  requireLinkedInEnv()
  const statePayload = readSignedToken<StatePayload>(state, "linkedin_token_invalid")
  if (!statePayload.createdAt || Date.now() - statePayload.createdAt > LINKEDIN_STATE_MAX_AGE_MS) {
    throw new Error("linkedin_state_expired")
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.linkedInClientId,
    client_secret: env.linkedInClientSecret,
    redirect_uri: env.linkedInRedirectUri,
  })

  const token = await fetchJson<{ access_token: string; expires_in: number; id_token?: string }>(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    }
  )

  const profile = await fetchJson<Record<string, unknown>>("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.data.access_token}` },
    cache: "no-store",
  })

  const sessionPayload: SessionPayload = {
    accessToken: token.data.access_token,
    expiresAt: Date.now() + Number(token.data.expires_in || 0) * 1000,
    idToken: token.data.id_token || null,
    profile: profile.data,
    createdAt: Date.now(),
  }

  return {
    redirectTo: statePayload.redirectTo,
    sessionToken: createSignedToken(sessionPayload),
  }
}

export const consumeLinkedInSession = (sessionToken: string): LinkedInSession => {
  const sessionPayload = readSignedToken<SessionPayload>(sessionToken, "linkedin_token_invalid")
  if (!sessionPayload.createdAt || Date.now() - sessionPayload.createdAt > linkedInSessionCookieMaxAgeSeconds * 1000) {
    throw new Error("linkedin_session_expired")
  }

  return {
    accessToken: sessionPayload.accessToken,
    expiresAt: sessionPayload.expiresAt,
    idToken: sessionPayload.idToken,
    profile: sessionPayload.profile,
  }
}

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
  // LinkedIn Organizational Entity Analytics API
  const url = `https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(postUrn)}`;
  
  try {
    const response = await fetchJson<{ elements: Array<{ totalShareStatistics: { impressionCount: number; engagementRate: number } }> }>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "Linkedin-Version": env.linkedInVersion,
      },
      cache: "no-store",
    });
    
    return {
      impressions: response.data?.elements?.[0]?.totalShareStatistics?.impressionCount || 0,
      engagementRate: response.data?.elements?.[0]?.totalShareStatistics?.engagementRate || 0,
    }
  } catch (e) {
    console.error("LinkedIn Analytics API error", e)
    return { impressions: 0, engagementRate: 0 }
  }
}
