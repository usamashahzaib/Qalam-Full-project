"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { HookCard } from "@/components/HookCard"

const TONES = [
  { id: "witty", label: "Witty", icon: "😄", desc: "Playful & clever" },
  { id: "professional", label: "Professional", icon: "💼", desc: "Authoritative & polished" },
  { id: "bold", label: "Bold", icon: "🔥", desc: "Provocative & direct" },
  { id: "storytelling", label: "Storytelling", icon: "📖", desc: "Narrative & personal" },
  { id: "direct", label: "Direct", icon: "⚡", desc: "Short & impactful" },
]

const SAMPLE_HOOKS = [
  "I tried 47 different LinkedIn strategies last year. Here's the only one that actually worked:",
  "Nobody tells you this when you start posting on LinkedIn. (I wish someone had told me sooner.)",
  "Hot take: The best LinkedIn posts are written in 10 minutes, not 2 hours. Here's why:",
  "I was embarrassed to post on LinkedIn. Then I realized everyone else was too — and that changed everything.",
  "Stop optimizing for followers. Start optimizing for this one metric instead:",
]

const SAMPLE_POST = `I was embarrassed to post on LinkedIn. Then I realized everyone else was too — and that changed everything.

For 2 years, I had a half-drafted post sitting in my notes. Every time I opened it, I'd think:

"Who am I to share this?"
"What if people judge me?"
"My ideas aren't that original."

Then I read a stat that stopped me cold: 99% of LinkedIn users only consume content. They never post.

That means you're not competing with millions of creators. You're competing with 1% of users.

Your imperfect ideas, shared consistently, will always beat the perfect post that never gets written.

I pressed publish that day.

That post got 14,000 impressions and 200+ connections.

The lesson: Done is infinitely better than perfect.

Start before you're ready.

♻️ Repost if this helped someone in your network.`

const SIDEBAR_ITEMS = [
  { label: "Write Post", icon: "✍️", href: "/write", active: true },
  { label: "My Posts", icon: "📄", href: "/dashboard", active: false },
  { label: "Ideas", icon: "💡", href: "/dashboard/ideas", active: false },
  { label: "Scheduled", icon: "📅", href: "/dashboard/scheduled", active: false },
  { label: "Analytics", icon: "📊", href: "/dashboard/analytics", active: false },
  { label: "Settings", icon: "⚙️", href: "/dashboard/settings", active: false },
]

export default function WritePage() {
  const [topic, setTopic] = useState("")
  const [selectedTone, setSelectedTone] = useState("bold")
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [selectedHook, setSelectedHook] = useState(0)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = () => {
    if (!topic.trim()) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setGenerated(true)
    }, 1800)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(SAMPLE_POST)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex bg-zinc-50 font-jakarta">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-white border-r border-zinc-100 hidden md:flex flex-col">
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
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-zinc-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal flex items-center justify-center text-white text-sm font-bold">
            SC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">Sarah Chen</p>
            <p className="text-xs text-zinc-400 truncate">Free Plan · 15/20 posts</p>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">AI Post Writer</h1>
            <p className="text-xs text-zinc-400">Enter a topic, pick a tone, and let Qalam do the rest.</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
          {/* ── LEFT PANEL ─────────────────────────────────────── */}
          <div className="w-full lg:w-[380px] shrink-0 border-r border-zinc-100 bg-white overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Topic */}
              <div>
                <label className="block text-sm font-semibold text-zinc-800 mb-2">
                  What do you want to post about?
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. How I grew from 0 to 10K LinkedIn followers in 6 months..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/50 resize-none transition-all"
                />
              </div>

              {/* Tone selector */}
              <div>
                <label className="block text-sm font-semibold text-zinc-800 mb-3">
                  Select Tone
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {TONES.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => setSelectedTone(tone.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        selectedTone === tone.id
                          ? "border-teal bg-teal-50"
                          : "border-zinc-100 hover:border-zinc-200 bg-white"
                      }`}
                    >
                      <span className="text-xl">{tone.icon}</span>
                      <div>
                        <p className={`text-sm font-semibold ${selectedTone === tone.id ? "text-teal" : "text-zinc-800"}`}>
                          {tone.label}
                        </p>
                        <p className="text-xs text-zinc-400">{tone.desc}</p>
                      </div>
                      {selectedTone === tone.id && (
                        <span className="ml-auto text-teal text-sm">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-teal-50 border border-teal/20">
                <div>
                  <p className="text-sm font-semibold text-teal">Use My Voice</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Write in your trained voice fingerprint</p>
                </div>
                <button
                  onClick={() => setVoiceEnabled((v) => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    voiceEnabled ? "bg-teal" : "bg-zinc-300"
                  }`}
                >
                  <motion.div
                    animate={{ x: voiceEnabled ? 24 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                  />
                </button>
              </div>

              {/* Generate button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerate}
                disabled={!topic.trim() || loading}
                className={`w-full py-4 rounded-xl font-bold text-white text-base transition-all ${
                  !topic.trim()
                    ? "bg-zinc-300 cursor-not-allowed"
                    : "bg-teal hover:bg-teal-600 shadow-[0_4px_20px_rgba(13,74,69,0.35)] pulse-gold"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Generating...
                  </span>
                ) : (
                  "✨ Generate Post"
                )}
              </motion.button>
            </div>
          </div>

          {/* ── RIGHT PANEL ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-zinc-50">
            <AnimatePresence mode="wait">
              {!generated ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12"
                >
                  <div className="w-20 h-20 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-center text-4xl mb-5">
                    ✍️
                  </div>
                  <h3 className="text-xl font-bold text-zinc-700 mb-2">Your post will appear here</h3>
                  <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
                    Enter a topic on the left, choose your tone, and hit Generate to see the magic.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="p-6 space-y-6"
                >
                  {/* Hook options */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-zinc-800">
                        Choose your opening hook
                      </h3>
                      <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded-md">
                        5 options
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {SAMPLE_HOOKS.map((hook, i) => (
                        <HookCard
                          key={i}
                          index={i}
                          text={hook}
                          selected={selectedHook === i}
                          onSelect={() => setSelectedHook(i)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Full post preview */}
                  <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                    {/* LinkedIn post header */}
                    <div className="p-5 border-b border-zinc-100 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal flex items-center justify-center text-white text-sm font-bold shrink-0">
                        SC
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-zinc-900">Sarah Chen</p>
                        <p className="text-xs text-zinc-400">Head of Marketing · 1st · Just now · 🌐</p>
                      </div>
                      <div className="text-xs text-zinc-400">···</div>
                    </div>

                    {/* Post content */}
                    <div className="p-5">
                      <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-line">
                        {SAMPLE_HOOKS[selectedHook]}
                        {"\n\n"}
                        {SAMPLE_POST.split("\n").slice(2).join("\n")}
                      </p>
                    </div>

                    {/* Post footer */}
                    <div className="px-5 py-3 border-t border-zinc-100 flex items-center gap-6 text-zinc-500 text-xs">
                      <span>👍 Like</span>
                      <span>💬 Comment</span>
                      <span>↗ Repost</span>
                      <span>✉️ Send</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopy}
                      className="flex-1 py-3 rounded-xl bg-teal text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-teal-600 transition-colors"
                    >
                      {copied ? "✓ Copied!" : "📋 Copy Post"}
                    </motion.button>
                    <button className="flex-1 py-3 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-sm hover:bg-zinc-50 transition-colors">
                      💾 Save Draft
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 rounded-xl bg-[#0A66C2] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#085fa8] transition-colors"
                    >
                      <span className="font-bold">in</span> Share on LinkedIn
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
