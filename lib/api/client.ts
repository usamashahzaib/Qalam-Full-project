import type { HookItem, PostFormat, ScoreData, WriterRole, SlideItem } from "@/types/writer"
import type { WorkspacePost } from "@/types/domain"

type ApiErrorBody = { error?: string; message?: string }
type PostType = "LinkedIn - Text post" | "LinkedIn - Carousel" | string

export type WorkspaceEventInput = {
  id?: string
  workspaceKey?: string
  type?: string
  payload?: Record<string, unknown>
  createdAt?: string
}

export type WorkspaceJobInput = {
  id?: string
  workspaceKey?: string
  type?: string
  status?: string
  title?: string
  payload?: Record<string, unknown>
  createdAt?: string
}

export class ApiClientError extends Error {
  constructor(message: string, readonly status: number, readonly body: unknown) {
    super(message)
    this.name = "ApiClientError"
  }
}

const readJson = async <T>(res: Response): Promise<T> => {
  const body = await res.json().catch(() => null)
  if (res.ok) return body as T
  const serverMsg = (body as ApiErrorBody | null)?.error || (body as ApiErrorBody | null)?.message
  const msg = res.status >= 500
    ? (serverMsg || "Something went wrong on our end. Please try again in a moment.")
    : (serverMsg || res.statusText || "Request failed")
  throw new ApiClientError(msg, res.status, body)
}

const postJson = async <TOut, TIn extends Record<string, unknown>>(url: string, data: TIn, signal?: AbortSignal) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal,
  })
  return readJson<TOut>(res)
}

export const API_PATHS = {
  dashboardStats: "/api/dashboard/stats",
  hookAlternatives: "/api/generate/hook-alternatives",
  replies: "/api/generate/replies",
  ctaAlternatives: "/api/generate/cta-rewrite",
  carouselGenerate: "/api/generate/carousel",
}

export type GenerateHooksInput = { topic: string; role?: WriterRole | string; goal?: string; workspaceKey?: string }
export type GenerateHooksOutput = { hooks: HookItem[] }

export type GeneratePostInput = {
  idempotencyKey: string
  topic: string
  hook: string
  originalContent?: string
  role?: WriterRole | string
  format?: PostFormat | string
  goal?: string
  workspaceKey?: string
}
export type GeneratePostOutput = { content: string; wordCount?: number; remaining?: number; draftToken?: string }

export type ScorePostInput = { content: string; role?: WriterRole | string; attempt?: number; brief?: string; draftToken?: string; workspaceKey?: string }
export type ScorePostOutput = ScoreData

export type ImprovePostInput = { content: string; role?: WriterRole | string; scores?: Partial<ScoreData> | Record<string, unknown>; brief?: string; workspaceKey?: string }
export type ImprovePostOutput = { content: string; scores?: ScoreData; remaining?: number; draftToken?: string }

export type SaveDraftInput = {
  title?: string
  content: string
  type: PostType
  workspaceKey?: string
}
export type SaveDraftOutput = { post: WorkspacePost }

export type SchedulePostInput = SaveDraftInput & {
  id?: string | null
  date?: string
  time?: string
  scheduledTime?: string
}
export type SchedulePostOutput = { post?: WorkspacePost; success?: boolean }

export type PublishPostInput = SaveDraftInput & {
  id?: string | null
  publishedAt?: string
  externalPostUrn?: string | null
}
export type PublishPostOutput = { post?: WorkspacePost; success?: boolean; externalPostUrn?: string }

export type ExportPostInput = { id: string; format?: "pdf" | "text" }
export type ExportPostOutput = { content: string }
export type ShareToLinkedInInput = { content: string; postId?: string | null; workspaceKey?: string; media?: { id?: string; title?: string } | null }
export type ShareToLinkedInOutput = { shared: boolean; postUrn: string | null }
export type WorkspaceSnapshotOutput = { state: Record<string, unknown>; workspaceId?: string; plan?: string; [key: string]: unknown }

export const generateHooks = (data: GenerateHooksInput) =>
  postJson<GenerateHooksOutput, GenerateHooksInput>("/api/generate/hooks", data)

export const generatePost = (data: GeneratePostInput) =>
  postJson<GeneratePostOutput, GeneratePostInput>("/api/generate/post", data)

export const scorePost = (data: ScorePostInput, signal?: AbortSignal) =>
  postJson<ScorePostOutput, ScorePostInput>("/api/generate/score", data, signal)

export const improvePost = (data: ImprovePostInput) =>
  postJson<ImprovePostOutput, ImprovePostInput>("/api/generate/improve", data)

export const shareToLinkedIn = (data: ShareToLinkedInInput) =>
  postJson<ShareToLinkedInOutput, Record<string, unknown>>("/api/linkedin/share", data)
export type HookAlternativesInput = { content: string; role?: string; workspaceKey?: string }
export type HookAlternativesOutput = { hooks: HookItem[] }

export type GenerateRepliesInput = { originalPost: string; comments: string; role?: string; mode?: "comment" | "reply"; parentComment?: string; workspaceKey?: string }
export type GenerateRepliesOutput = { replies: Array<{ style: string; reply: string }> }

export type CtaAlternativesInput = { content: string; role?: string; workspaceKey?: string }
export type CtaAlternativesOutput = { alternatives: string[] }

export type CarouselInput = { topic: string; role?: string; goal?: string; workspaceKey?: string }
export type CarouselOutput = { slides: SlideItem[] }

export const generateHookAlternatives = (data: HookAlternativesInput) =>
  postJson<HookAlternativesOutput, Record<string, unknown>>(API_PATHS.hookAlternatives, data)

export const generateReplies = (data: GenerateRepliesInput) =>
  postJson<GenerateRepliesOutput, Record<string, unknown>>(API_PATHS.replies, data)

export const generateCtaAlternatives = (data: CtaAlternativesInput) =>
  postJson<CtaAlternativesOutput, Record<string, unknown>>(API_PATHS.ctaAlternatives, data)

export const generateCarousel = (data: CarouselInput) =>
  postJson<CarouselOutput, Record<string, unknown>>(API_PATHS.carouselGenerate, data)
