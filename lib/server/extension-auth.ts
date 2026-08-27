import "server-only"

import { createHmac, timingSafeEqual } from "crypto"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { passwordVersionsMatch } from "@/lib/server/session-revocation"

export type ExtensionIdentity = { userId: string; passwordVersion: number; exp: number }

const secret = () => process.env.EXTENSION_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ""
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url")

export const mintExtensionToken = (identity: Omit<ExtensionIdentity, "exp">) => {
  if (!secret()) throw new Error("Extension authentication is not configured")
  const payload = Buffer.from(JSON.stringify({ ...identity, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString("base64url")
  return `${payload}.${sign(payload)}`
}

export const readExtensionToken = async (authorization: string | null): Promise<ExtensionIdentity | null> => {
  if (!secret() || !authorization?.startsWith("Bearer ")) return null
  const token = authorization.slice(7)
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  try {
    const identity = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ExtensionIdentity
    if (!identity.userId || typeof identity.exp !== "number" || identity.exp <= Date.now()) return null
    const { data, error } = await createServiceClient()
      .from("users")
      .select("password_version")
      .eq("id", identity.userId)
      .maybeSingle()
    if (error || !data || !passwordVersionsMatch(data.password_version, identity.passwordVersion)) return null
    return identity
  } catch {
    return null
  }
}

// Extension tokens identify the person, not a workspace. Workspace access can
// change independently of a user's password, so resolve the current primary
// membership for every request before loading workspace-scoped data.
export const resolveExtensionWorkspace = async (userId: string): Promise<string | null> => {
  const { data, error } = await createServiceClient()
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data?.workspace_id) return null
  return data.workspace_id
}
