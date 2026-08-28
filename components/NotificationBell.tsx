"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

const POLL_MS = 45_000

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data?.notifications ?? [])
      setUnreadCount(data?.unreadCount ?? 0)
    } catch {
      // Silent - the bell just stays at its last known state until the next poll.
    }
  }

  useEffect(() => {
    const initial = window.setTimeout(load, 0)
    const interval = setInterval(load, POLL_MS)
    return () => {
      window.clearTimeout(initial)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined)
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    setUnreadCount(0)
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        title="Notifications"
        className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:border-teal/40 hover:text-teal"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 t-eyebrow text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="qalam-scrollbar absolute right-0 top-10 z-40 max-h-96 w-80 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Notifications</p>
            {unreadCount > 0 ? (
              <button onClick={markAllRead} className="text-xs font-semibold text-teal hover:text-teal-700">
                Mark all read
              </button>
            ) : null}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs font-medium text-zinc-500">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {notifications.map((n) => {
                const content = (
                  <div
                    className={`flex flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${
                      n.read_at ? "" : "bg-teal/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {!n.read_at ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" /> : null}
                      <p className="text-xs font-bold text-zinc-900">{n.title}</p>
                    </div>
                    {n.body ? <p className="text-xs leading-relaxed text-zinc-600">{n.body}</p> : null}
                    <p className="mt-0.5 t-eyebrow text-zinc-400">{timeAgo(n.created_at)}</p>
                  </div>
                )
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => { if (!n.read_at) markRead(n.id); setOpen(false) }} className="block cursor-pointer">
                    {content}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => markRead(n.id)} className="block w-full cursor-pointer">
                    {content}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
