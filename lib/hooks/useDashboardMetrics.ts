"use client"

import { useCallback, useEffect, useState } from "react"

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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsError, setStatsError] = useState(false)
  const [posts, setPosts] = useState<DashboardPost[] | null>(null)
  const [postsError, setPostsError] = useState(false)
  const [usage, setUsage] = useState<UsageDay[] | null>(null)
  const [usageError, setUsageError] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats")
      if (!res.ok) throw new Error("failed")
      setStats(await res.json() as DashboardStats)
      setStatsError(false)
    } catch {
      setStatsError(true)
    }
  }, [])

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/recent-posts")
      if (!res.ok) throw new Error("failed")
      setPosts(await res.json() as DashboardPost[])
      setPostsError(false)
    } catch {
      setPostsError(true)
    }
  }, [])

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/usage")
      if (!res.ok) throw new Error("failed")
      setUsage(await res.json() as UsageDay[])
      setUsageError(false)
    } catch {
      setUsageError(true)
    }
  }, [])

  const loadAll = useCallback(() => {
    loadStats()
    loadPosts()
    loadUsage()
  }, [loadStats, loadPosts, loadUsage])

  useEffect(() => {
    loadAll()
    const onVisibility = () => { if (!document.hidden) loadAll() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
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
