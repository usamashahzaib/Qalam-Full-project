import "server-only"

import type { Session } from "next-auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"

export function passwordVersionsMatch(databaseVersion: unknown, tokenVersion: unknown): boolean {
  return typeof databaseVersion === "number" && typeof tokenVersion === "number" && databaseVersion === tokenVersion
}

export async function isSessionCurrent(session: Session | null): Promise<boolean> {
  if (!session?.user?.id) return false
  const user = session.user as typeof session.user & { provider?: string; passwordVersion?: number }
  if ((user.provider ?? "linkedin") !== "credentials") return true

  const { data, error } = await createServiceClient()
    .from("users")
    .select("password_version")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !data || !passwordVersionsMatch(data.password_version, user.passwordVersion)) {
    log.warn("auth.stale_credentials_session", { userId: user.id })
    return false
  }
  return true
}
