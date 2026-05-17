"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"

type WorkspaceEvent = { event_type?: string; payload?: Record<string, unknown>; created_at?: string }
type WorkspaceJob = { job_type?: string; status?: string; created_at?: string }

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0)

export default function DashboardPage() {
  const { state, loadEvents, loadJobs } = useWorkspace()
  const [events, setEvents] = useState<WorkspaceEvent[]>([])
  const [jobs, setJobs] = useState<WorkspaceJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([loadEvents(300), loadJobs("", 100)])
      .then(([nextEvents, nextJobs]) => {
        if (!active) return
        setEvents(Array.isArray(nextEvents) ? (nextEvents as WorkspaceEvent[]) : [])
        setJobs(Array.isArray(nextJobs) ? (nextJobs as WorkspaceJob[]) : [])
      })
      .catch(() => {
        if (!active) return
        setEvents([])
        setJobs([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadEvents, loadJobs, state.posts.length])

  const summary = useMemo(() => {
    const publishedEvents = events.filter((item) => item.event_type === "post_published")
    const scheduledEvents = events.filter((item) => item.event_type === "post_scheduled")
    const draftEvents = events.filter((item) => item.event_type === "draft_saved")
    const impressions = publishedEvents.reduce((sum, item) => sum + num(item.payload?.impressions), 0)
    const avgEngagement = publishedEvents.length
      ? (publishedEvents.reduce((sum, item) => sum + num(item.payload?.engagementRate), 0) / publishedEvents.length).toFixed(1)
      : "0.0"
    const carouselJobs = jobs.filter((job) => job.job_type === "carousel_generation").length
    return { publishedEvents, scheduledEvents, draftEvents, impressions, avgEngagement, carouselJobs }
  }, [events, jobs])

  const recent = [...state.posts].sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1)).slice(0, 6)

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Real workspace, event, and job telemetry only.</p>
        </div>
        <Link href="/writer" className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 transition-colors shadow-sm">Write post</Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="h-3 w-16 rounded bg-zinc-200 mb-4"></div>
                <div className="h-8 w-10 rounded bg-zinc-200 mb-3"></div>
                <div className="h-2 w-24 rounded bg-zinc-100"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={`sub-${i}`} className="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                <div className="h-3 w-20 rounded bg-zinc-200 mb-4"></div>
                <div className="h-8 w-12 rounded bg-zinc-200 mb-3"></div>
                <div className="h-2 w-20 rounded bg-zinc-100"></div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4">
               <div className="h-4 w-32 rounded bg-zinc-200"></div>
            </div>
            <div className="divide-y divide-zinc-50">
              {[1, 2, 3].map((i) => (
                <div key={`row-${i}`} className="px-5 py-4 flex justify-between items-center">
                  <div>
                     <div className="h-4 w-48 rounded bg-zinc-200 mb-2"></div>
                     <div className="h-3 w-32 rounded bg-zinc-100"></div>
                  </div>
                  <div className="h-4 w-16 rounded bg-zinc-100"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Drafts" value={String(state.drafts.length)} sub={`${summary.draftEvents.length} save events`} />
            <Stat label="Scheduled" value={String(state.scheduled.length)} sub={`${summary.scheduledEvents.length} schedule events`} />
            <Stat label="Published" value={String(state.published.length)} sub={`${summary.publishedEvents.length} publish events`} />
            <Stat label="Impressions" value={String(summary.impressions)} sub={`${summary.avgEngagement}% avg engagement`} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Jobs" value={String(jobs.length)} sub={`${summary.carouselJobs} carousel jobs`} />
            <Stat label="Events" value={String(events.length)} sub="latest 300 fetched" />
            <Stat label="Remote sync" value={state.posts.length ? "Active" : "Empty"} sub="workspace state" />
            <Stat label="Load" value={loading ? "Loading" : "Ready"} sub="events + jobs" />
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Recent posts</h2>
              <span className="text-xs text-zinc-500">{recent.length} shown</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {recent.length === 0 ? (
                <p className="px-5 py-8 text-sm text-zinc-500">No posts yet. Start from writer.</p>
              ) : (
                recent.map((post) => (
                  <div key={post.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{post.title}</p>
                      <p className="text-xs text-zinc-500">
                        {post.type} - {post.date}
                        {post.scheduledTime ? ` - ${post.scheduledTime}` : ""}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-zinc-500">{post.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p><p className="mt-1 text-xs text-zinc-500">{sub}</p></div>
}

