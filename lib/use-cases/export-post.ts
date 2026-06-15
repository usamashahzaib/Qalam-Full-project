import { ok, err } from "@/lib/errors"
import type { Result } from "@/lib/errors"
import { createServiceClient } from "@/lib/server/supabase-rest"

type ExportFormat = "pdf" | "text"
type PostRow = { title: string | null; content: string | null; status: string | null; created_at: string | null }

export interface ExportPostInput {
  postId: string
  format: ExportFormat
  userId: string
}

export interface ExportPostOutput {
  content: string
}

const formatPost = (post: PostRow, format: ExportFormat) => {
  const title = post.title?.trim() || "Untitled post"
  const content = post.content?.trim() || ""
  if (format === "text") return `${title}\n\n${content}`.trim()
  return [`# ${title}`, "", content, "", `Status: ${post.status || "draft"}`, `Created: ${post.created_at || ""}`].filter(Boolean).join("\n")
}

export async function exportPost(input: ExportPostInput): Promise<Result<ExportPostOutput>> {
  const { postId, format, userId } = input
  if (!postId || !userId || !["pdf", "text"].includes(format)) return err({ code: "VALIDATION_ERROR", message: "Valid postId, format, and userId are required" })

  try {
    const { data, error } = await createServiceClient()
      .from("posts")
      .select("title, content, status, created_at")
      .eq("id", postId)
      .eq("user_id", userId)
      .maybeSingle()

    if (error) return err({ code: "INTERNAL_ERROR", message: error.message })
    if (!data) return err({ code: "NOT_FOUND", message: "Post not found" })
    return ok({ content: formatPost(data as PostRow, format) })
  } catch (cause) {
    return err({ code: "INTERNAL_ERROR", message: "Failed to export post", cause })
  }
}
