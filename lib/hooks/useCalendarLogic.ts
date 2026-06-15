"use client"

import { useMemo, useRef, useState } from "react"
import { shareToLinkedIn } from "@/lib/api/client"
import type { WorkspacePost } from "@/types/domain"

// ─── Helpers (kept local - calendar-specific) ─────────────────────────────────

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
const toDate = (value: string) => new Date(`${value}T00:00:00`)
const todayIso = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
const normalizeLinkedInUrn = (value: string) => {
  const urn = value.trim()
  if (!urn) return ""
  return urn.startsWith("urn:") ? urn : `urn:li:share:${urn}`
}

const DRAG_POST_KEY = "qalam-drag-post-id"

export type CalendarView = "calendar" | "list"

export interface CalendarLogicDeps {
  scheduled: WorkspacePost[]
  drafts: WorkspacePost[]
  published: WorkspacePost[]
  workspaceId: string
  linkedinMemberId: string | null
  publishPost: (input: { id: string; title: string; content: string; type: string; publishedAt: string; externalPostUrn?: string | null }) => Promise<string>
  createJob: (input: { type: string; status: string; title: string; payload: Record<string, unknown> }) => Promise<unknown>
  refreshPosts: () => Promise<void>
}

export function useCalendarLogic({
  scheduled,
  drafts,
  published,
  workspaceId,
  linkedinMemberId,
  publishPost,
  createJob,
  refreshPosts,
}: CalendarLogicDeps) {
  const today = todayIso()

  const [status, setStatus] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const futureDateStr = scheduled
      .map((post) => post.date)
      .filter(isIsoDate)
      .find((d) => toDate(d) >= thisMonthStart)
    return futureDateStr ? toDate(futureDateStr) : now
  })
  const [selectedDay, setSelectedDay] = useState(today)
  const [view, setView] = useState<CalendarView>("calendar")
  const [draggingPost, setDraggingPost] = useState<WorkspacePost | null>(null)
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const [rescheduling, setRescheduling] = useState(false)
  const dragPostRef = useRef<WorkspacePost | null>(null)

  // ─── Derived data maps ────────────────────────────────────────────────────

  const scheduledByDay = useMemo(() => {
    const map = new Map<string, WorkspacePost[]>()
    scheduled.filter((post) => isIsoDate(post.date)).forEach((post) => {
      const bucket = map.get(post.date) || []
      bucket.push(post)
      map.set(post.date, bucket)
    })
    return map
  }, [scheduled])

  const draftByDay = useMemo(() => {
    const map = new Map<string, WorkspacePost[]>()
    drafts.filter((post) => isIsoDate(post.date)).forEach((post) => {
      const bucket = map.get(post.date) || []
      bucket.push(post)
      map.set(post.date, bucket)
    })
    return map
  }, [drafts])

  const publishedByDay = useMemo(() => {
    const map = new Map<string, WorkspacePost[]>()
    published.filter((post) => isIsoDate(post.date)).forEach((post) => {
      const bucket = map.get(post.date) || []
      bucket.push(post)
      map.set(post.date, bucket)
    })
    return map
  }, [published])

  const effectiveSelectedDay = useMemo(() => {
    const inCurrentMonth = selectedDay && isIsoDate(selectedDay) &&
      toDate(selectedDay).getMonth() === monthCursor.getMonth() &&
      toDate(selectedDay).getFullYear() === monthCursor.getFullYear()
    if (inCurrentMonth) return selectedDay
    return scheduled.find((post) =>
      isIsoDate(post.date) &&
      toDate(post.date).getMonth() === monthCursor.getMonth() &&
      toDate(post.date).getFullYear() === monthCursor.getFullYear()
    )?.date || new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).toISOString().slice(0, 10)
  }, [monthCursor, selectedDay, scheduled])

  const monthGrid = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const firstWeekday = (start.getDay() + 6) % 7
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() - firstWeekday)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(cursor)
      date.setDate(cursor.getDate() + index)
      const iso = date.toISOString().slice(0, 10)
      return {
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === monthCursor.getMonth(),
        scheduled: scheduledByDay.get(iso) || [],
        drafts: draftByDay.get(iso) || [],
        published: publishedByDay.get(iso) || [],
      }
    })
  }, [draftByDay, monthCursor, publishedByDay, scheduledByDay])

  const dayItems = useMemo(() => ({
    scheduled: scheduledByDay.get(effectiveSelectedDay) || [],
    drafts: draftByDay.get(effectiveSelectedDay) || [],
    published: publishedByDay.get(effectiveSelectedDay) || [],
  }), [draftByDay, effectiveSelectedDay, publishedByDay, scheduledByDay])

  const selectedMonthScheduled = useMemo(
    () => scheduled.filter((post) =>
      isIsoDate(post.date) &&
      toDate(post.date).getMonth() === monthCursor.getMonth() &&
      toDate(post.date).getFullYear() === monthCursor.getFullYear()
    ),
    [monthCursor, scheduled]
  )

  const allScheduledSorted = useMemo(
    () => [...scheduled].sort((a, b) => (a.scheduledTime || a.date).localeCompare(b.scheduledTime || b.date)),
    [scheduled]
  )

  // ─── Actions ──────────────────────────────────────────────────────────────

  const onPublishNow = async (post: WorkspacePost) => {
    if (!linkedinMemberId) { setStatus("Connect LinkedIn in settings first"); return }
    setPublishingId(post.id)
    setStatus(`Publishing ${post.title}...`)
    try {
      const result = await shareToLinkedIn({ content: post.content, postId: post.id, workspaceKey: workspaceId })
      const postUrn = normalizeLinkedInUrn(result.postUrn || "") || null
      await publishPost({ id: post.id, title: post.title, content: post.content, type: post.type, publishedAt: new Date().toISOString(), externalPostUrn: postUrn })
      if (post.type.toLowerCase().includes("carousel")) {
        await createJob({ type: "carousel_generation", status: "queued", title: "Carousel asset generation", payload: { postId: post.id, postUrn, title: post.title } }).catch(() => undefined)
      }
      setStatus(`Published: ${post.title}`)
    } catch (error) {
      setStatus((error as Error).message || "LinkedIn publish failed")
    } finally {
      setPublishingId(null)
    }
  }

  const onReschedule = async (postId: string, newDate: string) => {
    setRescheduling(true)
    try {
      const res = await fetch("/api/posts/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, date: newDate, workspaceKey: workspaceId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || "Reschedule failed")
      }
      await refreshPosts()
      setStatus(`Rescheduled to ${newDate}`)
      setTimeout(() => setStatus(null), 3000)
    } catch (e) {
      setStatus((e as Error).message)
    } finally {
      setRescheduling(false)
    }
  }

  const onUnschedule = async (postId: string) => {
    try {
      const res = await fetch("/api/posts/unschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, workspaceKey: workspaceId }),
      })
      if (!res.ok) throw new Error("Unschedule failed")
      await refreshPosts()
      setStatus("Post moved back to drafts")
      setTimeout(() => setStatus(null), 3000)
    } catch (e) {
      setStatus((e as Error).message)
    }
  }

  // ─── Drag-to-reschedule ───────────────────────────────────────────────────

  const onDragStart = (e: React.DragEvent, post: WorkspacePost) => {
    e.dataTransfer.setData(DRAG_POST_KEY, post.id)
    e.dataTransfer.effectAllowed = "move"
    dragPostRef.current = post
    setDraggingPost(post)
  }

  const onDragEnd = () => {
    setDraggingPost(null)
    setDragOverDay(null)
    dragPostRef.current = null
  }

  const onDragOver = (e: React.DragEvent, iso: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverDay(iso)
  }

  const onDragLeave = () => setDragOverDay(null)

  const onDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault()
    setDragOverDay(null)
    const postId = e.dataTransfer.getData(DRAG_POST_KEY)
    const post = dragPostRef.current
    if (!postId || !post) return
    if (post.date === targetDate) return
    setDraggingPost(null)
    dragPostRef.current = null
    await onReschedule(postId, targetDate)
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(monthCursor)
    next.setMonth(next.getMonth() + delta)
    setMonthCursor(next)
  }

  const goToToday = () => {
    setMonthCursor(new Date())
    setSelectedDay(today)
  }

  return {
    today,
    status, publishingId, rescheduling,
    monthCursor, selectedDay, setSelectedDay,
    view, setView,
    draggingPost, dragOverDay,
    scheduledByDay, draftByDay, publishedByDay,
    effectiveSelectedDay,
    monthGrid,
    dayItems,
    selectedMonthScheduled,
    allScheduledSorted,
    onPublishNow,
    onReschedule,
    onUnschedule,
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
    shiftMonth,
    goToToday,
    // expose isIsoDate and isPastDay for render conditions
    isIsoDate,
    isPastDay: (value: string) => isIsoDate(value) && value < today,
  }
}
