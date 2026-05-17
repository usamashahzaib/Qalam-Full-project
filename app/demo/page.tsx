"use client"

import Link from "next/link"
import { useCallback, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useAuthPanel } from "@/components/providers/AuthPanelContext"
import { useAuth } from "@/components/providers/AuthProvider"

const DEMO_HOOKS = [
  "I deleted 47 LinkedIn posts last year. Every one beat the content I wrote trying to sound viral.",
  "Most LinkedIn advice weakens your positioning long before it helps your reach.",
  "Three months ago I stopped optimizing for impressions. My engagement went up 38%.",
]

const DEMO_POST = `I deleted 47 LinkedIn posts last year. Every one beat the content I wrote trying to sound viral.

Here is what that taught me:

The founders and consultants winning on LinkedIn are not writing for the algorithm. They are writing for the few people who actually matter to their business.

Most professionals fall into the same trap: they chase reach, copy influencer formats, and end up sounding like everyone else in their market.

Posts that convert clients usually do three things:
- stay specific
- reference real situations
- sound like the person actually wrote them

Your LinkedIn presence is a reputation asset. The compounding happens slowly, then all at once.

What is the most genuine post you have published in the last 90 days?`

const DEMO_ARCHIVE = [
  {
    id: 1,
    title: "The hiring mistake I made twice",
    preview: "We moved too fast on a role we had not defined properly. The second time I saw it earlier.",
    impressions: "—",
    reactions: "—",
    comments: "—",
    date: "May 9",
    tag: "Leadership",
  },
  {
    id: 2,
    title: "Why your onboarding loses talent by day three",
    preview: "The resignation note I remember most came five days after start. The process failed before the person did.",
    impressions: "—",
    reactions: "—",
    comments: "—",
    date: "Apr 28",
    tag: "HR",
  },
  {
    id: 3,
    title: "I reviewed 200 LinkedIn profiles last month",
    preview: "Most people still use the summary section like a biography instead of a positioning asset.",
    impressions: "—",
    reactions: "—",
    comments: "—",
    date: "Apr 14",
    tag: "Career",
  },
]

const VOICE_TRAITS = [
  { label: "Tone", value: "Confident, direct" },
  { label: "Style", value: "Conversational" },
  { label: "Avoid", value: "Buzzwords, empty motivation" },
  { label: "Strength", value: "Specific experience, real data" },
]

const TABS = [
  { id: "writer", label: "Writer" },
  { id: "voice", label: "Voice" },
  { id: "archive", label: "Archive" },
] as const

type Tab = (typeof TABS)[number]["id"]

function DemoBanner() {
  const { openPanel } = useAuthPanel()
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated && user) {
    return (
      <div className="border-b border-teal/20 bg-teal/5 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            Signed in as <span className="font-semibold text-teal">{user.firstName || user.email}</span>. This is the demo workspace.
          </p>
          <Link href="/dashboard" className="rounded-lg bg-teal px-4 py-2 text-center text-xs font-semibold text-white hover:bg-teal-600">
            Go to my workspace
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-700">
          <span className="font-semibold text-zinc-900">You are in demo mode.</span> Nothing here is saved until you start your account.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => openPanel("sign-in")} className="text-sm font-semibold text-teal hover:underline">
            Log in
          </button>
          <button onClick={() => openPanel("sign-up")} className="rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-white hover:bg-teal-600">
            Start with LinkedIn
          </button>
        </div>
      </div>
    </div>
  )
}

