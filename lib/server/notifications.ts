import "server-only"

import { supabaseInsert } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"

export type NotificationType = "post_published" | "post_failed" | "post_reminder" | "career_addon_paid" | "career_momentum_reminder"

/**
 * Best-effort in-app notification insert. Never throws - a notification is a
 * courtesy signal, not part of the operation it describes, so a failure here
 * must never roll back or block the caller's own success/failure path.
 */
export async function createNotification(params: {
  userId: string
  workspaceId?: string | null
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
}): Promise<void> {
  await supabaseInsert(
    "app_notifications",
    {
      user_id: params.userId,
      workspace_id: params.workspaceId || null,
      type: params.type,
      title: params.title,
      body: params.body || null,
      link: params.link || null,
    },
    "return=minimal"
  ).catch((err: unknown) => log.error("notifications.insert_failed", { error: (err as Error).message, type: params.type }))
}
