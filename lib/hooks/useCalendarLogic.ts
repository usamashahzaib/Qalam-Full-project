"use client"

import { useMemo, useRef, useState } from "react"
import { shareToLinkedIn } from "@/lib/api/client"
import { isCarouselPostType } from "@/lib/post-content"
import { isReadyContentScore, MIN_READY_CONTENT_SCORE } from "@/lib/content-score-gate"
import type { WorkspacePost } from "@/types/domain"

// ─── Helpers (kept local - calendar-specific) ─────────────────────────────────

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
const toDate = (value: string) => new Date(`${value}T00:00:00`)
const toLocalIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = () => toLocalIso(new Date())
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
  publishPost: (input: { id: string; title: string; content: string; type: string; publishedAt: string; externalPostUrn?: string | null; engagementScore?: number | null }) => Promise<string>
  refreshPosts: () => Promise<void>
}

export function useCalendarLogic({
  scheduled,
  drafts,
  published,
  workspaceId,
  linkedinMemberId,
  publishPost,
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
    )?.date || toLocalIso(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1))
  }, [monthCursor, selectedDay, scheduled])

  const monthGrid = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const firstWeekday = (start.getDay() + 6) % 7
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() - firstWeekday)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(cursor)
      date.setDate(cursor.getDate() + index)
      const iso = toLocalIso(date)
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
    if (!isReadyContentScore(post.engagementScore)) {
      setStatus(`Improve this post to a content score of ${MIN_READY_CONTENT_SCORE}+ before publishing.`)
      return
    }
    if (isCarouselPostType(post.type)) {
      setStatus("Carousels can't be auto-published yet. Export the PDF from Carousels and post it manually on LinkedIn.")
      return
    }
    setPublishingId(post.id)
    setStatus(`Publishing ${post.title}...`)

    let postUrn: string | null = null
    try {
      const result = await shareToLinkedIn({ content: post.content, postId: post.id, workspaceKey: workspaceId })
      if (!result.postUrn) throw new Error("LinkedIn did not confirm the post.")
      postUrn = normalizeLinkedInUrn(result.postUrn || "") || null
    } catch (error) {
      setStatus(`LinkedIn publish failed: ${(error as Error).message || "Reconnect LinkedIn and try again."}`)
      setPublishingId(null)
      return
    }

    // LinkedIn share succeeded - the post is live. From here we only persist the
    // record; never re-attempt shareToLinkedIn or prompt the composer again.
    try {
      await publishPost({
        id: post.id,
        title: post.title,
        content: post.content,
        type: post.type,
        publishedAt: new Date().toISOString(),
        externalPostUrn: postUrn,
        engagementScore: post.engagementScore,
      })
      setStatus(`Published: ${post.title}`)
    } catch (error) {
      setStatus(`Published to LinkedIn, but saving the record failed: ${(error as Error).message || "unknown error"}. It will not be re-posted - refresh to check Library.`)
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
    // Reject if IDs don't match - prevents a foreign drag-data injection from
    // rescheduling a post that wasn't started from this calendar's onDragStart.
    if (!postId || !post || postId !== post.id) return
    if (post.date === targetDate) return
    setDraggingPost(null)
    dragPostRef.current = null
    await onReschedule(postId, targetDate)
  }

  const selectDay = (iso: string) => {
    if (!isIsoDate(iso) || iso < today) return
    const next = toDate(iso)
    setSelectedDay(iso)
    if (next.getMonth() !== monthCursor.getMonth() || next.getFullYear() !== monthCursor.getFullYear()) {
      setMonthCursor(new Date(next.getFullYear(), next.getMonth(), 1))
    }
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
    selectDay,
    onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
    shiftMonth,
    goToToday,
    // expose isIsoDate and isPastDay for render conditions
    isIsoDate,
    isPastDay: (value: string) => isIsoDate(value) && value < today,
  }
}
