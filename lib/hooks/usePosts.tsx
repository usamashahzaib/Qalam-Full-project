"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { cleanErrorMessage } from "@/lib/content-guard"
import type { WorkspacePost } from "@/types/domain"

export type PostStatus = "draft" | "pending_approval" | "approved" | "rejected" | "scheduled" | "published" | "failed"

type PostsContextValue = {
  posts: WorkspacePost[]
  drafts: WorkspacePost[]
  scheduled: WorkspacePost[]
  published: WorkspacePost[]
  failed: WorkspacePost[]
  isLoadingPosts: boolean
  postsError: string | null
  saveDraft: (input: { id?: string | null; title: string; content: string; type: string }) => Promise<string>
  schedulePost: (input: { id?: string | null; title: string; content: string; type: string; date: string; time: string }) => Promise<string>
  publishPost: (input: { id?: string | null; title: string; content: string; type: string; publishedAt: string; externalPostUrn?: string | null }) => Promise<string>
  retryFailedPost: (id: string) => Promise<void>
  deletePost: (id: string) => Promise<void>
  refreshPosts: () => Promise<void>
  trackEvent: (type: string, payload?: Record<string, unknown>) => Promise<void>
  loadEvents: (limit?: number) => Promise<unknown[]>
  loadJobs: (type?: string, limit?: number) => Promise<unknown[]>
  createJob: (input: { type?: string; title?: string; payload?: Record<string, unknown>; status?: string }) => Promise<unknown>
  deleteJob: (id: string) => Promise<void>
}

const PostsContext = createContext<PostsContextValue | null>(null)

const deriveBuckets = (posts: WorkspacePost[]) => ({
  drafts: posts.filter((p) => p.status === "draft"),
  scheduled: posts.filter((p) => p.status === "scheduled"),
  published: posts.filter((p) => p.status === "published"),
  failed: posts.filter((p) => p.status === "failed"),
})

const friendlyPostError = (message?: string) => {
  if (message === "scheduled_time_must_be_future") return "Choose a future time. Past dates and current minutes are locked."
  if (message === "scheduled_time_required") return "Select date and time"
  if (message === "invalid_scheduled_time") return "Select a valid date and time"
  if (message === "upgrade_required" || message?.includes("upgrade")) return "Scheduling requires Solo or above. Upgrade your plan."
  if (message === "auth_required" || message === "plan_expired") return "Your session has expired. Please reload and sign in again."
  return cleanErrorMessage(message)
}

