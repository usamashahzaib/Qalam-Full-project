import "server-only"
import {
  createServiceClient,
  supabaseSelect,
  supabasePatch,
  supabaseDelete,
} from "@/lib/server/supabase-rest"
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
  type: post.type,
  status: post.status,
  date: (post.scheduled_time || post.published_at || post.created_at || "").slice(0, 10),
  scheduledTime: post.scheduled_time,
  externalPostUrn: post.external_post_urn,
  updatedAt: post.updated_at,
  createdAt: post.created_at,
})

const DB_STATUSES = new Set(["draft", "published", "scheduled", "archived"])

export class SupabasePostRepository implements IPostRepository {
  async list(workspaceId: string): Promise<ClientPost[]> {
    const posts = await supabaseSelect<DbPost>(
      "posts",
      `workspace_id=eq.${encodeURIComponent(workspaceId)}&order=created_at.desc`
    )
    return (posts || []).map(toClientPost)
  }

  async get(id: string, workspaceId: string): Promise<DbPost | null> {
    const rows = await supabaseSelect<DbPost>(
      "posts",
      `id=eq.${id}&workspace_id=eq.${workspaceId}&limit=1`
    )
    return rows?.[0] ?? null
  }

  async create(params: CreatePostParams): Promise<ClientPost> {
    const {
      userId, workspaceId, authorId,
      title, content, type, status,
      scheduledTime, publishedAt, externalPostUrn,
    } = params
    const supabase = createServiceClient()
    const { data: postId, error } = await supabase.rpc("create_post_with_version", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_title: title,
      p_content: content ?? "",
      p_hook: null,
      p_cta: null,
      p_role_profile: null,
      p_topic: title,
      p_engagement_score: null,
      p_metadata: { type, scheduledTime, publishedAt, externalPostUrn, status, authorId },
      p_status: DB_STATUSES.has(status) ? status : "draft",
    })
    if (error || !postId) throw new Error(error?.message || "post_create_failed")
    const now = new Date().toISOString()
    return {
      id: postId as string,
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
    if (patch.type !== undefined) dbPatch.type = patch.type
    if (patch.status !== undefined) dbPatch.status = patch.status
    if (patch.scheduledTime !== undefined) dbPatch.scheduled_time = patch.scheduledTime
    if (patch.publishedAt !== undefined) dbPatch.published_at = patch.publishedAt
    if (patch.externalPostUrn !== undefined) dbPatch.external_post_urn = patch.externalPostUrn
    const rows = await supabasePatch<DbPost>(
      "posts",
      `id=eq.${id}&workspace_id=eq.${workspaceId}`,
      dbPatch
    )
    return rows?.[0] ? toClientPost(rows[0]) : null
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await supabaseDelete("posts", `id=eq.${id}&workspace_id=eq.${workspaceId}`)
  }

  async duplicate(
    postId: string,
    workspaceId: string,
    userId: string,
    authorId: string
  ): Promise<ClientPost> {
    const rows = await supabaseSelect<DbPost>(
      "posts",
      `id=eq.${postId}&workspace_id=eq.${workspaceId}&limit=1`
    )
    if (!rows?.length) throw new Error("not_found")
    const original = rows[0]
    const supabase = createServiceClient()
    const { data: newId, error } = await supabase.rpc("create_post_with_version", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_title: `${original.title} (copy)`,
      p_content: original.content ?? "",
      p_hook: null,
      p_cta: null,
      p_role_profile: null,
      p_topic: original.title,
      p_engagement_score: null,
      p_metadata: { type: original.type, authorId },
      p_status: "draft",
    })
    if (error || !newId) throw new Error(error?.message || "duplicate_failed")
    const now = new Date().toISOString()
    return {
      id: newId as string,
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
