"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { QalamMark } from "@/components/QalamLogo"

export type PostStatus = "draft" | "pending_approval" | "approved" | "rejected" | "scheduled" | "published" | "failed"

export type WorkspacePost = {
  id: string
  title: string
  content: string
  type: string
  status: PostStatus
  date: string
  scheduledTime: string | null
  externalPostUrn: string | null
  updatedAt: string
}

export type WorkspaceProfile = {
  name: string
  title: string
  linkedinUrl: string
  industry: string
  goals: string[]
  tone: string
}

export type WorkspaceBilling = {
  plan: "Free" | "Solo" | "Pro" | "Agency Starter" | "Agency Growth"
  billingCycle: "monthly" | "annual"
  checkoutReady: boolean
}

type LegacyWorkspaceState = {
  posts: WorkspacePost[]
  drafts: WorkspacePost[]
  scheduled: WorkspacePost[]
  published: WorkspacePost[]
  profile: WorkspaceProfile
  billing: WorkspaceBilling
  agency: {
    activeClientId: string | null
    clients: Record<string, unknown>[]
    teamMembers: Record<string, unknown>[]
  }
  competitors: Record<string, unknown>[]
}

type WorkspaceContextValue = {
  workspaceId: string
  posts: WorkspacePost[]
  drafts: WorkspacePost[]
  scheduled: WorkspacePost[]
  published: WorkspacePost[]
  isLoadingPosts: boolean
  postsError: string | null
  profile: WorkspaceProfile
  isLoadingProfile: boolean
  billing: WorkspaceBilling
  state: LegacyWorkspaceState
  remoteHydrated: boolean
  remoteError: string | null
  saveDraft: (input: { id?: string | null; title: string; content: string; type: string }) => Promise<string>
  schedulePost: (input: { id?: string | null; title: string; content: string; type: string; date: string; time: string }) => Promise<string>
  publishPost: (input: { id?: string | null; title: string; content: string; type: string; publishedAt: string; externalPostUrn?: string | null }) => Promise<string>
  deletePost: (id: string) => Promise<void>
  saveProfile: (input: WorkspaceProfile) => Promise<void>
  saveBilling: (input: Partial<WorkspaceBilling>) => void
  saveAgency: (input: Partial<LegacyWorkspaceState["agency"]>) => void
  setWorkspaceState: (updater: LegacyWorkspaceState | ((prev: LegacyWorkspaceState) => LegacyWorkspaceState)) => void
  loadEvents: (limit?: number) => Promise<unknown[]>
  trackEvent: (type: string, payload?: Record<string, unknown>) => Promise<void>
  loadJobs: (type?: string, limit?: number) => Promise<unknown[]>
  createJob: (input: { type?: string; title?: string; payload?: Record<string, unknown>; status?: string }) => Promise<unknown>
  deleteJob: (id: string) => Promise<void>
  refreshPosts: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
const BILLING_STORAGE_KEY = "qalam-billing"

const defaultProfile: WorkspaceProfile = {
  name: "",
  title: "",
  linkedinUrl: "",
  industry: "",
  goals: [],
  tone: "",
}

const defaultBilling: WorkspaceBilling = {
  plan: "Free",
  billingCycle: "monthly",
  checkoutReady: false,
}

const deriveBuckets = (posts: WorkspacePost[]) => ({
  drafts: posts.filter((post) => post.status === "draft"),
  scheduled: posts.filter((post) => post.status === "scheduled"),
  published: posts.filter((post) => post.status === "published"),
})

function WorkspaceProviderInner({ children, workspaceId, activeClientId }: { children: React.ReactNode; workspaceId: string; activeClientId: string | null }) {
  const [posts, setPosts] = useState<WorkspacePost[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [postsError, setPostsError] = useState<string | null>(null)
  const [profile, setProfile] = useState<WorkspaceProfile>(defaultProfile)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [billing, setBilling] = useState<WorkspaceBilling>(() => {
    if (typeof window === "undefined") return defaultBilling
    try {
      const raw = localStorage.getItem(BILLING_STORAGE_KEY)
      if (!raw) return defaultBilling
      const stored = JSON.parse(raw) as Partial<WorkspaceBilling>
      // Migrate old plan names from previous schema
      if (stored.plan === ("Team" as string)) stored.plan = "Agency Starter"
      if (stored.plan === ("Agency" as string)) stored.plan = "Agency Growth"
      return { ...defaultBilling, ...stored }
    } catch {
      return defaultBilling
    }
  })

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

  const fetchProfile = useCallback(async () => {
    setIsLoadingProfile(true)
    try {
      const res = await fetch(`/api/voice-profile?workspaceKey=${encodeURIComponent(workspaceId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load profile")
      setProfile(data.profile ? { ...defaultProfile, ...data.profile } : defaultProfile)
    } catch {
      setProfile(defaultProfile)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchPosts()
    fetchProfile()
  }, [fetchPosts, fetchProfile])

  useEffect(() => {
    try {
      localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(billing))
    } catch {
      // ignore local billing persistence failure
    }
  }, [billing])

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
    const scheduledTime = date && time ? `${date}T${time}:00` : null
    if (id) {
      const res = await fetch(`/api/posts?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: resolvedTitle, content, type, status: "scheduled", scheduledTime, workspaceKey: workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to schedule post")
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
    if (!res.ok) throw new Error(data.error || "Failed to schedule post")
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

  const deletePost = useCallback(async (id: string) => {
    const res = await fetch(`/api/posts?id=${id}&workspaceKey=${encodeURIComponent(workspaceId)}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to delete post")
    }
    setPosts((prev) => prev.filter((post) => post.id !== id))
  }, [workspaceId])

  const saveProfile = useCallback(async (input: WorkspaceProfile) => {
    const res = await fetch("/api/voice-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, workspaceKey: workspaceId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Failed to save profile")
    setProfile(data.profile ? { ...defaultProfile, ...data.profile } : input)
  }, [workspaceId])

  const saveBilling = useCallback((input: Partial<WorkspaceBilling>) => {
    setBilling((prev) => ({ ...prev, ...input }))
  }, [])

  const saveAgency = useCallback((_: Partial<LegacyWorkspaceState["agency"]>) => {}, [])
  const setWorkspaceState = useCallback((_: LegacyWorkspaceState | ((prev: LegacyWorkspaceState) => LegacyWorkspaceState)) => {}, [])

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

  const refreshPosts = useCallback(async () => {
    await fetchPosts()
  }, [fetchPosts])

  const buckets = useMemo(() => deriveBuckets(posts), [posts])

  const state = useMemo<LegacyWorkspaceState>(() => ({
    posts,
    drafts: buckets.drafts,
    scheduled: buckets.scheduled,
    published: buckets.published,
    profile,
    billing,
    agency: { activeClientId, clients: [], teamMembers: [] },
    competitors: [],
  }), [activeClientId, billing, buckets.drafts, buckets.published, buckets.scheduled, posts, profile])

  const value = useMemo<WorkspaceContextValue>(() => ({
    workspaceId,
    posts,
    drafts: buckets.drafts,
    scheduled: buckets.scheduled,
    published: buckets.published,
    isLoadingPosts,
    postsError,
    profile,
    isLoadingProfile,
    billing,
    state,
    remoteHydrated: !isLoadingPosts,
    remoteError: postsError,
    saveDraft,
    schedulePost,
    publishPost,
    deletePost,
    saveProfile,
    saveBilling,
    saveAgency,
    setWorkspaceState,
    loadEvents,
    trackEvent,
    loadJobs,
    createJob,
    deleteJob,
    refreshPosts,
  }), [billing, buckets.drafts, buckets.published, buckets.scheduled, createJob, deleteJob, deletePost, isLoadingPosts, isLoadingProfile, loadEvents, loadJobs, posts, postsError, profile, publishPost, refreshPosts, saveAgency, saveBilling, saveDraft, saveProfile, schedulePost, setWorkspaceState, state, trackEvent, workspaceId])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, authChecked, isLoadingAuth } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const clientParam = searchParams.get("client")
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(true)

  useEffect(() => {
    if (!authChecked || isLoadingAuth) return
    if (!user?.email) {
      const next = `${pathname || "/dashboard"}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      router.replace(`/auth?next=${encodeURIComponent(next)}`)
      setWorkspaceId(null)
      setResolveError("auth_required")
      setIsResolving(false)
      return
    }

    setIsResolving(true)
    setResolveError(null)
    const url = clientParam ? `/api/workspace?workspaceKey=${encodeURIComponent(clientParam)}` : "/api/workspace"

    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.workspaceId) throw new Error(data.error || "Failed to resolve workspace")
        setWorkspaceId(data.workspaceId)
        setResolveError(null)
      })
      .catch((error) => {
        setWorkspaceId(null)
        setResolveError((error as Error).message || "Failed to resolve workspace")
      })
      .finally(() => setIsResolving(false))
  }, [authChecked, clientParam, isLoadingAuth, pathname, router, searchParams, user?.email])

  if (isResolving) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50">
        <QalamMark size={40} />
        <div className="flex gap-1.5" aria-label="Loading workspace">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-teal/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!workspaceId) {
    const isSchemaError = resolveError === "schema_not_applied"
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16">
        <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <QalamMark size={36} />
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Workspace boot failed</p>
              <h1 className="text-2xl font-semibold text-zinc-950">{isSchemaError ? "Database setup incomplete" : "Workspace unavailable"}</h1>
            </div>
          </div>
          <p className="text-sm leading-6 text-zinc-600">
            {isSchemaError
              ? "Supabase is connected, but the app tables are missing in production. Apply supabase/schema.sql to the live project, then reload this page."
              : "The app could not resolve your workspace. Reload once. If it still fails, check the Vercel function logs for /api/workspace."}
          </p>
          {resolveError ? <pre className="mt-4 overflow-x-auto rounded-2xl bg-zinc-950 px-4 py-3 text-xs text-zinc-100">{resolveError}</pre> : null}
        </div>
      </div>
    )
  }

  return (
    <WorkspaceProviderInner workspaceId={workspaceId} activeClientId={clientParam} key={workspaceId}>
      {children}
    </WorkspaceProviderInner>
  )
}
export const useWorkspace = () => {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return context
}
