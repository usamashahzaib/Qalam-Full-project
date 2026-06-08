import Link from "next/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

// ─── Types ───────────────────────────────────────────────────────────────────

type PostRow = {
  id: string
  title?: string | null
  content?: string | null
  role?: string | null
  score?: number | null
  created_at: string
}

type UserRow = {
  plan?: string | null
  remaining_drafts?: number | null
  plan_expires_at?: string | null
  billing_status?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const monthStart = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

const nextMonthStart = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
}

const labelRole = (role?: string | null) =>
  (role || "General").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

const normalizePlan = (plan?: string | null, expired = false) => {
  if (expired) return "free"
  return (plan || "free").toLowerCase()
}

// ─── Async data-fetching sub-components (Suspense boundaries) ────────────────

async function StatsSection({ userId }: { userId: string }) {
  const supabase = createServiceClient()
  const start = monthStart()

  const [postsMonthRes, libraryRes, userRes, carouselRes] = await Promise.allSettled([
    supabase
      .from("posts")
      .select("score")
      .eq("user_id", userId)
      .gte("created_at", start),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("users")
      .select("plan,remaining_drafts,plan_expires_at,billing_status")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("carousels")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", start),
  ])

  const monthPosts =
    postsMonthRes.status === "fulfilled" ? (postsMonthRes.value.data || []) : []
  const libraryCount =
    libraryRes.status === "fulfilled" ? (libraryRes.value.count ?? 0) : 0
  const user: UserRow | null =
    userRes.status === "fulfilled" ? (userRes.value.data ?? null) : null
  const carouselCount =
    carouselRes.status === "fulfilled" ? (carouselRes.value.count ?? 0) : 0

  const scores = monthPosts.map((p: { score?: number | null }) => Number(p.score || 0)).filter(Boolean)
  const avgScore = scores.length
    ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length)
    : 0

  const expired = Boolean(user?.plan_expires_at && new Date(user.plan_expires_at) < new Date())
  const plan = normalizePlan(user?.plan, expired)
  const remaining = user?.remaining_drafts ?? 0
  const isFree = plan === "free"
  const renewalDate = nextMonthStart()
  const postsThisMonth = monthPosts.length
  const used = isFree ? Math.max(0, 5 - remaining) : postsThisMonth

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Posts this month" value={postsThisMonth} accent="teal" />
        <StatCard label="Drafts remaining" value={remaining} accent="zinc" />
        <StatCard label="Library posts" value={libraryCount} accent="zinc" />
        <StatCard
          label="Avg score"
          value={avgScore || "—"}
          accent={avgScore >= 80 ? "teal" : avgScore > 0 ? "amber" : "zinc"}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <PlanCard
          plan={plan}
          isFree={isFree}
          postsThisMonth={postsThisMonth}
          used={used}
          remaining={remaining}
          renewalDate={renewalDate}
          carouselCount={carouselCount}
        />
        <QuickActionsCard />
      </div>
    </>
  )
}

