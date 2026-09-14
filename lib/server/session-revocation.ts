import "server-only"

import type { Session } from "next-auth"
import { cache } from "react"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"

export function passwordVersionsMatch(databaseVersion: unknown, tokenVersion: unknown): boolean {
  return typeof databaseVersion === "number" && typeof tokenVersion === "number" && databaseVersion === tokenVersion
}

// A failed lookup says nothing about whether the session was revoked. Treating
// it as revoked signed people out whenever Supabase returned a gateway error,
// so it surfaces as a retryable failure instead.
const SESSION_CHECK_UNAVAILABLE = "session_check_unavailable"

const sessionCheckUnavailable = (message: string) => {
  log.error("auth.session_check_unavailable", { error: message })
  return new Error(SESSION_CHECK_UNAVAILABLE)
}

async function isSessionCurrentImpl(session: Session | null): Promise<boolean> {
  if (!session?.user?.id) return false
  const user = session.user as typeof session.user & { provider?: string; passwordVersion?: number }
  if ((user.provider ?? "linkedin") !== "credentials") {
    const { data, error } = await createServiceClient()
      .from("users")
      .select("id")
      .eq("external_user_id", user.id)
      .maybeSingle()

    if (error) throw sessionCheckUnavailable(error.message)
    if (!data) {
      log.warn("auth.stale_oauth_session", { externalUserId: user.id })
      return false
    }
    return true
  }

  const { data, error } = await createServiceClient()
    .from("users")
    .select("password_version")
    .eq("id", user.id)
    .maybeSingle()

  if (error) throw sessionCheckUnavailable(error.message)
  if (!data || !passwordVersionsMatch(data.password_version, user.passwordVersion)) {
    log.warn("auth.stale_credentials_session", { userId: user.id })
    return false
  }
  return true
}

// Reuse the revocation lookup throughout one server request. A single route can
// resolve auth through its own guard, workspace context, and plan checks.
export const isSessionCurrent = cache(isSessionCurrentImpl)
