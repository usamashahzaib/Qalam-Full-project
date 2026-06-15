import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { createServiceClient } from "@/lib/server/supabase-rest"

export interface PublishPostInput {
  postId: string
  userId: string
}

export interface PublishPostOutput {
  success: boolean
  externalPostUrn?: string
}

export async function publishPost(input: PublishPostInput): Promise<Result<PublishPostOutput>> {
  const { postId, userId } = input
  if (!postId || !userId) return err({ code: "VALIDATION_ERROR", message: "postId and userId are required" })

  try {
    const { data, error } = await createServiceClient()
      .from("posts")
      .update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", postId)
      .eq("user_id", userId)
      .select("id, external_post_urn")
      .maybeSingle()

    if (error) return err({ code: "INTERNAL_ERROR", message: error.message })
    if (!data) return err({ code: "NOT_FOUND", message: "Post not found" })
    return ok({ success: true, externalPostUrn: data.external_post_urn || undefined })
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "Failed to publish post", cause })
  }
}
