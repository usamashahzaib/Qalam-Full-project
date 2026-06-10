import { supabaseDelete, supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"

type LinkedInCredential = {
  owner_email: string
  access_token: string
  member_id: string | null
  token_expires_at: number | null
  updated_at: string
}

type PublishingAccount = {
  id: string
  workspace_id: string
  provider: string
  provider_account_id: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  updated_at: string
}

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

export const storeLinkedInPublishingAccount = async ({
  workspaceId,
  accessToken,
  memberId,
  tokenExpiresAt,
}: {
  workspaceId: string
  accessToken: string
  memberId: string | null
  tokenExpiresAt: number | null
}) => {
  const existing = await supabaseSelect<PublishingAccount>(
    "publishing_accounts",
    `workspace_id=eq.${workspaceId}&provider=eq.linkedin&limit=1`
  )

  const payload = {
    workspace_id: workspaceId,
    provider: "linkedin",
    provider_account_id: memberId || workspaceId,
    access_token: accessToken,
    refresh_token: null,
    expires_at: tokenExpiresAt ? new Date(tokenExpiresAt).toISOString() : null,
    updated_at: new Date().toISOString(),
  }

  if (existing?.[0]?.id) {
    const rows = await supabasePatch<PublishingAccount>(
      "publishing_accounts",
      `id=eq.${existing[0].id}`,
      payload
    )
    return rows?.[0] || existing[0]
  }

  const rows = await supabaseInsert<PublishingAccount>(
    "publishing_accounts",
    payload,
    "return=representation"
  )
  return rows?.[0] || null
}

export const getLinkedInPublishingAccount = async (workspaceId: string): Promise<PublishingAccount | null> => {
  try {
    const rows = await supabaseSelect<PublishingAccount>(
      "publishing_accounts",
      `workspace_id=eq.${workspaceId}&provider=eq.linkedin&limit=1`
    )
    return rows?.[0] || null
  } catch {
    return null
  }
}

export const deleteLinkedInPublishingAccount = async (workspaceId: string) => {
  await supabaseDelete("publishing_accounts", `workspace_id=eq.${workspaceId}&provider=eq.linkedin`)
}

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

export const deleteLinkedInToken = async (ownerEmail: string) => {
  await supabaseDelete(
    "linkedin_credentials",
    `owner_email=eq.${encodeURIComponent(ownerEmail.trim().toLowerCase())}`
  )
}

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
