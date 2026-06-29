"use client"

import { useCallback, useEffect, useState } from "react"
import { useBilling } from "@/lib/hooks/useBilling"
import { canAccessPlan } from "@/lib/entitlements"
import { LockedFeature } from "@/components/LockedFeature"

const BRAND_TONES = ["Professional", "Casual", "Bold", "Empathetic", "Technical", "Inspirational"] as const
type BrandTone = (typeof BRAND_TONES)[number]

type Characteristics = {
  tone: string
  sentenceLength: string
  vocabulary: string
  commonPhrases: string[]
  transitions: string[]
  ctaStyle: string
}

type VoiceProfile = {
  name: string
  title: string
  industry: string
  linkedinUrl: string
  brandTone: BrandTone
  goals: string
}

type StatusMsg = { text: string; type: "info" | "error" | "success" }

export default function VoicePage() {
  const { billing } = useBilling()
  const canUseVoice = canAccessPlan(billing.plan, "Pro")

  const [profile, setProfile] = useState<VoiceProfile>({
    name: "", title: "", industry: "", linkedinUrl: "", brandTone: "Professional", goals: "",
  })
  const [examplePosts, setExamplePosts] = useState("")
  const [characteristics, setCharacteristics] = useState<Characteristics | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<StatusMsg | null>(null)
  const [profileExists, setProfileExists] = useState(false)

  const showStatus = useCallback((text: string, type: StatusMsg["type"]) => {
    setStatus({ text, type })
    if (type !== "error") setTimeout(() => setStatus(null), 4000)
  }, [])

  useEffect(() => {
    fetch("/api/voice/me")
      .then((r) => r.json())
      .then((data: { profile?: Record<string, unknown> | null }) => {
        if (data.profile) {
          setProfileExists(true)
          setProfile({
            name: String(data.profile.name || ""),
            title: String(data.profile.title || ""),
            industry: String(data.profile.industry || ""),
            linkedinUrl: String(data.profile.linkedin_url || ""),
            brandTone: (String(data.profile.brand_tone || "Professional")) as BrandTone,
            goals: String(data.profile.goals || ""),
          })
          if (data.profile.example_posts) setExamplePosts(String(data.profile.example_posts))
          if (data.profile.characteristics) setCharacteristics(data.profile.characteristics as Characteristics)
        }
      })
      .catch(() => null)
      .finally(() => setIsLoading(false))
  }, [canUseVoice])

  const onAnalyze = async () => {
    if (examplePosts.trim().length < 100) {
      showStatus("Paste at least 3-5 example posts before analyzing.", "error")
      return
    }
    setIsAnalyzing(true)
    setCharacteristics(null)
    try {
      const res = await fetch("/api/voice/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examplePosts }),
      })
      const data = await res.json() as { characteristics?: Characteristics; error?: string }
      if (!res.ok) throw new Error(data.error || "Analysis failed")
      if (!data.characteristics) throw new Error("No characteristics returned")
      setCharacteristics(data.characteristics)
      showStatus("Voice analyzed. Review and save your profile.", "success")
    } catch (e) {
      showStatus((e as Error).message, "error")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const onSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/voice/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          // Only include voice training data when it exists and user is Pro
          ...(canUseVoice && characteristics ? { examplePosts, characteristics } : {}),
        }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error || "Save failed")
      setProfileExists(true)
      showStatus("Voice profile saved.", "success")
    } catch (e) {
      showStatus((e as Error).message, "error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
      <div className="mx-auto max-w-[960px] px-4 py-8 lg:px-6">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">Voice &amp; Identity</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">Your Profile</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Set your identity so every post is written as you. Pro users can also train your writing voice.
            {profileExists && <span className="ml-2 text-emerald-600 font-semibold">Profile active</span>}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />)}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

            {/* Left: Forms */}
            <div className="space-y-5">

              {/* Identity form */}
              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                  <h2 className="text-sm font-bold text-zinc-900">Your identity</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">Used to personalise every draft to your context.</p>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Name</label>
                    <input
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Job Title</label>
                    <input
                      value={profile.title}
                      onChange={(e) => setProfile((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Founder & CEO"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Industry</label>
                    <input
                      value={profile.industry}
                      onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))}
                      placeholder="e.g. SaaS, Consulting, HR Tech"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">LinkedIn URL</label>
                    <input
                      value={profile.linkedinUrl}
                      onChange={(e) => setProfile((p) => ({ ...p, linkedinUrl: e.target.value }))}
                      placeholder="linkedin.com/in/yourprofile"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Brand Tone</label>
                    <div className="flex flex-wrap gap-2">
                      {BRAND_TONES.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => setProfile((p) => ({ ...p, brandTone: tone }))}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                            profile.brandTone === tone
                              ? "border-teal bg-teal/10 text-teal"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Goals <span className="font-normal normal-case text-zinc-400">(optional)</span>
                    </label>
                    <textarea
                      value={profile.goals}
                      onChange={(e) => setProfile((p) => ({ ...p, goals: e.target.value }))}
                      rows={2}
                      placeholder="e.g. Build authority as a founder, attract B2B clients, grow to 10k followers"
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                    />
                  </div>
                </div>
              </section>

              {/* Save identity button (all plans) */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => void onSave()}
                  disabled={isSaving}
                  className="cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </button>
                {status && (
                  <p className={`text-xs font-medium ${status.type === "error" ? "text-red-600" : status.type === "success" ? "text-emerald-600" : "text-zinc-500"}`}>
                    {status.text}
                  </p>
                )}
              </div>

              {/* Voice training section — Pro only */}
              <LockedFeature requiredPlan="Pro" feature="Voice Training">
                <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <div className="border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5">
                    <h2 className="text-sm font-bold text-zinc-900">Voice training <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">Pro</span></h2>
                    <p className="mt-0.5 text-xs text-zinc-500">Paste 3-5 of your best LinkedIn posts. Qalam extracts your tone, patterns, and phrases.</p>
                  </div>
                  <div className="p-5">
                    <textarea
                      value={examplePosts}
                      onChange={(e) => setExamplePosts(e.target.value)}
                      rows={8}
                      placeholder="Paste 3-5 example posts here. Separate with blank lines or --- dividers."
                      className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"
                    />
                    <p className="mt-1.5 text-xs text-zinc-400">{examplePosts.length} characters</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => void onAnalyze()}
                        disabled={isAnalyzing || examplePosts.trim().length < 100}
                        className="cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-600 disabled:opacity-50"
                      >
                        {isAnalyzing ? "Analyzing voice..." : characteristics ? "Retrain" : "Analyze Voice"}
                      </button>
                      {characteristics && (
                        <button
                          onClick={() => void onSave()}
                          disabled={isSaving}
                          className="cursor-pointer rounded-xl border border-teal/25 bg-teal/8 px-4 py-2.5 text-xs font-bold text-teal transition-colors hover:bg-teal/15 disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save Voice Profile"}
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              </LockedFeature>
            </div>

            {/* Right: Characteristics panel */}
            <aside className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Voice Characteristics</h2>
                    {isAnalyzing && <span className="animate-pulse text-[10px] font-semibold text-teal">Analyzing...</span>}
                  </div>
                </div>

                {characteristics ? (
                  <div className="divide-y divide-zinc-100">
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Tone</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{characteristics.tone}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Sentence Length</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-zinc-900">{characteristics.sentenceLength}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Vocabulary</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-zinc-900">{characteristics.vocabulary}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Common Phrases</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(characteristics.commonPhrases || []).map((phrase) => (
                          <span key={phrase} className="rounded-full border border-teal/20 bg-teal/5 px-2 py-0.5 text-xs text-teal">{phrase}</span>
                        ))}
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Transition Words</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(characteristics.transitions || []).map((t) => (
                          <span key={t} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">CTA Style</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-zinc-900">{characteristics.ctaStyle}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {["Tone", "Sentence Length", "Vocabulary", "Common Phrases", "Transitions", "CTA Style"].map((label) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">{label}</p>
                        <div className="mt-1 h-4 w-3/4 rounded bg-zinc-100" />
                      </div>
                    ))}
                    <p className="pt-1 text-xs text-zinc-400">Paste posts and click Analyze Voice to see results.</p>
                  </div>
                )}
              </div>

              {profileExists && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <p className="text-xs font-semibold text-emerald-700">Profile active</p>
                  </div>
                  <p className="mt-1 text-xs text-emerald-600">Your voice is used in the writer to score Voice Fit and guide drafts.</p>
                </div>
              )}

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Writer integration</p>
                <ul className="mt-2 space-y-2 text-xs text-zinc-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    Voice Fit score appears in the Content Score panel
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    Profile used automatically when generating posts
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    Retrain anytime to improve accuracy
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>
  )
}
