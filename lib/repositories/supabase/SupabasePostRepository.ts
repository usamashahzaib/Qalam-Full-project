import "server-only"
import { createServiceClient } from "@/lib/server/supabase-rest"
import type {
  IPostRepository,
  DbPost,
  ClientPost,
  CreatePostParams,
  PostPatch,
} from "@/lib/repositories/interfaces"

const toClientPost = (post: DbPost): ClientPost => ({
  id: post.id,
  title: post.title,
  content: post.content ?? "",
  type: post.type ?? (post as DbPost & { metadata?: { type?: string } }).metadata?.type ?? "linkedin",
  status: post.status,
  date: (post.scheduled_time || (post as DbPost & { scheduled_for?: string | null }).scheduled_for || post.published_at || post.created_at || "").slice(0, 10),
  scheduledTime: post.scheduled_time ?? (post as DbPost & { scheduled_for?: string | null }).scheduled_for ?? null,
  externalPostUrn: post.external_post_urn ?? (post as DbPost & { linkedin_post_id?: string | null }).linkedin_post_id ?? null,
  updatedAt: post.updated_at,
  createdAt: post.created_at,
})

const DB_STATUSES = new Set(["draft", "published", "scheduled", "archived"])

const POST_COLUMNS = "id,workspace_id,user_id,title,content,status,scheduled_for,published_at,linkedin_post_id,metadata,created_at,updated_at"

export class SupabasePostRepository implements IPostRepository {
  async list(workspaceId: string): Promise<ClientPost[]> {
    const { data, error } = await createServiceClient()
      .from("posts")
      .select(POST_COLUMNS)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(toClientPost)
  }

  async get(id: string, workspaceId: string): Promise<DbPost | null> {
    const { data, error } = await createServiceClient()
      .from("posts")
      .select(POST_COLUMNS)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as DbPost | null
  }

  async create(params: CreatePostParams): Promise<ClientPost> {
    const {
      userId, workspaceId, authorId,
      title, content, type, status,
      scheduledTime, publishedAt, externalPostUrn,
    } = params
    const now = new Date().toISOString()
    const { data: post, error } = await createServiceClient()
      .from("posts")
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        title,
        content: content ?? "",
        status: DB_STATUSES.has(status) ? status : "draft",
        scheduled_for: scheduledTime ?? null,
        published_at: publishedAt ?? null,
        linkedin_post_id: externalPostUrn ?? null,
        metadata: { type, authorId },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single()
    if (error || !post) throw new Error(error?.message || "post_create_failed")
    return {
      id: post.id as string,
      title,
      content: content ?? "",
      type,
      status,
      date: (scheduledTime || publishedAt || now).slice(0, 10),
      scheduledTime: scheduledTime ?? null,
      externalPostUrn: externalPostUrn ?? null,
      updatedAt: now,
      createdAt: now,
    }
  }

  async update(id: string, workspaceId: string, patch: PostPatch): Promise<ClientPost | null> {
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.title !== undefined) dbPatch.title = patch.title
    if (patch.content !== undefined) dbPatch.content = patch.content
    if (patch.status !== undefined) dbPatch.status = patch.status
    if (patch.scheduledTime !== undefined) dbPatch.scheduled_for = patch.scheduledTime
    if (patch.publishedAt !== undefined) dbPatch.published_at = patch.publishedAt
    if (patch.externalPostUrn !== undefined) dbPatch.linkedin_post_id = patch.externalPostUrn
    const { data, error } = await createServiceClient()
      .from("posts")
      .update(dbPatch)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select(POST_COLUMNS)
    if (error) throw new Error(error.message)
    const row = data?.[0] as DbPost | undefined
    return row ? toClientPost(row) : null
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    const { error } = await createServiceClient()
      .from("posts")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId)
    if (error) throw new Error(error.message)
  }

  async duplicate(
    postId: string,
    workspaceId: string,
    userId: string,
    authorId: string
  ): Promise<ClientPost> {
    const { data: rows, error: fetchErr } = await createServiceClient()
      .from("posts")
      .select(POST_COLUMNS)
      .eq("id", postId)
      .eq("workspace_id", workspaceId)
      .limit(1)
    if (fetchErr || !rows?.length) throw new Error(fetchErr?.message || "not_found")
    const original = rows[0] as DbPost
    const now = new Date().toISOString()
    const { data: post, error } = await createServiceClient()
      .from("posts")
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        title: `${original.title} (copy)`,
        content: original.content ?? "",
        status: "draft",
        metadata: { type: original.type ?? "linkedin", authorId },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single()
    if (error || !post) throw new Error(error?.message || "duplicate_failed")
    return {
      id: post.id as string,
      title: `${original.title} (copy)`,
      content: original.content ?? "",
      type: original.type,
      status: "draft",
      date: now.slice(0, 10),
      scheduledTime: null,
      externalPostUrn: null,
      updatedAt: now,
      createdAt: now,
    }
  }
}
