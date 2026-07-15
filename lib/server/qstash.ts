import "server-only"

import { Client, Receiver } from "@upstash/qstash"
import { env } from "./env"
import { log } from "./logging"
import { supabasePatch, supabaseSelect } from "./supabase-rest"

let _client: Client | null = null
function qstashClient(): Client | null {
  if (_client) return _client
  if (!env.qstashToken) return null
  return (_client = new Client({ token: env.qstashToken }))
}

let _receiver: Receiver | null = null
export function qstashReceiver(): Receiver | null {
  if (_receiver) return _receiver
  if (!env.qstashCurrentSigningKey || !env.qstashNextSigningKey) return null
  return (_receiver = new Receiver({
    currentSigningKey: env.qstashCurrentSigningKey,
    nextSigningKey: env.qstashNextSigningKey,
  }))
}

export function qstashConfigured(): boolean {
  return Boolean(env.qstashToken)
}

/**
 * Schedule a one-time LinkedIn publish callback for a post at its exact
 * scheduled time. Returns the QStash message id - callers must persist it
 * (in posts.metadata.qstash_message_id) so a later reschedule/unschedule can
 * cancel this exact delivery. Returns null when QStash is not configured;
 * the daily safety-net cron (/api/linkedin/publish-scheduled) still catches
 * these posts, just with up to ~24h of delay.
 */
export async function scheduleLinkedInPublish(postId: string, publishAt: Date): Promise<string | null> {
  const client = qstashClient()
  if (!client) return null
  const notBefore = Math.floor(publishAt.getTime() / 1000)
  try {
    const result = await client.publishJSON({
      url: `${env.frontendOrigin}/api/linkedin/publish-scheduled/webhook`,
      body: { postId },
      notBefore,
      retries: 3,
    })
    return result.messageId
  } catch (err) {
    log.error("qstash.schedule_failed", { postId, error: (err as Error).message })
    return null
  }
}

/** Cancel a previously scheduled delivery (reschedule/unschedule/delete). Best-effort. */
export async function cancelLinkedInPublish(messageId: string): Promise<void> {
  const client = qstashClient()
  if (!client) return
  try {
    await client.messages.delete(messageId)
  } catch (err) {
    // Already delivered, already cancelled, or expired - not worth surfacing.
    log.warn("qstash.cancel_failed", { messageId, error: (err as Error).message })
  }
}

type PostMetaRow = { metadata: Record<string, unknown> | null }

async function readPostMetadata(postId: string): Promise<Record<string, unknown>> {
  const rows = await supabaseSelect<PostMetaRow>("posts", `id=eq.${postId}&select=metadata&limit=1`).catch(() => [])
  return rows?.[0]?.metadata || {}
}

/**
 * Attach (or replace) a QStash delivery targeting a post's scheduled time.
 * Cancels any previously scheduled message for this post first, so
 * rescheduling never leaves a stale delivery firing at the old time.
 */
export async function attachQstashSchedule(postId: string, publishAt: Date): Promise<void> {
  const metadata = await readPostMetadata(postId)
  const existingId = metadata.qstash_message_id as string | undefined
  if (existingId) await cancelLinkedInPublish(existingId)

  const messageId = await scheduleLinkedInPublish(postId, publishAt)
  await supabasePatch("posts", `id=eq.${postId}`, {
    metadata: { ...metadata, qstash_message_id: messageId },
  }).catch((err) => log.error("qstash.attach_metadata_failed", { postId, error: (err as Error).message }))
}

/** Cancel and clear any pending QStash delivery for a post (unschedule/status change/delete). */
export async function detachQstashSchedule(postId: string): Promise<void> {
  const metadata = await readPostMetadata(postId)
  const existingId = metadata.qstash_message_id as string | undefined
  if (!existingId) return
  await cancelLinkedInPublish(existingId)
  const { qstash_message_id: _drop, ...rest } = metadata
  await supabasePatch("posts", `id=eq.${postId}`, { metadata: rest }).catch(() => undefined)
}
