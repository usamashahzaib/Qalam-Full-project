import crypto from "node:crypto"
import { supabaseDelete, supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"

const ALGORITHM = "aes-256-gcm"

function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY || ""
  if (keyHex.length !== 64) return null
  return Buffer.from(keyHex, "hex")
}

function encryptToken(token: string): string {
  const key = getEncryptionKey()
  if (!key) {
    throw new Error("LINKEDIN_TOKEN_ENCRYPTION_KEY not configured — cannot encrypt token")
  }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `enc:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

function decryptToken(stored: string): string {
  if (!stored.startsWith("enc:")) {
    console.warn("[security] Unencrypted LinkedIn token detected — migrate immediately")
    throw new Error("LinkedIn token is unencrypted; refusing plaintext token")
  }
  const key = getEncryptionKey()
  if (!key) {
    throw new Error("LINKEDIN_TOKEN_ENCRYPTION_KEY not configured — cannot decrypt token")
  }
  const parts = stored.split(":")
  if (parts.length !== 4) {
    throw new Error("Invalid token format")
  }
  try {
    const iv = Buffer.from(parts[1], "hex")
    const authTag = Buffer.from(parts[2], "hex")
    const ciphertext = Buffer.from(parts[3], "hex")
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
  } catch (err) {
    throw new Error(`Token decryption failed — key mismatch or corrupt data: ${(err as Error).message}`)
  }
}

type LinkedInCredential = {
  user_id: string
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
  userId,
  accessToken,
  memberId,
  tokenExpiresAt,
}: {
  userId: string
  accessToken: string
  memberId: string | null
  tokenExpiresAt: number | null
}) => {
  await supabaseInsert(
    "linkedin_credentials",
    {
      user_id: userId,
      access_token: encryptToken(accessToken),
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
    access_token: encryptToken(accessToken),
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
    const row = rows?.[0]
    if (!row) return null
    return {
      ...row,
      access_token: row.access_token ? decryptToken(row.access_token) : null,
    }
  } catch (err) {
    console.error("linkedin_publishing_account_load_failed", { workspaceId, error: err instanceof Error ? err.message : String(err) })
    throw err
  }
}

export const deleteLinkedInPublishingAccount = async (workspaceId: string) => {
  await supabaseDelete("publishing_accounts", `workspace_id=eq.${workspaceId}&provider=eq.linkedin`)
}

export const getLinkedInToken = async (userId: string): Promise<LinkedInCredential | null> => {
  try {
    const rows = await supabaseSelect<LinkedInCredential>(
      "linkedin_credentials",
      `user_id=eq.${encodeURIComponent(userId)}&limit=1`
    )
    const row = rows?.[0]
    if (!row) return null
    return { ...row, access_token: decryptToken(row.access_token) }
  } catch (err) {
    console.error("linkedin_token_load_failed", { userId, error: err instanceof Error ? err.message : String(err) })
    throw err
  }
}

export const deleteLinkedInToken = async (userId: string) => {
  await supabaseDelete(
    "linkedin_credentials",
    `user_id=eq.${encodeURIComponent(userId)}`
  )
}

export const getAllLinkedInTokens = async (): Promise<LinkedInCredential[]> => {
  const now = Date.now()
  const pageSize = 100
  const tokens: LinkedInCredential[] = []
  try {
    for (let offset = 0; ; offset += pageSize) {
      const rows = await supabaseSelect<LinkedInCredential>(
        "linkedin_credentials",
        `token_expires_at=gt.${now}&select=user_id,access_token,member_id,token_expires_at&order=updated_at.asc&limit=${pageSize}&offset=${offset}`
      )
      if (!rows?.length) break
      // Decrypt per-row so one corrupt/key-mismatched token does not drop the whole batch.
      for (const row of rows) {
        try {
          tokens.push({ ...row, access_token: decryptToken(row.access_token) })
        } catch (err) {
          console.warn("linkedin_token_decrypt_skipped", {
            userId: row.user_id,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
      if (rows.length < pageSize) break
    }
  } catch (err) {
    // Do not swallow silently — log and return whatever was successfully loaded so far.
    console.error("linkedin_tokens_load_failed", {
      error: err instanceof Error ? err.message : String(err),
      recovered: tokens.length,
    })
  }
  return tokens
}

/**
 * Mark a user's LinkedIn token as invalid/expired after the API rejects it (401).
 * We do not have a dedicated `token_valid` column, so we set the existing
 * `token_expires_at` (and publishing_accounts.expires_at) into the past. This
 * makes getAllLinkedInTokens skip it and the profile/share routes report
 * `linkedin_token_expired`, which the settings page surfaces as a reconnect prompt.
 */
export const markLinkedInTokenInvalid = async ({
  userId,
  workspaceId,
}: {
  userId?: string | null
  workspaceId?: string | null
}) => {
  const expiredAt = Date.now() - 1000
  const updatedAt = new Date().toISOString()
  try {
    if (userId) {
      await supabasePatch(
        "linkedin_credentials",
        `user_id=eq.${encodeURIComponent(userId)}`,
        { token_expires_at: expiredAt, updated_at: updatedAt }
      )
    }
    if (workspaceId) {
      await supabasePatch(
        "publishing_accounts",
        `workspace_id=eq.${encodeURIComponent(workspaceId)}&provider=eq.linkedin`,
        { expires_at: new Date(expiredAt).toISOString(), updated_at: updatedAt }
      )
    }
  } catch (err) {
    console.error("linkedin_mark_token_invalid_failed", {
      userId,
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