export function PostsProvider({ children, workspaceId }: { children: React.ReactNode; workspaceId: string }) {
  const [posts, setPosts] = useState<WorkspacePost[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [postsError, setPostsError] = useState<string | null>(null)

  const trackEvent = useCallback(async (type: string, payload: Record<string, unknown> = {}) => {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceKey: workspaceId, type, payload, createdAt: new Date().toISOString() }),
    }).catch(() => undefined)
  }, [workspaceId])

  const fetchPosts = useCallback(async () => {
    setIsLoadingPosts(true)
    setPostsError(null)
    try {
      const res = await fetch(`/api/posts?workspaceKey=${encodeURIComponent(workspaceId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load posts")
      setPosts(Array.isArray(data.posts) ? data.posts : [])
    } catch (error) {
      setPostsError((error as Error).message)
    } finally {
      setIsLoadingPosts(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const saveDraft = useCallback(async ({ id, title, content, type }: { id?: string | null; title: string; content: string; type: string }) => {
    const resolvedTitle = title || content.trim().split("\n")[0]?.slice(0, 80) || "Untitled draft"
    if (id) {
      const res = await fetch(`/api/posts?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: resolvedTitle, content, type, status: "draft", workspaceKey: workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update draft")
      if (data.post) setPosts((prev) => prev.map((post) => (post.id === id ? data.post : post)))
      await trackEvent("draft_saved", { postId: id, source: "writer" })
      return id
    }
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: resolvedTitle, content, type, status: "draft", workspaceKey: workspaceId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to create draft")
    if (data.post) setPosts((prev) => [data.post, ...prev])
    await trackEvent("draft_saved", { postId: data.post?.id ?? null, source: "writer" })
    return data.post?.id ?? ""
  }, [trackEvent, workspaceId])

  const schedulePost = useCallback(async ({ id, title, content, type, date, time }: { id?: string | null; title: string; content: string; type: string; date: string; time: string }) => {
    const resolvedTitle = title || content.trim().split("\n")[0]?.slice(0, 80) || "Untitled post"
    const scheduledTime = date && time ? new Date(`${date}T${time}:00`).toISOString() : null
    if (id) {
      const res = await fetch(`/api/posts?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: resolvedTitle, content, type, status: "scheduled", scheduledTime, workspaceKey: workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(friendlyPostError(data.error || "Failed to schedule post"))
      if (data.post) setPosts((prev) => prev.map((post) => (post.id === id ? data.post : post)))
      await trackEvent("post_scheduled", { postId: id, scheduledTime })
      return id
    }
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: resolvedTitle, content, type, status: "scheduled", scheduledTime, workspaceKey: workspaceId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(friendlyPostError(data.error || "Failed to schedule post"))
    if (data.post) setPosts((prev) => [data.post, ...prev])
    await trackEvent("post_scheduled", { postId: data.post?.id ?? null, scheduledTime })
    return data.post?.id ?? ""
  }, [trackEvent, workspaceId])

  const publishPost = useCallback(async ({ id, title, content, type, publishedAt, externalPostUrn }: { id?: string | null; title: string; content: string; type: string; publishedAt: string; externalPostUrn?: string | null }) => {
    const resolvedTitle = title || content.trim().split("\n")[0]?.slice(0, 80) || "Untitled post"
    if (id) {
      const res = await fetch(`/api/posts?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: resolvedTitle, content, type, status: "published", publishedAt, externalPostUrn: externalPostUrn ?? null, workspaceKey: workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update post")
      if (data.post) setPosts((prev) => prev.map((post) => (post.id === id ? data.post : post)))
      await trackEvent("post_published", { postId: id, publishedAt, externalPostUrn: externalPostUrn ?? null })
      return id
    }
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: resolvedTitle, content, type, status: "published", publishedAt, externalPostUrn: externalPostUrn ?? null, workspaceKey: workspaceId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to create published post")
    if (data.post) setPosts((prev) => [data.post, ...prev])
    await trackEvent("post_published", { postId: data.post?.id ?? null, publishedAt, externalPostUrn: externalPostUrn ?? null })
    return data.post?.id ?? ""
  }, [trackEvent, workspaceId])

  const retryFailedPost = useCallback(async (id: string) => {
    const res = await fetch(`/api/posts?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "scheduled",
        scheduledTime: new Date().toISOString(),
        workspaceKey: workspaceId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(friendlyPostError(data.error || "Failed to retry post"))
    if (data.post) setPosts((prev) => prev.map((post) => (post.id === id ? data.post : post)))
    await trackEvent("post_retry", { postId: id })
  }, [trackEvent, workspaceId])

  const deletePost = useCallback(async (id: string) => {
    const res = await fetch(`/api/posts?id=${id}&workspaceKey=${encodeURIComponent(workspaceId)}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to delete post")
    }
    setPosts((prev) => prev.filter((post) => post.id !== id))
  }, [workspaceId])

  const refreshPosts = useCallback(async () => {
    await fetchPosts()
  }, [fetchPosts])

  const loadEvents = useCallback(async (limit = 100) => {
    const res = await fetch(`/api/events?limit=${limit}&workspaceKey=${encodeURIComponent(workspaceId)}`)
    const data = await res.json()
    return Array.isArray(data.events) ? data.events : []
  }, [workspaceId])

  const loadJobs = useCallback(async (type = "", limit = 100) => {
    const res = await fetch(`/api/jobs?type=${encodeURIComponent(type)}&limit=${limit}&workspaceKey=${encodeURIComponent(workspaceId)}`)
    const data = await res.json()
    return Array.isArray(data.jobs) ? data.jobs : []
  }, [workspaceId])

  const createJob = useCallback(async ({ type, title, payload = {}, status = "completed" }: { type?: string; title?: string; payload?: Record<string, unknown>; status?: string }) => {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceKey: workspaceId, type, title, status, payload, createdAt: new Date().toISOString() }),
    })
    const data = await res.json()
    return data.job
  }, [workspaceId])

  const deleteJob = useCallback(async (id: string) => {
    await fetch(`/api/jobs?id=${id}&workspaceKey=${encodeURIComponent(workspaceId)}`, { method: "DELETE" })
  }, [workspaceId])

  const buckets = useMemo(() => deriveBuckets(posts), [posts])

  const value = useMemo<PostsContextValue>(() => ({
    posts,
    drafts: buckets.drafts,
    scheduled: buckets.scheduled,
    published: buckets.published,
    failed: buckets.failed,
    isLoadingPosts,
    postsError,
    saveDraft,
    schedulePost,
    publishPost,
    retryFailedPost,
    deletePost,
    refreshPosts,
    trackEvent,
    loadEvents,
    loadJobs,
    createJob,
    deleteJob,
  }), [buckets, createJob, deleteJob, deletePost, isLoadingPosts, loadEvents, loadJobs, posts, postsError, publishPost, refreshPosts, retryFailedPost, saveDraft, schedulePost, trackEvent])

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
}

export function usePosts(): PostsContextValue {
  const ctx = useContext(PostsContext)
  if (!ctx) throw new Error("usePosts must be used within PostsProvider")
  return ctx
}
