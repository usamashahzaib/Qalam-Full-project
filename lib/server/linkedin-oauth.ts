import "server-only"

export const LINKEDIN_OAUTH_SCOPE = "openid profile email w_member_social"
export const LINKEDIN_STATE_COOKIE = "linkedin_oauth_state"

export function linkedInRedirectUri(requestOrigin: string): string {
  const origin = process.env.FRONTEND_ORIGIN || requestOrigin
  return process.env.LINKEDIN_REDIRECT_URI || `${origin}/api/linkedin/callback`
}

export function linkedInAuthorizationUrl(state: string, requestOrigin: string): string | null {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  if (!clientId || !process.env.LINKEDIN_CLIENT_SECRET) return null
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", linkedInRedirectUri(requestOrigin))
  url.searchParams.set("scope", LINKEDIN_OAUTH_SCOPE)
  url.searchParams.set("state", state)
  return url.toString()
}

export const linkedInStateCookie = (state: string) => ({
  name: LINKEDIN_STATE_COOKIE,
  value: state,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  },
})

export type LinkedInConnection = {
  accessToken: string
  memberId: string
  displayName: string | null
  expiresAt: number | null
  refreshToken: string | null
  refreshTokenExpiresAt: number | null
}

export async function exchangeLinkedInCode(code: string, requestOrigin: string): Promise<LinkedInConnection> {
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: linkedInRedirectUri(requestOrigin),
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!tokenRes.ok) throw new Error("linkedin_token_exchange_failed")
  const tokenData = await tokenRes.json() as {
    access_token?: string
    expires_in?: number
    refresh_token?: string
    refresh_token_expires_in?: number
  }
  const accessToken = tokenData.access_token
  if (!accessToken) throw new Error("linkedin_token_missing")

  // OIDC userinfo: the connect flow requests OIDC scopes (openid profile email),
  // under which the legacy /v2/me endpoint returns 403. The OIDC `sub` claim is the
  // member id; the author URN is built elsewhere as `urn:li:person:{sub}`.
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  })
  if (!profileRes.ok) throw new Error("linkedin_profile_failed")
  const profile = await profileRes.json() as { sub?: string; name?: string }
  if (!profile.sub) throw new Error("linkedin_member_id_missing")

  return {
    accessToken,
    memberId: profile.sub,
    displayName: profile.name?.trim() || null,
    expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null,
    refreshToken: tokenData.refresh_token || null,
    refreshTokenExpiresAt: tokenData.refresh_token_expires_in ? Date.now() + tokenData.refresh_token_expires_in * 1000 : null,
  }
}