async function RecentPostsSection({ userId }: { userId: string }) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("posts")
    .select("id,title,content,role,score,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)

  if (error) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-bold text-zinc-950">Recent posts</h2>
        </div>
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <p className="text-sm font-semibold text-zinc-700">Could not load posts.</p>
          <a
            href="/dashboard"
            className="mt-4 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Retry
          </a>
        </div>
      </div>
    )
  }

  const posts = (data || []) as PostRow[]

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
      {posts.length === 0 ? (
        <EmptyPostsState />
      ) : (
        <div className="divide-y divide-zinc-100">
          {posts.map((post) => (
            <PostListRow key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}

async function UsageChartSection({ userId }: { userId: string }) {
  const supabase = createServiceClient()
  const start = monthStart()

  const { data, error } = await supabase
    .from("posts")
    .select("created_at,role")
    .eq("user_id", userId)
    .gte("created_at", start)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-zinc-950">Usage this month</h2>
        <p className="mt-4 text-sm text-zinc-500">Could not load usage data.</p>
      </section>
    )
  }

  const rows = (data || []) as { created_at: string; role?: string | null }[]
  const today = new Date().getDate()
  const days = Array.from({ length: today }, (_, i) => i + 1)
  const daily = days.map((d) =>
    rows.filter((r) => new Date(r.created_at).getDate() === d).length
  )
  const maxDaily = Math.max(1, ...daily)

  const roleCounts = rows.reduce<Record<string, number>>((acc, r) => {
    const role = r.role || "general"
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {})
  const mostUsedRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-zinc-950">Usage this month</h2>
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          {mostUsedRole && (
            <span>
              Top role:{" "}
              <span className="font-semibold text-zinc-700">{labelRole(mostUsedRole)}</span>
            </span>
          )}
          <span>{rows.length} post{rows.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      {daily.every((v) => v === 0) ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-400">
          No activity yet this month
        </div>
      ) : (
        <div className="flex h-40 items-end gap-px sm:gap-1">
          {daily.map((count, index) => (
            <div
              key={index}
              title={`Day ${index + 1}: ${count} post${count !== 1 ? "s" : ""}`}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              <div
                className="w-full min-h-[3px] rounded-t-sm bg-zinc-900 transition-colors group-hover:bg-teal"
                style={{ height: `${Math.max(3, (count / maxDaily) * 136)}px` }}
              />
              {days.length <= 15 && (
                <span className="text-[9px] text-zinc-400 tabular-nums">{index + 1}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── UI components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: "teal" | "amber" | "zinc"
}) {
  const border =
    accent === "teal"
      ? "border-l-teal"
      : accent === "amber"
        ? "border-l-amber-400"
        : "border-l-zinc-300"
  const color =
    accent === "teal"
      ? "text-teal"
      : accent === "amber"
        ? "text-amber-600"
        : "text-zinc-950"
  return (
    <div className={`rounded-2xl border border-zinc-200 border-l-[3px] bg-white p-5 shadow-sm ${border}`}>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function PlanCard({
  plan,
  isFree,
  postsThisMonth,
  used,
  remaining,
  renewalDate,
  carouselCount,
}: {
  plan: string
  isFree: boolean
  postsThisMonth: number
  used: number
  remaining: number
  renewalDate: string
  carouselCount: number
}) {
  const totalSlots = used + remaining
  const pct = totalSlots > 0 ? Math.min(100, (used / totalSlots) * 100) : 0

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">Current plan</p>
          <p className="mt-2 text-2xl font-bold capitalize text-zinc-950">{plan}</p>
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
        Resets{" "}
        {new Date(renewalDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </p>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
          <span>{used} used</span>
          <span>{remaining} remaining</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-teal transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
        <span>{postsThisMonth} post{postsThisMonth !== 1 ? "s" : ""} this month</span>
        <span>{carouselCount} carousel{carouselCount !== 1 ? "s" : ""}</span>
      </div>
      {isFree && (
        <Link
          href="/pricing"
          className="mt-4 block w-full rounded-xl bg-teal px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-teal-600"
        >
          Upgrade plan
        </Link>
      )}
    </div>
  )
}

function QuickActionsCard() {
  const actions = [
    { label: "Write Post", href: "/write", desc: "AI-powered drafts" },
    { label: "Create Carousel", href: "/carousel", desc: "Slide decks" },
    { label: "Train Voice", href: "/voice", desc: "Teach the AI your tone" },
    { label: "Post Library", href: "/library", desc: "All your posts" },
  ]
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">Quick actions</h2>
      <div className="space-y-2">
        {actions.map(({ label, href, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <div>
              <span className="text-sm font-semibold text-zinc-800">{label}</span>
              <span className="ml-2 text-xs text-zinc-400">{desc}</span>
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

function PostListRow({ post }: { post: PostRow }) {
  const hook = (post.title || post.content || "Untitled post").slice(0, 80)
  const truncated = (post.title || post.content || "").length > 80
  const score = post.score ?? 0
  const scoreColor =
    score >= 80
      ? "text-teal bg-teal/8 border-teal/20"
      : score >= 60
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-zinc-500 bg-zinc-100 border-zinc-200"

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-900">
          {hook}
          {truncated ? "…" : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {post.role && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
              {labelRole(post.role)}
            </span>
          )}
          <span className="text-xs text-zinc-400">{fmtDate(post.created_at)}</span>
        </div>
      </div>
      {score > 0 && (
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${scoreColor}`}>
          {score}
        </span>
      )}
    </div>
  )
}

function EmptyPostsState() {
  return (
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
        Write your first LinkedIn post and it will appear here.
      </p>
      <Link
        href="/write"
        className="mt-6 rounded-xl bg-zinc-950 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        Write first post
      </Link>
    </div>
  )
}

// ─── Skeleton fallbacks ───────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
            <div className="mt-3 h-9 w-16 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </section>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="h-40 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50" />
        <div className="h-40 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50" />
      </div>
    </>
  )
}

function RecentPostsSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div className="h-5 w-32 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
      </div>
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
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="h-5 w-40 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="flex h-40 items-end gap-1">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-zinc-100"
            style={{ height: `${20 + Math.random() * 80}px` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const userId = session.user.id
  const firstName = session.user.name?.split(" ")[0] || "Creator"

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-zinc-500">Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950">
              Welcome back, {firstName}
            </h1>
          </div>
          <Link
            href="/write"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Write new post
          </Link>
        </header>

        {/* Stats + plan card (with Suspense) */}
        <Suspense fallback={<StatsSkeleton />}>
          <StatsSection userId={userId} />
        </Suspense>

        {/* Recent posts (with Suspense) */}
        <Suspense fallback={<RecentPostsSkeleton />}>
          <RecentPostsSection userId={userId} />
        </Suspense>

        {/* Usage chart (with Suspense) */}
        <Suspense fallback={<ChartSkeleton />}>
          <UsageChartSection userId={userId} />
        </Suspense>
      </div>
    </main>
  )
}
