import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"

export async function ensureSupabaseUser({
  userId,
  email,
  fullName,
  imageUrl,
}: {
  userId: string
  email: string
  fullName: string
  imageUrl: string | null
}): Promise<string> {
  const supabase = createServiceClient()
  const { data: userByExt } = await supabase
    .from("users")
    .select("id")
    .eq("external_user_id", userId)
    .maybeSingle()

  if (userByExt) return userByExt.id

  const { data: userByEmail } = await supabase
    .from("users")
    .select("id, external_user_id")
    .eq("email", email)
    .maybeSingle()

  if (userByEmail) {
    if (!userByEmail.external_user_id) {
      await supabase
        .from("users")
        .update({ external_user_id: userId, full_name: fullName, image_url: imageUrl })
        .eq("id", userByEmail.id)
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

  const { data: recoveredByExt } = await supabase
    .from("users")
    .select("id")
    .eq("external_user_id", userId)
    .maybeSingle()
  if (recoveredByExt) return recoveredByExt.id

  const { data: recoveredByEmail } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  if (recoveredByEmail) return recoveredByEmail.id

  throw new Error("failed_to_ensure_user")
}

const getOrCreateWorkspaceForUser = async (userId: string, ownerEmail?: string) => {
  const supabase = createServiceClient()
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

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
