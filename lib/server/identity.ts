import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"

// Pre-hijack defence. Anyone can register a password for an address they do
// not own; the account just stays unverified. If the real owner later signs
// in with a provider that verified the address, linking must not keep the
// stranger's password, or the owner clicking any later verification email
// would activate it. Drop the password, mark the address verified (the
// provider just proved ownership), and bump password_version so nothing
// issued against the old credential survives.
function unverifiedAccountTakeoverGuard(row: {
  email_verified?: boolean | null
  password_hash?: string | null
  password_version?: number | null
}) {
  if (row.email_verified || !row.password_hash) return {}
  return {
    password_hash: null,
    email_verified: true,
    password_version: (typeof row.password_version === "number" ? row.password_version : 0) + 1,
    updated_at: new Date().toISOString(),
  }
}

export async function ensureSupabaseUser({
  userId,
  email,
  fullName,
  imageUrl,
  verifiedOAuthProvider,
}: {
  userId: string
  email: string
  fullName: string
  imageUrl: string | null
  verifiedOAuthProvider?: "linkedin"
}): Promise<string> {
  const supabase = createServiceClient()
  const { data: userByExt, error: externalLookupError } = await supabase
    .from("users")
    .select("id")
    .eq("external_user_id", userId)
    .maybeSingle()

  if (externalLookupError) {
    log.error("identity.external_lookup_failed", { error: externalLookupError.message })
    throw new Error("failed_to_lookup_external_user")
  }
  if (userByExt) return userByExt.id

  const { data: userByEmail, error: emailLookupError } = await supabase
    .from("users")
    .select("id, external_user_id, email_verified, password_hash, password_version")
    .eq("email", email)
    .maybeSingle()

  if (emailLookupError) {
    log.error("identity.email_lookup_failed", { error: emailLookupError.message })
    throw new Error("failed_to_lookup_email_user")
  }

  if (userByEmail) {
    const isSelfLink = userId === userByEmail.id
    const takeover = isSelfLink ? {} : unverifiedAccountTakeoverGuard(userByEmail)

    if (!userByEmail.external_user_id) {
      // A session resolving its own row (a password account whose id is the
      // session subject) may always link to itself. Any other subject claiming
      // an existing account by email must come from a provider that verified
      // that email, or an unverified OAuth email could take over the account.
      if (!isSelfLink && !verifiedOAuthProvider) {
        log.warn("identity.unverified_oauth_email_claim", { userId: userByEmail.id })
        throw new Error("oauth_email_unverified")
      }
      const { data: linkedUser, error: linkError } = await supabase
        .from("users")
        .update({ external_user_id: userId, full_name: fullName, image_url: imageUrl, ...takeover })
        .eq("id", userByEmail.id)
        .is("external_user_id", null)
        .select("id, external_user_id")
        .maybeSingle()

      if (linkError || linkedUser?.external_user_id !== userId) {
        log.error("identity.oauth_link_failed", { error: linkError?.message, userId: userByEmail.id })
        throw new Error("failed_to_link_oauth_user")
      }
      return linkedUser.id
    }

    if (userByEmail.external_user_id !== userId) {
      // LinkedIn's subject identifier can change when an application is
      // reconfigured. The provider has already verified this email address,
      // and external_user_id being set at all here means LinkedIn was
      // legitimately linked to this account before (via the branch above or
      // a prior relink) - regardless of what auth_provider says, since that
      // column tracks the original signup method and is never updated when
      // an email/password account later links LinkedIn. Keep the default
      // strict behavior for every other caller and provider.
      if (verifiedOAuthProvider === "linkedin") {
        const { data: relinkedUser, error: relinkError } = await supabase
          .from("users")
          .update({ external_user_id: userId, full_name: fullName, image_url: imageUrl, ...takeover })
          .eq("id", userByEmail.id)
          .eq("external_user_id", userByEmail.external_user_id)
          .select("id, external_user_id")
          .maybeSingle()

        if (relinkError || relinkedUser?.external_user_id !== userId) {
          log.error("identity.oauth_relink_failed", { error: relinkError?.message, userId: userByEmail.id })
          throw new Error("failed_to_relink_oauth_user")
        }
        log.info("identity.oauth_identity_relinked", { userId: userByEmail.id, provider: verifiedOAuthProvider })
        return relinkedUser.id
      }

      log.warn("identity.oauth_identity_mismatch", { userId: userByEmail.id })
      throw new Error("oauth_identity_mismatch")
    }
    return userByEmail.id
  }

  const { data: upserted, error } = await supabase
    .from("users")
    .upsert(
      { email, external_user_id: userId, full_name: fullName, image_url: imageUrl, plan: "Free" },
      { onConflict: "email", ignoreDuplicates: false }
    )
    .select("id")
    .single()

  if (!error && upserted) return upserted.id

  const { data: recoveredByExt, error: recoveredExternalError } = await supabase
    .from("users")
    .select("id")
    .eq("external_user_id", userId)
    .maybeSingle()
  if (recoveredExternalError) {
    log.error("identity.external_recovery_failed", { error: recoveredExternalError.message })
  }
  if (recoveredByExt) return recoveredByExt.id

  const { data: recoveredByEmail, error: recoveredEmailError } = await supabase
    .from("users")
    .select("id, external_user_id")
    .eq("email", email)
    .maybeSingle()
  if (recoveredEmailError) {
    log.error("identity.email_recovery_failed", { error: recoveredEmailError.message })
  }
  if (recoveredByEmail?.external_user_id === userId) return recoveredByEmail.id

  log.error("identity.provision_failed", { error: error?.message })
  throw new Error("failed_to_ensure_user")
}

const getOrCreateWorkspaceForUser = async (userId: string, ownerEmail?: string) => {
  const supabase = createServiceClient()
  const { data: membership, error: membershipLookupError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  // A failed lookup is not "no workspace". Creating one here would give the
  // user an empty duplicate Personal workspace every time Supabase blips.
  if (membershipLookupError) {
    log.error("workspace.membership_lookup_failed", { error: membershipLookupError.message })
    throw new Error("failed_to_lookup_workspace")
  }
  if (membership) return membership.workspace_id

  const payload: Record<string, string> = { name: "Personal", owner_id: userId }
  if (ownerEmail) payload.owner_email = ownerEmail

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert(payload)
    .select("id")
    .single()

  if (error || !workspace) {
    log.error("workspace.insert_failed", { error: error?.message, details: error?.details })
    return null
  }

  const { error: membershipError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "owner" })

  if (membershipError) {
    log.error("workspace.membership_insert_failed", { error: membershipError.message })
    return null
  }

  return workspace.id as string
}

export async function ensureWorkspaceForUser({
  userId,
  email,
}: {
  userId: string
  email?: string
  firstName?: string
}): Promise<string> {
  const workspaceId = await getOrCreateWorkspaceForUser(userId, email)
  if (!workspaceId) throw new Error("failed_to_ensure_workspace")
  return workspaceId
}