function WriterTab({ onStart }: { onStart: () => void }) {
  const [topic, setTopic] = useState("Why I stopped trying to write viral LinkedIn posts")
  const [selectedHook, setSelectedHook] = useState(0)
  const [draft, setDraft] = useState(DEMO_POST)
  const [generating, setGenerating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const regenerate = useCallback(async () => {
    setGenerating(true)
    setDraft("")
    await new Promise((resolve) => setTimeout(resolve, 900))
    const next = `${DEMO_HOOKS[selectedHook]}\n\n${DEMO_POST.split("\n\n").slice(1).join("\n\n")}`
    setDraft(next)
    setGenerating(false)
    textareaRef.current?.focus()
  }, [selectedHook])

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 rounded-xl border border-teal/20 bg-teal/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal">Voice Profile</p>
          <p className="mt-2 text-sm leading-relaxed text-teal-800">
            Demo voice memory is active. In the real workspace, every approved draft and edit sharpens future starting points.
          </p>
        </div>
        <div className="space-y-3">
          {VOICE_TRAITS.map((item) => (
            <div key={item.label}>
              <p className="text-xs text-zinc-400">{item.label}</p>
              <p className="text-sm font-semibold text-zinc-800">{item.value}</p>
            </div>
          ))}
        </div>
        <button onClick={onStart} className="mt-5 w-full rounded-xl border border-teal/25 py-2.5 text-xs font-semibold text-teal hover:bg-teal/5">
          Train my real voice
        </button>
      </aside>

      <div className="space-y-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-400">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-teal/40 focus:ring-2 focus:ring-teal/15"
          />
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Choose a hook</p>
          <div className="space-y-2">
            {DEMO_HOOKS.map((hook, index) => (
              <button
                key={hook}
                onClick={() => setSelectedHook(index)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  selectedHook === index ? "border-teal/35 bg-teal/5 text-teal-900" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {hook}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Draft</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">{draft.length} / 3000</span>
              <button onClick={regenerate} disabled={generating} className="rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-white hover:bg-teal-600 disabled:opacity-60">
                {generating ? "Writing..." : "Regenerate"}
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            rows={15}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm leading-relaxed text-zinc-800 outline-none transition focus:border-teal/40 focus:ring-2 focus:ring-teal/15"
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-400">Edit freely. This is your draft.</p>
            <button onClick={onStart} className="text-xs font-semibold text-teal hover:underline">
              Save and schedule this post
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function VoiceTab({ onStart }: { onStart: () => void }) {
  const samples = [
    "The candidates who impress me most can explain what they learned from the thing that did not work.",
    "Every company with a culture problem usually optimized for speed during hiring and paid for it later.",
    "Retention is often a product problem disguised as an HR problem.",
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Voice Profile</h3>
            <p className="mt-1 text-sm text-zinc-500">Trained on 3 writing samples · Demo workspace</p>
          </div>
          <span className="rounded-full border border-teal/25 bg-teal/5 px-3 py-1 text-xs font-semibold text-teal">Active</span>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {VOICE_TRAITS.map((item) => (
            <div key={item.label} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-400">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-zinc-800">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {samples.map((sample, index) => (
            <div key={sample} className="rounded-xl border border-zinc-200 p-4">
              <p className="mb-2 text-xs font-medium text-zinc-400">Approved sample #{index + 1}</p>
              <p className="text-sm italic leading-relaxed text-zinc-700">“{sample}”</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h4 className="mb-3 text-sm font-bold text-zinc-900">What voice memory does</h4>
          <ul className="space-y-3 text-sm text-zinc-600">
            {[
              "Learns from approved posts and edits",
              "Keeps tone consistent across drafts",
              "Improves with each revision cycle",
              "Creates real switching cost over time",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-gold" />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-teal/20 bg-teal/5 p-5">
          <p className="mb-3 text-sm font-semibold text-teal-900">Your real voice profile builds over time.</p>
          <button onClick={onStart} className="w-full rounded-xl bg-teal py-2.5 text-sm font-semibold text-white hover:bg-teal-600">
            Start training my voice
          </button>
        </section>
      </aside>
    </div>
  )
}

function ArchiveTab({ onStart }: { onStart: () => void }) {
  const [query, setQuery] = useState("")
  const filtered = DEMO_ARCHIVE.filter(
    (item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.tag.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          placeholder="Search your archive..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-teal/40 focus:ring-2 focus:ring-teal/15"
        />
        <button onClick={onStart} className="rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600">
          Save posts
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        Sample posts with illustrative metrics — your real archive appears once you connect LinkedIn.
      </p>

      <div className="space-y-3">
        {filtered.map((post) => (
          <div key={post.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                    {post.tag}
                  </span>
                  <span className="text-xs text-zinc-400">{post.date}</span>
                </div>
                <h4 className="text-sm font-semibold text-zinc-900">{post.title}</h4>
                <p className="mt-1 text-xs text-zinc-500">{post.preview}</p>
              </div>
              <button onClick={onStart} className="rounded-lg bg-teal/10 px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal/20">
                Reuse
              </button>
            </div>
            <div className="flex items-center justify-between gap-5 border-t border-zinc-100 pt-3">
              <div className="flex items-center gap-5">
                <Metric label="Impressions" value={post.impressions} />
                <Metric label="Reactions" value={post.reactions} />
                <Metric label="Comments" value={post.comments} />
              </div>
              <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                Sample data
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-zinc-800">{value}</p>
    </div>
  )
}

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("writer")
  const { openPanel } = useAuthPanel()
  const handleStart = useCallback(() => openPanel("sign-up"), [openPanel])

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      <DemoBanner />

      <div className="border-b border-zinc-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[1100px]">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Demo Workspace
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">See how Qalam works</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Write a post, inspect the voice profile, and browse the archive. Everything is interactive, but nothing is saved until you start your account.
          </p>
        </div>
      </div>

      <div className="border-b border-zinc-200 bg-white px-4 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] gap-2 overflow-x-auto py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-teal text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-[1100px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === "writer" && <WriterTab onStart={handleStart} />}
              {activeTab === "voice" && <VoiceTab onStart={handleStart} />}
              {activeTab === "archive" && <ArchiveTab onStart={handleStart} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="mb-2 text-xl font-extrabold text-zinc-900">Ready to build your real publishing system?</h2>
          <p className="mb-6 text-sm text-zinc-500">
            Start free. Connect LinkedIn and your voice profile begins training immediately.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              className="rounded-xl bg-teal px-6 py-3 text-sm font-bold text-white shadow-[0_4px_24px_rgba(13,74,69,0.25)] hover:bg-teal-600"
            >
              Start with LinkedIn
            </motion.button>
            <Link href="/pricing" className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">
              See pricing
            </Link>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-4 bottom-4 z-30 md:hidden">
        <button
          onClick={handleStart}
          className="flex w-full items-center justify-center rounded-2xl bg-teal px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(13,74,69,0.25)]"
        >
          Start with LinkedIn
        </button>
      </div>
    </div>
  )
}
