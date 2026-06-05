"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, useInView, AnimatePresence } from "framer-motion"

/* ─── Count-up hook ────────────────────────────────────────────── */
function useCountUp(end: number, duration = 1600) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let startTime: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, end, duration])

  return { count, ref }
}

/* ─── Static data ─────────────────────────────────────────────── */
const RECENT_POSTS = [
  {
    id: 1,
    preview: "I spent 3 years trying every LinkedIn strategy out there. None of them worked until I discovered this counterintuitive truth...",
    tone: "Storytelling",
    status: "published",
    impressions: "12,480",
    date: "2 hours ago",
  },
  {
    id: 2,
    preview: "Hot take: Most LinkedIn advice is written by people who don't actually use LinkedIn. Here's what actually drives growth in 2025...",
    tone: "Bold",
    status: "scheduled",
    impressions: "—",
    date: "Tomorrow 9:00 AM",
  },
  {
    id: 3,
    preview: "5 things I learned from growing from 0 to 10K LinkedIn followers in 6 months (thread):",
    tone: "Professional",
    status: "draft",
    impressions: "—",
    date: "Draft",
  },
  {
    id: 4,
    preview: "Nobody tells you this about building a personal brand on LinkedIn: the algorithm doesn't reward frequency. It rewards...",
    tone: "Witty",
    status: "published",
    impressions: "8,940",
    date: "Yesterday",
  },
]

const SIDEBAR_ITEMS = [
  { label: "Write Post", icon: "✍️", href: "/write", active: false },
  { label: "My Posts", icon: "📄", href: "/dashboard", active: true },
  { label: "Ideas", icon: "💡", href: "/dashboard/ideas", active: false },
  { label: "Scheduled", icon: "📅", href: "/dashboard/scheduled", active: false },
  { label: "Analytics", icon: "📊", href: "/dashboard/analytics", active: false },
  { label: "Settings", icon: "⚙️", href: "/dashboard/settings", active: false },
]

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-50 text-green-700 border-green-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
}

/* ─── Stat card ───────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  suffix = "",
  change,
  icon,
  index,
}: {
  label: string
  value: number
  suffix?: string
  change: string
  icon: string
  index: number
}) {
  const { count, ref } = useCountUp(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 }}
      className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-4xl font-bold text-zinc-900 mb-1">
        <span ref={ref}>{count.toLocaleString()}</span>
        {suffix}
      </p>
      <p className="text-sm font-medium text-green-600">{change}</p>
    </motion.div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function DashboardPage() {
  return (
    <div className="min-h-screen flex bg-zinc-50 font-jakarta">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-white border-r border-zinc-100 flex flex-col hidden md:flex">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-zinc-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 13 C3 13 5 11 8 7 C11 3 13 2 13 2" stroke="#C9871F" strokeWidth="2" strokeLinecap="round" />
                <circle cx="13" cy="2" r="1.5" fill="#C9871F" />
                <path d="M3 13 L2 14.5" stroke="#C9871F" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-lg font-bold text-teal">Qalam</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? "bg-teal text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Upgrade card */}
        <div className="p-4 border-t border-zinc-100">
          <div className="bg-teal-50 rounded-xl p-4 border border-teal/20">
            <p className="text-xs font-semibold text-teal mb-1">Free Plan</p>
            <div className="w-full h-1.5 bg-teal-100 rounded-full mb-2">
              <div className="w-3/5 h-full bg-teal rounded-full" />
            </div>
            <p className="text-xs text-zinc-500 mb-3">15/20 posts used this week</p>
            <Link
              href="/pricing"
              className="block w-full py-2 bg-teal text-white text-xs font-semibold rounded-lg text-center hover:bg-teal-600 transition-colors"
            >
              Upgrade to Pro →
            </Link>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-t border-zinc-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal flex items-center justify-center text-white text-sm font-bold">
            SC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">Sarah Chen</p>
            <p className="text-xs text-zinc-400 truncate">sarah@stripe.com</p>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Good morning, Sarah 👋</h1>
            <p className="text-sm text-zinc-500">Your LinkedIn audience is waiting.</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/write"
                className="flex items-center gap-2 px-4 py-2.5 bg-teal text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-teal-600 transition-colors"
              >
                <span>✍️</span> Write Post
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="p-6 max-w-[1000px]">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Posts Generated" value={247} change="↑ 18 this week" icon="✍️" index={0} />
            <StatCard label="Scheduled" value={12} change="Next: Tomorrow 9am" icon="📅" index={1} />
            <StatCard label="Drafts" value={5} change="3 need review" icon="📄" index={2} />
            <StatCard label="Day Streak" value={14} suffix="🔥" change="Personal best!" icon="🏆" index={3} />
          </div>

          {/* Recent Posts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4 }}
            className="bg-white rounded-2xl border border-zinc-100 shadow-sm mb-6"
          >
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="font-bold text-zinc-900">Recent Posts</h2>
              <Link href="/dashboard/posts" className="text-sm text-teal font-medium hover:underline">
                View all →
              </Link>
            </div>

            <div className="divide-y divide-zinc-50">
              {RECENT_POSTS.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.06 }}
                  className="px-6 py-4 flex items-start gap-4 hover:bg-zinc-50/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-700 line-clamp-2 mb-2 leading-relaxed">
                      {post.preview}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${STATUS_STYLES[post.status]}`}>
                        {post.status}
                      </span>
                      <span className="text-xs text-zinc-400 border border-zinc-200 px-2 py-0.5 rounded-md">
                        {post.tone}
                      </span>
                      {post.impressions !== "—" && (
                        <span className="text-xs text-zinc-500">
                          👁 {post.impressions} impressions
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">{post.date}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition-colors">
                      Edit
                    </button>
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal text-teal hover:text-white font-medium transition-colors">
                      Publish
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.6 }}
            className="bg-white rounded-2xl border border-zinc-100 shadow-sm"
          >
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="font-bold text-zinc-900">Quick Actions</h2>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: "✍️", label: "Write a Post", href: "/write", color: "bg-teal-50 text-teal border-teal/20" },
                { icon: "🎣", label: "Generate Hook", href: "/write?mode=hook", color: "bg-gold-50 text-gold-600 border-gold/20" },
                { icon: "💡", label: "Browse Ideas", href: "/dashboard/ideas", color: "bg-purple-50 text-purple-700 border-purple-200" },
                { icon: "📊", label: "View Analytics", href: "/dashboard/analytics", color: "bg-blue-50 text-blue-700 border-blue-200" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${action.color} hover:scale-105 active:scale-95 transition-transform text-center`}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span className="text-xs font-semibold">{action.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
