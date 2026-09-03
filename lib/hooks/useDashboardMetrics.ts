"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"

export type DashboardStats = {
  postsThisMonth: number
  draftsRemaining: number | null
  draftsUsed: number
  draftsTotal: number | null
  libraryPosts: number
  avgScore: number | null
  plan: string
  carouselsUsed: number
  postsPublished: number
  resetDate: string
  planExpiresAt?: string | null
}

export type DashboardPost = {
  id: string
  title: string
  date: string
  score: number | null
  status: string
}

export type UsageDay = {
  day: number
  draftsUsed: number
}

export function useDashboardMetrics() {
  const { workspaceId } = useWorkspace()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsError, setStatsError] = useState(false)
  const [posts, setPosts] = useState<DashboardPost[] | null>(null)
  const [postsError, setPostsError] = useState(false)
  const [usage, setUsage] = useState<UsageDay[] | null>(null)
  const [usageError, setUsageError] = useState(false)
  const statsSeq = useRef(0)
  const postsSeq = useRef(0)
  const usageSeq = useRef(0)
  const lastFetchTime = useRef(0)

  const loadStatsRequest = useCallback(async (signal?: AbortSignal) => {
    const seq = ++statsSeq.current
    try {
      const res = await fetch(`/api/dashboard/stats?workspaceKey=${encodeURIComponent(workspaceId)}`, { signal })
      if (!res.ok) throw new Error("failed")
      const next = await res.json() as DashboardStats
      if (seq !== statsSeq.current) return
      setStats(next)
      setStatsError(false)
    } catch (error) {
      if ((error as Error).name === "AbortError" || seq !== statsSeq.current) return
      setStatsError(true)
    }
  }, [workspaceId])

  const loadPostsRequest = useCallback(async (signal?: AbortSignal) => {
    const seq = ++postsSeq.current
    try {
      const res = await fetch(`/api/dashboard/recent-posts?workspaceKey=${encodeURIComponent(workspaceId)}`, { signal })
      if (!res.ok) throw new Error("failed")
      const next = await res.json() as DashboardPost[]
      if (seq !== postsSeq.current) return
      setPosts(next)
      setPostsError(false)
    } catch (error) {
      if ((error as Error).name === "AbortError" || seq !== postsSeq.current) return
      setPostsError(true)
    }
  }, [workspaceId])

  const loadUsageRequest = useCallback(async (signal?: AbortSignal) => {
    const seq = ++usageSeq.current
    try {
      const res = await fetch(`/api/dashboard/usage?workspaceKey=${encodeURIComponent(workspaceId)}`, { signal })
      if (!res.ok) throw new Error("failed")
      const next = await res.json() as UsageDay[]
      if (seq !== usageSeq.current) return
      setUsage(next)
      setUsageError(false)
    } catch (error) {
      if ((error as Error).name === "AbortError" || seq !== usageSeq.current) return
      setUsageError(true)
    }
  }, [workspaceId])

  const loadStats = useCallback(() => { void loadStatsRequest() }, [loadStatsRequest])
  const loadPosts = useCallback(() => { void loadPostsRequest() }, [loadPostsRequest])
  const loadUsage = useCallback(() => { void loadUsageRequest() }, [loadUsageRequest])

  const loadAll = useCallback((signal?: AbortSignal) => {
    lastFetchTime.current = Date.now()
    loadStatsRequest(signal)
    loadPostsRequest(signal)
    loadUsageRequest(signal)
  }, [loadStatsRequest, loadPostsRequest, loadUsageRequest])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => loadAll(controller.signal), 0)
    const onVisibility = () => {
      if (!document.hidden && Date.now() - lastFetchTime.current > 60_000) loadAll()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [loadAll])

  return {
    stats, statsError,
    posts, postsError,
    usage, usageError,
    reload: loadAll,
    reloadStats: loadStats,
    reloadPosts: loadPosts,
    reloadUsage: loadUsage,
  }
}
