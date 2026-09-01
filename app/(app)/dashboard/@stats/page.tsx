import Link from "next/link"
import {
  getSessionContext,
  fetchDashboardStats,
  fetchDashboardUsage,
  type DashboardStats,
  type UsageDay,
} from "@/lib/server/dashboard"
import { ensureWorkspaceForUser } from "@/lib/server/workspace"
import { RefreshButton } from "../_components/refresh-button"
import { UpgradeSpotlight } from "@/components/UpgradeSpotlight"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const fmtResetDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// ─── Stat Cards ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: "teal" | "amber" | "zinc"
}) {
  const valueColor =
    accent === "teal"
      ? "text-teal"
      : accent === "amber"
        ? "text-amber-600"
        : "text-zinc-950"

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  )
}

function LockedStatCard({
  label,
  upgradeText,
}: {
  label: string
  upgradeText: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 select-none text-3xl font-bold text-zinc-200">--</p>
      <div className="absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-[1px]">
        <Link
          href={"/upgrade"}
          className="rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-600"
        >
          {upgradeText}
        </Link>
      </div>
    </div>
  )
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ stats }: { stats: DashboardStats }) {
  const {
    plan,
    draftsUsed,
    draftsTotal,
    draftsRemaining,
    postsPublished,
    carouselsUsed,
    resetDate,
    planExpiresAt,
    workspaceDraftsUsed,
    workspaceDraftsLimit,
  } = stats
  const planNorm = plan.toLowerCase()
  const planLabel = capitalize(plan)
  const isFree = planNorm === "free"
  const isAgency = planNorm === "agency"

  const pct =
    draftsTotal && draftsTotal > 0
      ? Math.min(100, (draftsUsed / draftsTotal) * 100)
      : 0

  const wsPct =
    workspaceDraftsLimit && workspaceDraftsLimit > 0
      ? Math.min(100, ((workspaceDraftsUsed ?? 0) / workspaceDraftsLimit) * 100)
      : 0
  const wsNearLimit = isAgency && wsPct >= 80

  const expiryLabel = isFree
    ? `Resets ${fmtResetDate(resetDate)}`
    : planExpiresAt
      ? `Expires ${fmtResetDate(planExpiresAt)}`
      : `Renews ${fmtResetDate(resetDate)}`

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Current plan
          </p>
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

      <p className="mt-1 text-sm text-zinc-500">{expiryLabel}</p>

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
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: "var(--ws-brand, #0d4a45)" }}
            />
          </div>
        </div>
      )}

      {isAgency && workspaceDraftsLimit != null && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
            <span>This workspace: {workspaceDraftsUsed ?? 0} of {workspaceDraftsLimit} drafts</span>
            <span>{Math.round(wsPct)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${wsNearLimit ? "bg-amber-500" : ""}`}
              style={{ width: `${wsPct}%`, backgroundColor: wsNearLimit ? undefined : "var(--ws-brand, #0d4a45)" }}
            />
          </div>
          {wsNearLimit && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              {wsPct >= 100
                ? "This client workspace has used all its drafts this month."
                : `This client workspace has used ${Math.round(wsPct)}% of its monthly draft limit.`}
            </p>
          )}
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
        <Link
          href={"/upgrade"}
          className="mt-4 block w-full rounded-xl bg-teal px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-teal-600"
        >
          Upgrade to Solo
        </Link>
      )}
      {planNorm === "solo" && (
        <Link
          href={"/upgrade"}
          className="mt-4 block w-full rounded-xl bg-teal px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-teal-600"
        >
          Upgrade to Pro
        </Link>
      )}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Usage Chart ──────────────────────────────────────────────────────────────

function UsageChart({ usage }: { usage: UsageDay[] }) {
  const maxVal = Math.max(1, ...usage.map((u) => u.draftsUsed))
  const hasActivity = usage.some((u) => u.draftsUsed > 0)
  const total = usage.reduce((s, u) => s + u.draftsUsed, 0)

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-zinc-950">Usage this month</h2>
        <span className="text-sm text-zinc-500">
          {total} draft{total !== 1 ? "s" : ""}
        </span>
      </div>
      {!hasActivity ? (
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
                <span className="t-eyebrow text-zinc-400 tabular-nums">{day}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Stats Slot Page ──────────────────────────────────────────────────────────

export default async function StatsPage() {
  let stats: DashboardStats | null = null
  let usage: UsageDay[] | null = null
  let statsError = false
  let usageError = false

  try {
    const ctx = await getSessionContext()
    const workspaceId = await ensureWorkspaceForUser({ userId: ctx.supabaseUserId, email: ctx.email })
    const [statsResult, usageResult] = await Promise.allSettled([
      fetchDashboardStats(ctx.supabaseUserId, workspaceId),
      fetchDashboardUsage(ctx.userId),
    ])
    if (statsResult.status === "fulfilled") {
      stats = statsResult.value
    } else {
      statsError = true
    }
    if (usageResult.status === "fulfilled") {
      usage = usageResult.value
    } else {
      usageError = true
    }
  } catch {
    statsError = true
    usageError = true
  }

  const planNorm = stats?.plan.toLowerCase() ?? ""

  return (
    <>
      {/* Upgrade spotlight - opens the Lemon Squeezy overlay in place */}
      {stats ? <UpgradeSpotlight currentPlan={capitalize(planNorm)} /> : null}

      {/* Stats row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsError ? (
          <>
            {["Posts this month", "Drafts remaining", "Library posts", "Avg score"].map(
              (label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold text-zinc-400">-</p>
                </div>
              )
            )}
          </>
        ) : stats ? (
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
            {planNorm === "free" ? (
              <LockedStatCard label="Avg score" upgradeText="Upgrade to Solo" />
            ) : (
              <StatCard
                label="Avg score"
                value={stats.avgScore != null ? stats.avgScore : "-"}
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
        ) : null}
      </section>

      {/* Plan + Quick actions */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {statsError ? (
          <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
            <RefreshButton label="Retry" />
          </div>
        ) : stats ? (
          <PlanCard stats={stats} />
        ) : null}
        <QuickActionsCard />
      </div>

      {/* Usage chart */}
      {planNorm === "free" ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-zinc-950">Usage analytics</h2>
          <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 text-center">
            <p className="text-sm font-semibold text-zinc-700">
              Track your daily writing activity
            </p>
            <Link
              href={"/upgrade"}
              className="rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-600"
            >
              Upgrade to Solo
            </Link>
          </div>
        </section>
      ) : usageError ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-zinc-950">Usage this month</h2>
          <div className="flex h-40 flex-col items-center justify-center gap-3">
            <p className="text-sm text-zinc-500">Could not load usage data.</p>
            <RefreshButton label="Retry" />
          </div>
        </section>
      ) : usage ? (
        <>
          <UsageChart usage={usage} />
          {planNorm === "solo" && (
            <p className="-mt-4 text-center text-xs text-zinc-400">
              Upgrade to Pro for post performance analytics and competitor research.{" "}
              <Link href={"/upgrade"} className="font-semibold text-teal underline">
                Learn more
              </Link>
            </p>
          )}
        </>
      ) : null}
    </>
  )
}
