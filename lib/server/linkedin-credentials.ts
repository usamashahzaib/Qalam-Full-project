import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

type LinkedInCredential = {
  owner_email: string
  access_token: string
  member_id: string | null
  token_expires_at: number | null
  updated_at: string
}

/**
 * Store a LinkedIn access token server-side in Supabase.
 * Called during the OAuth callback to persist the token outside the cookie.
 */
export const storeLinkedInToken = async ({
  ownerEmail,
  accessToken,
  memberId,
  tokenExpiresAt,
}: {
  ownerEmail: string
  accessToken: string
  memberId: string | null
  tokenExpiresAt: number | null
}) => {
  await supabaseInsert(
    "linkedin_credentials",
    {
      owner_email: ownerEmail.trim().toLowerCase(),
      access_token: accessToken,
      member_id: memberId,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    },
    "resolution=merge-duplicates"
  )
}

/**
 * Retrieve LinkedIn credentials for a specific user from server-side storage.
 */
export const getLinkedInToken = async (ownerEmail: string): Promise<LinkedInCredential | null> => {
  try {
    const rows = await supabaseSelect<LinkedInCredential>(
      "linkedin_credentials",
      `owner_email=eq.${encodeURIComponent(ownerEmail.trim().toLowerCase())}&limit=1`
    )
    return rows?.[0] || null
  } catch {
    return null
  }
}

/**
 * Retrieve all users with valid (non-expired) LinkedIn tokens.
 * Used by the cron endpoint to poll analytics for all connected users.
 */
export const getAllLinkedInTokens = async (): Promise<LinkedInCredential[]> => {
  try {
    const now = Date.now()
    const rows = await supabaseSelect<LinkedInCredential>(
      "linkedin_credentials",
      `token_expires_at=gt.${now}&select=owner_email,access_token,member_id,token_expires_at`
    )
    return rows || []
  } catch {
    return []
  }
}
