"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { WorkspacePost } from "@/types/domain"
import { withClientParam } from "@/lib/workspace-navigation"

type NavLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
type NavGroup = { label: string; links: NavLink[] }

type Entry =
  | { kind: "action"; key: string; label: string; sub: string; run: () => void }
  | { kind: "nav"; key: string; label: string; sub: string; icon: NavLink["icon"]; run: () => void }
  | { kind: "post"; key: string; label: string; sub: string; run: () => void }

export function CommandMenu({
  open,
  onClose,
  navGroups,
  posts,
  activeClientId,
  onOpenPost,
  onCreatePost,
}: {
  open: boolean
  onClose: () => void
  navGroups: NavGroup[]
  posts: WorkspacePost[]
  activeClientId: string | null
  onOpenPost: (post: WorkspacePost) => void
  onCreatePost: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => {
      setQuery("")
      setActiveIndex(0)
      inputRef.current?.focus()
    })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const navItems = useMemo(
    () => navGroups.flatMap((group) => group.links.map((link) => ({ ...link, group: group.label }))),
    [navGroups]
  )

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim().toLowerCase()
    const list: Entry[] = []

    if (!q || "new post".includes(q) || "create post".includes(q) || "write".includes(q)) {
      list.push({
        kind: "action",
        key: "new-post",
        label: "New post",
        sub: "Start a fresh draft in the writer",
        run: () => { onCreatePost(); onClose() },
      })
    }

    if (q) {
      posts
        .filter((post) => [post.title, post.content, post.type].some((value) => String(value).toLowerCase().includes(q)))
        .slice(0, 5)
        .forEach((post) => {
          list.push({
            kind: "post",
            key: `post-${post.id}`,
            label: post.title,
            sub: `${post.status} - ${post.type}`,
            run: () => { onOpenPost(post); onClose() },
          })
        })
    }

    const matchedNav = q ? navItems.filter((item) => item.label.toLowerCase().includes(q)) : navItems
    matchedNav.forEach((item) => {
      list.push({
        kind: "nav",
        key: item.href,
        label: item.label,
        sub: item.group,
        icon: item.icon,
        run: () => { router.push(withClientParam(item.href, activeClientId)); onClose() },
      })
    })

    return list
  }, [query, posts, navItems, onCreatePost, onOpenPost, onClose, router, activeClientId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, entries.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      entries[activeIndex]?.run()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-zinc-950/50 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="qalam-modal-panel w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search posts, jump to a page..."
            className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <kbd className="hidden shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-400 sm:inline">esc</kbd>
        </div>

        <div className="qalam-scrollbar max-h-80 overflow-y-auto p-2">
          {entries.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-400">No matches.</p>
          ) : (
            entries.map((entry, i) => (
              <button
                key={entry.key}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={entry.run}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  i === activeIndex ? "bg-teal/10 text-teal" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {entry.kind === "nav" ? (
                  <entry.icon className="h-4 w-4 shrink-0" />
                ) : entry.kind === "action" ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-base leading-none">+</span>
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{entry.label}</span>
                  <span className="block truncate text-xs text-zinc-400">{entry.sub}</span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-zinc-100 px-4 py-2.5 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1"><kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-semibold">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-semibold">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-semibold">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
