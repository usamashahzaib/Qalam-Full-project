import type { HookItem, PostFormat, ScoreData, WriterRole, SlideItem } from "@/types/writer"
import type { WorkspacePost } from "@/types/domain"

type ApiErrorBody = { error?: string; message?: string }
type PostType = "LinkedIn - Text post" | "LinkedIn - Carousel" | string
type PostStatus = "draft" | "scheduled" | "published"

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

const patchJson = async <TOut, TIn extends Record<string, unknown>>(url: string, data: TIn) => {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return readJson<TOut>(res)
}

const requestJson = <T>(path: string, options: RequestInit = {}) =>
  fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  }).then(readJson<T>)

const withWorkspaceKey = (path: string, workspaceKey?: string) =>
  workspaceKey ? `${path}${path.includes("?") ? "&" : "?"}workspaceKey=${encodeURIComponent(workspaceKey)}` : path

export const API_PATHS = {
  dashboardStats: "/api/dashboard/stats",
  hookAlternatives: "/api/generate/hook-alternatives",
  replies: "/api/generate/replies",
  ctaAlternatives: "/api/generate/cta-alternatives",
  carouselGenerate: "/api/generate/carousel",
}

const resolvedTitle = (title: string | undefined, content: string, fallback = "Untitled post") =>
  title || content.trim().split("\n")[0]?.slice(0, 80) || fallback

const scheduledAt = (date?: string, time?: string, scheduledTime?: string) =>
  scheduledTime || (date && time ? new Date(`${date}T${time}:00`).toISOString() : null)

export type GenerateHooksInput = { topic: string; role?: WriterRole | string; goal?: string }
export type GenerateHooksOutput = { hooks: HookItem[] }

export type GeneratePostInput = {
  topic: string
  hook: string
  originalContent?: string
  role?: WriterRole | string
  format?: PostFormat | string
  goal?: string
}
export type GeneratePostOutput = { content: string; wordCount?: number; remaining?: number }

export type ScorePostInput = { content: string; role?: WriterRole | string }
export type ScorePostOutput = ScoreData

export type ImprovePostInput = { content: string; role?: WriterRole | string; scores?: Partial<ScoreData> | Record<string, unknown> }
export type ImprovePostOutput = { content: string; scores?: ScoreData; remaining?: number }

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

export const saveDraft = (data: SaveDraftInput) =>
  postJson<SaveDraftOutput, Record<string, unknown>>("/api/posts", {
    ...data,
    title: resolvedTitle(data.title, data.content, "Untitled draft"),
    status: "draft" satisfies PostStatus,
  })

export const schedulePost = async (data: SchedulePostInput) => {
  const scheduledTime = scheduledAt(data.date, data.time, data.scheduledTime)
  const body = {
    ...data,
    title: resolvedTitle(data.title, data.content),
    status: "scheduled" satisfies PostStatus,
    scheduledTime,
  }
  if (!data.id) return postJson<SaveDraftOutput, Record<string, unknown>>("/api/posts", body)
  return patchJson<SchedulePostOutput, Record<string, unknown>>(`/api/posts?id=${encodeURIComponent(data.id)}`, body)
}

export const publishPost = async (data: PublishPostInput) => {
  const body = {
    ...data,
    title: resolvedTitle(data.title, data.content),
    status: "published" satisfies PostStatus,
    publishedAt: data.publishedAt || new Date().toISOString(),
    externalPostUrn: data.externalPostUrn ?? null,
  }
  if (!data.id) return postJson<SaveDraftOutput, Record<string, unknown>>("/api/posts", body)
  return patchJson<PublishPostOutput, Record<string, unknown>>(`/api/posts?id=${encodeURIComponent(data.id)}`, body)
}

export const exportPost = ({ id, ...data }: ExportPostInput) =>
  postJson<ExportPostOutput, Record<string, unknown>>(`/api/export/${id}`, data)

export const shareToLinkedIn = (data: ShareToLinkedInInput) =>
  postJson<ShareToLinkedInOutput, Record<string, unknown>>("/api/linkedin/share", data)

