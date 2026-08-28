"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { CommentIcon } from "@/components/ui/qalam-icons"
import { APP_URL } from "@/lib/seo"
import { PLAN_LIMITS } from "@/lib/entitlements"

const PROFILES = ["Founder", "Engineer", "HR", "Marketing", "Sales", "Consultant", "Tech", "Other"] as const

const STYLES = [
  { value: "insightful", label: "Insightful", hint: "Add a sharp, specific take" },
  { value: "supportive", label: "Supportive", hint: "Warm, genuine encouragement" },
  { value: "engaging", label: "Engaging", hint: "React and ask a follow-up" },
] as const

type StyleValue = (typeof STYLES)[number]["value"]

const MAX_POST_LENGTH = 5000

type Comment = { style: string; text: string }
type Usage = { current: number; limit: number | "unlimited" }

function CommentGeneratorInner() {
  const [postText, setPostText] = useState("")
  const [profile, setProfile] = useState<(typeof PROFILES)[number]>("Founder")
  const [style, setStyle] = useState<StyleValue>("insightful")
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)

  const loadUsage = () => {
    fetch("/api/comments/generate")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (typeof data.current === "number") setUsage(data)
      })
      .catch(() => { /* usage counter is a nice-to-have - silently skip on failure */ })
  }

  useEffect(() => {
    loadUsage()
  }, [])

  const handleGenerate = async () => {
    const trimmed = postText.trim()
    if (trimmed.length < 10) {
      setError("Paste at least 10 characters of the post you want to comment on.")
      return
    }
    setLoading(true)
    setError(null)
    setUpgradeRequired(false)
    setComments([])

    try {
      const res = await fetch("/api/comments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: trimmed, profile, style }),
      })

      if (res.status === 401) {
        window.location.href = `${APP_URL}/login?callbackUrl=${encodeURIComponent("/free-tools/comment-generator")}`
        return
      }

      const data = await res.json()

      if (res.status === 403 && (data.error === "monthly_limit_reached" || data.error === "upgrade_required" || data.error === "plan_expired")) {
        setUpgradeRequired(true)
        setError(data.message || "You've reached your monthly comment generation limit.")
        return
      }

      if (!res.ok) {
        setError(data.message || data.error || "Failed to generate comments. Please try again.")
        return
      }

      if (!data.comments || data.comments.length === 0) {
        setError("No comments returned. Please try again.")
        return
      }

      setComments(data.comments)
      if (data.usage && typeof data.usage.current === "number") setUsage(data.usage)
      else void loadUsage()
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="relative overflow-hidden border-b border-zinc-100 bg-white px-6 py-16">
        <div
          className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.2) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-[760px]">
          <FadeUp>
            <Link href="/free-tools" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-teal">
              {"<- All Free Tools"}
            </Link>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal">
                <CommentIcon className="h-6 w-6" />
              </div>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight text-zinc-900 sm:text-5xl">
              LinkedIn Comment Generator
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-zinc-500">
              Paste a post, pick the style you want, and get comment options written in your own voice, ready to post.
            </p>
            {usage && (
              <p className="mt-3 text-sm font-medium text-zinc-500">
                {usage.limit === "unlimited"
                  ? "Unlimited comment generations on your plan"
                  : `${Math.max(0, usage.limit - usage.current)} of ${usage.limit} comment generations left this month`}
              </p>
            )}
            {!usage && <p className="mt-3 text-sm font-medium text-zinc-500">Free includes {PLAN_LIMITS.Free.commentGenerationsPerMonth} comment generations per month. Sign in to see your live balance.</p>}
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-[760px]">
          <FadeUp>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-6">
                <label htmlFor="public-comment-post" className="mb-2 block text-sm font-semibold text-zinc-800">Post you want to comment on</label>
                <textarea
                  id="public-comment-post"
                  value={postText}
                  onChange={(e) => setPostText(e.target.value.slice(0, MAX_POST_LENGTH))}
                  placeholder="Paste the LinkedIn post text here..."
                  rows={6}
                  className="w-full resize-y rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                  disabled={loading}
                />
                <div className="mt-1 flex justify-end">
                  <span className="text-xs text-zinc-400">{postText.length}/{MAX_POST_LENGTH}</span>
                </div>

                <fieldset className="mt-4" disabled={loading}>
                  <legend className="mb-2 text-sm font-semibold text-zinc-800">Comment style</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {STYLES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStyle(s.value)}
                      disabled={loading}
                      aria-pressed={style === s.value}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all disabled:opacity-60 ${
                        style === s.value
                          ? "border-teal bg-teal-50 ring-1 ring-teal/40"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <span className={`block text-sm font-semibold ${style === s.value ? "text-teal" : "text-zinc-800"}`}>{s.label}</span>
                      <span className="mt-0.5 block t-eyebrow leading-tight text-zinc-500">{s.hint}</span>
                    </button>
                  ))}
                  </div>
                </fieldset>

                <label htmlFor="public-comment-profile" className="mb-2 mt-4 block text-sm font-semibold text-zinc-800">Your profile</label>
                <select
                  id="public-comment-profile"
                  value={profile}
                  onChange={(e) => setProfile(e.target.value as (typeof PROFILES)[number])}
                  disabled={loading}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 transition-all focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  {PROFILES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={postText.trim().length < 10 || loading}
                  className={`mt-4 w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                    postText.trim().length >= 10 && !loading
                      ? "bg-teal text-white shadow-sm hover:bg-teal-600"
                      : "cursor-not-allowed bg-zinc-200 text-zinc-400"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </span>
                  ) : `Generate 3 ${STYLES.find((s) => s.value === style)?.label ?? ""} variations`}
                </motion.button>
              </div>

              {error && (
                <div className="border-b border-red-100 bg-red-50 px-6 py-4">
                  <p className="text-sm text-red-700">{error}</p>
                  {upgradeRequired && (
                    <Link href="/pricing" className="mt-2 inline-block text-sm font-semibold text-teal hover:underline">
                      {"Upgrade your plan ->"}
                    </Link>
                  )}
                </div>
              )}

              {comments.length > 0 && (
                <div className="divide-y divide-zinc-50">
                  {comments.map((c, i) => (
                    <div key={i} className="px-6 py-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal">
                          {(STYLES.find((s) => s.value === c.style)?.label ?? c.style)} · Option {i + 1}
                        </span>
                        <button
                          onClick={() => void handleCopy(c.text, i)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                            copied === i ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                          }`}
                        >
                          {copied === i ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-700">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}

export function CommentGeneratorTool() {
  return <CommentGeneratorInner />
}
