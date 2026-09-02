import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/server/dashboard"
import { DailyMomentumCard } from "@/components/dashboard/DailyMomentumCard"

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
  const dayIndex =
    now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const prompts = Array.from(
    { length: 4 },
    (_, i) => ALL_PROMPTS[(dayIndex + i) % ALL_PROMPTS.length]
  )

  return (
    <section className="h-full rounded-3xl border border-zinc-200 bg-[linear-gradient(145deg,#ffffff,#fbfaf6)] p-6 shadow-card-raised">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-950">
            Ideas worth sharing today
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Pick one and turn your experience into a useful post.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <Link
            key={prompt}
            href={`/writer?topic=${encodeURIComponent(prompt)}`}
            className="group flex min-h-20 items-start gap-3 rounded-2xl border border-zinc-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-card"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </span>
            <span className="text-sm leading-snug text-zinc-700 group-hover:text-zinc-950">
              {prompt}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: "Check ATS score",
    href: "/career?tab=resume",
    desc: "Find parsing and relevance gaps",
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
    label: "Build targeted resume",
    href: "/career/resumes",
    desc: "Match a resume to one job",
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
    label: "Track applications",
    href: "/career/applications",
    desc: "Manage roles and outcomes",
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
    label: "Add career evidence",
    href: "/career/evidence",
    desc: "Save verified achievements",
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
    <div className="h-full rounded-3xl border border-teal/10 bg-teal-800 p-6 text-white shadow-card-raised">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-200">Keep moving</p>
      <h2 className="mt-2 text-xl font-bold">Choose your next useful step</h2>
      <p className="mt-2 text-sm leading-6 text-white/55">Each action improves something you can actually use.</p>
      <div className="space-y-2">
        {QUICK_ACTIONS.map(({ label, href, desc, icon }) => (
          <Link
            key={href}
            href={href}
            className="mt-3 flex min-h-14 items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 transition-all hover:border-gold/40 hover:bg-white/[0.1]"
          >
            <div className="flex items-center gap-3">
              <svg
                className="h-4 w-4 shrink-0 text-gold-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {icon}
              </svg>
              <div>
                <span className="block text-sm font-semibold text-white">{label}</span>
                <span className="mt-0.5 block text-xs text-white/45">{desc}</span>
              </div>
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-white/45"
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  let firstName = ""
  try {
    const ctx = await getSessionContext()
    firstName = ctx.firstName
  } catch {
    redirect("/login")
  }

  const greeting = firstName ? `Welcome back, ${firstName}` : "Welcome back"

  return (
    <>
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Your Qalam</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950">
            {greeting}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">One useful move at a time. Your work becomes easier to reuse every day.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        <Link href="/career/resumes" className="inline-flex min-h-11 items-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:border-teal hover:text-teal">Build resume</Link>
        <Link
          href="/writer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "var(--ws-brand, #0d4a45)" }}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create LinkedIn post
        </Link>
        </div>
      </header>

      <DailyMomentumCard />

      {/* Static sections - render immediately, no data dependency */}
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <WritingPromptsCard />
        <QuickActionsCard />
      </div>
    </>
  )
}
