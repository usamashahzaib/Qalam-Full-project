import Link from "next/link"
import {
  getSessionContext,
  fetchRecentPosts,
  type DashboardPost,
} from "@/lib/server/dashboard"
import { ensureWorkspaceForUser } from "@/lib/server/workspace"
import { RefreshButton } from "../_components/refresh-button"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// ─── Post Row ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-500 border-zinc-200",
  published: "bg-teal/8 text-teal border-teal/20",
  scheduled: "bg-blue-50 text-blue-600 border-blue-200",
  archived: "bg-zinc-100 text-zinc-400 border-zinc-200",
}

function PostRow({ post }: { post: DashboardPost }) {
  const score = post.score ?? 0
  const scoreColor =
    score >= 80
      ? "text-teal bg-teal/8 border-teal/20"
      : score >= 60
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-zinc-500 bg-zinc-100 border-zinc-200"
  const statusStyle = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft

  return (
    <Link
      href={`/writer?id=${post.id}`}
      className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-zinc-50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900">{post.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusStyle}`}
          >
            {capitalize(post.status)}
          </span>
          <span className="text-xs text-zinc-400">{fmtDate(post.date)}</span>
        </div>
      </div>
      {score > 0 && (
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${scoreColor}`}
        >
          {score}
        </span>
      )}
    </Link>
  )
}

// ─── Feed Slot Page ───────────────────────────────────────────────────────────

export default async function FeedPage() {
  let posts: DashboardPost[] | null = null
  let error = false

  try {
    const ctx = await getSessionContext()
    const workspaceId = await ensureWorkspaceForUser({ userId: ctx.supabaseUserId, email: ctx.email })
    posts = await fetchRecentPosts(workspaceId)
  } catch {
    error = true
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="text-base font-bold text-zinc-950">Recent posts</h2>
        <Link
          href="/library"
          className="text-sm font-semibold text-teal transition-colors hover:text-teal-700"
        >
          View library
        </Link>
      </div>

      {error ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <p className="text-sm font-semibold text-zinc-700">Could not load posts.</p>
          <RefreshButton label="Retry" className="mt-4 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50" />
        </div>
      ) : posts && posts.length === 0 ? (
        <div className="flex flex-col items-center px-8 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50">
            <svg
              className="h-7 w-7 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <p className="mt-4 text-base font-bold text-zinc-900">No posts yet</p>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            AI generates hooks and a full draft in seconds.
          </p>
          <Link
            href="/writer"
            className="mt-6 rounded-xl bg-teal px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
          >
            Write your first post
          </Link>
        </div>
      ) : posts ? (
        <div className="divide-y divide-zinc-100">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
