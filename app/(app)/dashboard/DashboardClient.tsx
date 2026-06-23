"use client"

import Link from "next/link"
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics"
import type { DashboardStats as Stats, DashboardPost as Post, UsageDay } from "@/lib/hooks/useDashboardMetrics"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

const fmtResetDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: "teal" | "amber" | "zinc"
}) {
  const borderColor =
    accent === "teal"
      ? "border-l-teal"
      : accent === "amber"
        ? "border-l-amber-400"
        : "border-l-zinc-300"
  const valueColor =
    accent === "teal"
      ? "text-teal"
      : accent === "amber"
        ? "text-amber-600"
        : "text-zinc-950"

  return (
    <div
      className={`rounded-2xl border border-zinc-200 border-l-[3px] bg-white p-5 shadow-sm ${borderColor}`}
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  )
}

function LockedStatCard({ label, upgradeText }: { label: string; upgradeText: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 border-l-[3px] border-l-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 select-none text-3xl font-bold text-zinc-200">--</p>
      <div className="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-[1px]">
        <Link href="/pricing" className="rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-600">
          {upgradeText}
        </Link>
      </div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="h-4 w-28 animate-pulse rounded bg-zinc-100" />
      <div className="mt-3 h-9 w-16 animate-pulse rounded bg-zinc-100" />
    </div>
  )
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ stats }: { stats: Stats }) {
  const { plan, draftsUsed, draftsTotal, draftsRemaining, postsPublished, carouselsUsed, resetDate, planExpiresAt } =
    stats
  const planNorm = plan.toLowerCase()
  const planLabel = capitalize(plan)
  const isFree = planNorm === "free"
  const isAgency = planNorm === "agency"

  const pct =
    draftsTotal && draftsTotal > 0
      ? Math.min(100, (draftsUsed / draftsTotal) * 100)
      : 0

  const expiryLabel = isFree
    ? `Resets ${fmtResetDate(resetDate)}`
    : planExpiresAt
      ? `Expires ${fmtResetDate(planExpiresAt)}`
      : `Renews ${fmtResetDate(resetDate)}`

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">Current plan</p>
          <p className="mt-2 text-2xl font-bold text-zinc-950">{planLabel}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
            isFree ? "bg-zinc-100 text-zinc-500" : "bg-teal/10 text-teal"
          }`}
        >
          {isFree ? "Free" : "Active"}
        </span>
      </div>

      <p className="mt-1 text-sm text-zinc-500">
        {expiryLabel}
      </p>

      {/* Progress bar */}
      {!isAgency && draftsTotal != null && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
            <span>{draftsUsed} used</span>
            <span>
              {draftsRemaining != null ? `${draftsRemaining} remaining` : "Unlimited"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-teal transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
        <span>
          {postsPublished} post{postsPublished !== 1 ? "s" : ""} published
        </span>
        <span>
          {carouselsUsed} carousel{carouselsUsed !== 1 ? "s" : ""} created
        </span>
      </div>

      {isFree && (
        <Link href="/pricing" className="mt-4 block w-full rounded-xl bg-teal px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-teal-600">
          Upgrade to Solo
        </Link>
      )}
      {planNorm === "solo" && (
        <Link href="/pricing" className="mt-4 block w-full rounded-xl bg-teal px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-teal-600">
          Upgrade to Pro
        </Link>
      )}
    </div>
  )
}

function PlanCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
          <div className="h-7 w-20 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-6 w-14 animate-pulse rounded-full bg-zinc-100" />
      </div>
      <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-zinc-100" />
      <div className="mt-3 flex gap-4">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-zinc-100" />
    </div>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: "Write Post",
    href: "/writer",
    desc: "AI-powered drafts",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    ),
  },
  {
    label: "Create Carousel",
    href: "/writer?mode=carousel",
    desc: "Slide decks",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    ),
  },
  {
    label: "Train Voice",
    href: "/voice",
    desc: "Teach the AI your tone",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    ),
  },
  {
    label: "Post Library",
    href: "/library",
    desc: "All your posts",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    ),
  },
]

function QuickActionsCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">
        Quick actions
      </h2>
      <div className="space-y-2">
        {QUICK_ACTIONS.map(({ label, href, desc, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <div className="flex items-center gap-3">
              <svg
                className="h-4 w-4 shrink-0 text-teal"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {icon}
              </svg>
              <div>
                <span className="text-sm font-semibold text-zinc-800">{label}</span>
                <span className="ml-2 text-xs text-zinc-400">{desc}</span>
              </div>
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Recent Posts ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-500 border-zinc-200",
  published: "bg-teal/8 text-teal border-teal/20",
  scheduled: "bg-blue-50 text-blue-600 border-blue-200",
  archived: "bg-zinc-100 text-zinc-400 border-zinc-200",
}

function PostRow({ post }: { post: Post }) {
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
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}
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

function RecentPostsSection({
  posts,
  error,
  onRetry,
}: {
  posts: Post[] | null
  error: boolean
  onRetry: () => void
}) {
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
          <button
            onClick={onRetry}
            className="mt-4 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Retry
          </button>
        </div>
      ) : posts === null ? (
        <div className="divide-y divide-zinc-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
              </div>
              <div className="h-6 w-10 shrink-0 animate-pulse rounded-full bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center px-8 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50">
            <svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            Create your first post and it will appear here.
          </p>
          <Link
            href="/writer"
            className="mt-6 rounded-xl bg-zinc-950 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            Write Post
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Usage Chart ──────────────────────────────────────────────────────────────

function UsageChart({
  usage,
  error,
  onRetry,
}: {
  usage: UsageDay[] | null
  error: boolean
  onRetry: () => void
}) {
  const maxVal = usage ? Math.max(1, ...usage.map((u) => u.draftsUsed)) : 1
  const hasActivity = usage ? usage.some((u) => u.draftsUsed > 0) : false

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-zinc-950">Usage this month</h2>
        {usage && (
          <span className="text-sm text-zinc-500">
            {usage.reduce((s, u) => s + u.draftsUsed, 0)} draft
            {usage.reduce((s, u) => s + u.draftsUsed, 0) !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-zinc-500">Could not load usage data.</p>
          <button
            onClick={onRetry}
            className="rounded-xl border border-zinc-200 px-4 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Retry
          </button>
        </div>
      ) : usage === null ? (
        <div className="flex h-40 items-end gap-px sm:gap-1">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-t bg-zinc-100"
              style={{ height: `${20 + Math.round(Math.sin(i) * 30 + 30)}px` }}
            />
          ))}
        </div>
      ) : !hasActivity ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-400">
          No activity yet this month
        </div>
      ) : (
        <div className="flex h-40 items-end gap-px sm:gap-1">
          {usage.map(({ day, draftsUsed }) => (
            <div
              key={day}
              title={`Day ${day}: ${draftsUsed} draft${draftsUsed !== 1 ? "s" : ""}`}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              <div
                className="w-full min-h-[3px] rounded-t-sm bg-zinc-900 transition-colors group-hover:bg-teal"
                style={{ height: `${Math.max(3, (draftsUsed / maxVal) * 136)}px` }}
              />
              {usage.length <= 15 && (
                <span className="text-[9px] text-zinc-400 tabular-nums">{day}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Writing Prompts ──────────────────────────────────────────────────────────

const ALL_PROMPTS = [
  "One mistake I made early in my career that I'm glad I made",
  "The thing nobody tells you when you start in your field",
  "I changed my mind about something I believed for years",
  "A lesson I learned the hard way that took me too long to accept",
  "What I wish someone had told me in my first job",
  "The most underrated skill in my industry right now",
  "Three things I stopped doing that made me better at my work",
  "An uncomfortable truth about how most people approach their field",
  "The advice I give new hires that my managers never gave me",
  "I failed publicly. Here is what happened and what I learned.",
  "Why I left a job that looked perfect on paper",
  "The tool or habit that changed how I work",
  "A conversation that shifted how I think about my career",
  "What success actually looks like vs what LinkedIn shows",
  "The skill I thought was soft that turned out to be everything",
  "How I deal with imposter syndrome (honestly, not inspirationally)",
  "The thing I do differently from everyone else in my role",
  "A project that flopped. What went wrong and what I'd change.",
  "What I learned from the best manager I ever had",
  "Why I stopped trying to be productive all the time",
  "The boundary I set at work that changed everything",
  "What no one talks about in my industry but everyone experiences",
  "A counterintuitive approach that actually works in my field",
  "The career move that looked like a step back but wasn't",
  "I used to think hard work was the answer. I was wrong.",
  "What AI actually changed about how I do my work",
  "The question I ask in every interview now and why",
  "Why I am more selective about what I say yes to",
  "A small habit that compounded into something significant",
  "What I tell people when they ask if they should enter my field",
]

function WritingPromptsCard() {
  const now = new Date()
  const dayIndex = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const prompts = Array.from({ length: 4 }, (_, i) => ALL_PROMPTS[(dayIndex + i) % ALL_PROMPTS.length])

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-950">Today&apos;s writing prompts</h2>
          <p className="mt-0.5 text-xs text-zinc-400">Fresh ideas every day. Click to write.</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <Link
            key={prompt}
            href={`/writer?topic=${encodeURIComponent(prompt)}`}
            className="group flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 transition-colors hover:border-teal/40 hover:bg-teal/5"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </span>
            <span className="text-sm leading-snug text-zinc-700 group-hover:text-zinc-950">{prompt}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function DashboardClient({ firstName }: { firstName: string }) {
  const {
    stats, statsError,
    posts, postsError,
    usage, usageError,
    reload: loadAll,
    reloadStats: loadStats,
    reloadPosts: loadPosts,
    reloadUsage: loadUsage,
  } = useDashboardMetrics()

  const greeting = firstName ? `Welcome back, ${firstName}` : "Welcome back"

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-zinc-500">Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950">
              {greeting}
            </h1>
          </div>
          <Link
            href="/writer"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Write new post
          </Link>
        </header>

        {/* Stats row */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsError ? (
            <>
              {[
                "Posts this month",
                "Drafts remaining",
                "Library posts",
                "Avg score",
              ].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-zinc-200 border-l-[3px] border-l-zinc-300 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold text-zinc-400">-</p>
                </div>
              ))}
            </>
          ) : stats === null ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <StatCardSkeleton key={i} />
              ))}
            </>
          ) : (
            <>
              <StatCard
                label="Posts this month"
                value={stats.postsThisMonth}
                accent="teal"
              />
              <StatCard
                label="Drafts remaining"
                value={stats.draftsRemaining ?? "∞"}
                accent="zinc"
              />
              <StatCard
                label="Library posts"
                value={stats.libraryPosts}
                accent="zinc"
              />
              {stats.plan.toLowerCase() === "free" ? (
                <LockedStatCard label="Avg score" upgradeText="Upgrade to Solo" />
              ) : (
                <StatCard
                  label="Avg score"
                  value={stats.avgScore != null ? stats.avgScore : "—"}
                  accent={
                    stats.avgScore != null && stats.avgScore >= 80
                      ? "teal"
                      : stats.avgScore != null && stats.avgScore > 0
                        ? "amber"
                        : "zinc"
                  }
                />
              )}
            </>
          )}
        </section>

        {/* Writing prompts */}
        <WritingPromptsCard />

        {/* Plan + Quick actions */}
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          {stats === null && !statsError ? (
            <PlanCardSkeleton />
          ) : stats ? (
            <PlanCard stats={stats} />
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
              <button
                onClick={loadStats}
                className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
              >
                Retry
              </button>
            </div>
          )}
          <QuickActionsCard />
        </div>

        {/* Recent posts */}
        <RecentPostsSection
          posts={posts}
          error={postsError}
          onRetry={loadPosts}
        />

        {/* Usage chart */}
        {stats && stats.plan.toLowerCase() === "free" ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-zinc-950">Usage analytics</h2>
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 text-center">
              <p className="text-sm font-semibold text-zinc-700">Track your daily writing activity</p>
              <Link href="/pricing" className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-600">Upgrade to Solo</Link>
            </div>
          </section>
        ) : (
          <>
            <UsageChart usage={usage} error={usageError} onRetry={loadUsage} />
            {stats && stats.plan.toLowerCase() === "solo" && (
              <p className="text-xs text-zinc-400 text-center -mt-4">
                Upgrade to Pro for advanced analytics and competitor insights. <Link href="/pricing" className="font-semibold text-teal underline">Learn more</Link>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