export const loadWorkspaceSnapshot = async (workspaceKey?: string) => {
  const qs = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""
  const res = await fetch(`/api/workspace${qs}`)
  const data = await readJson<Omit<WorkspaceSnapshotOutput, "state"> & { state?: Record<string, unknown> }>(res)
  return { ...data, state: data.state || {} }
}

export const saveWorkspaceSnapshot = (state: Record<string, unknown>, workspaceKey?: string) =>
  fetch("/api/workspace", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, workspaceKey }),
  }).then(readJson)

export const trackWorkspaceEvent = (
  type: string,
  payload: Record<string, unknown> = {},
  workspaceKey?: string
) =>
  postJson<{ saved: boolean; event: unknown }, Record<string, unknown>>("/api/events", {
    workspaceKey,
    type,
    payload,
    createdAt: new Date().toISOString(),
  })

export const fetchWorkspaceEvents = (limit = 100, workspaceKey?: string) =>
  requestJson<{ events: unknown[] }>(withWorkspaceKey(`/api/events?limit=${limit}`, workspaceKey))

export const fetchWorkspaceJobs = (type = "", limit = 100, workspaceKey?: string) =>
  requestJson<{ jobs: unknown[] }>(
    withWorkspaceKey(`/api/jobs?type=${encodeURIComponent(type)}&limit=${limit}`, workspaceKey)
  )

export const createWorkspaceJob = ({
  type,
  title,
  payload = {},
  status = "completed",
  workspaceKey,
}: WorkspaceJobInput) =>
  postJson<{ saved: boolean; job: unknown }, Record<string, unknown>>("/api/jobs", {
    workspaceKey,
    type,
    title,
    status,
    payload,
    createdAt: new Date().toISOString(),
  })

export const analyzeCompetitorPaste = ({
  profileId,
  profileName,
  platform,
  sourceText,
  workspaceKey,
}: {
  profileId?: string
  profileName?: string
  platform?: string
  sourceText?: string
  workspaceKey?: string
}) =>
  postJson<{ analysis: unknown; job: unknown }, Record<string, unknown>>("/api/competitors/analyze", {
    workspaceKey,
    profileId,
    profileName,
    platform,
    sourceText,
  })

export type HookAlternativesInput = { content: string; role?: string }
export type HookAlternativesOutput = { hooks: HookItem[] }

export type GenerateRepliesInput = { originalPost: string; comments: string; role?: string; mode?: "comment" | "reply"; parentComment?: string }
export type GenerateRepliesOutput = { replies: Array<{ style: string; reply: string }> }

export type CtaAlternativesInput = { content: string; role?: string }
export type CtaAlternativesOutput = { alternatives: string[] }

export type CarouselInput = { topic: string; role?: string }
export type CarouselOutput = { slides: SlideItem[] }

export const generateHookAlternatives = (data: HookAlternativesInput) =>
  postJson<HookAlternativesOutput, Record<string, unknown>>(API_PATHS.hookAlternatives, data)

export const generateReplies = (data: GenerateRepliesInput) =>
  postJson<GenerateRepliesOutput, Record<string, unknown>>(API_PATHS.replies, data)

export const generateCtaAlternatives = (data: CtaAlternativesInput) =>
  postJson<CtaAlternativesOutput, Record<string, unknown>>(API_PATHS.ctaAlternatives, data)

export const generateCarousel = (data: CarouselInput) =>
  postJson<CarouselOutput, Record<string, unknown>>(API_PATHS.carouselGenerate, data)

export const trainVoice = (data: { examplePosts?: string[]; sampleText?: string }) =>
  postJson<{ characteristics: unknown }, Record<string, unknown>>("/api/voice/train", data)

export const fetchDashboardStats = () =>
  requestJson<Record<string, unknown>>(API_PATHS.dashboardStats)

export const fetchDashboardRecentPosts = () =>
  requestJson<{ posts?: WorkspacePost[] } | WorkspacePost[]>("/api/dashboard/recent-posts")

export const fetchWorkspace = (workspaceKey?: string) =>
  requestJson<Record<string, unknown>>(withWorkspaceKey("/api/workspace", workspaceKey))
