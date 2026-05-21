"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/providers/AuthProvider"
import { useWorkspace, type WorkspaceBilling } from "@/components/providers/WorkspaceProvider"
import { PLAN_PRICES, formatPkr } from "@/lib/pricing"
import { getPlanSummary } from "@/lib/entitlements"
import { UPGRADES_EMAIL, whatsappUpgradeUrl, upgradesMailUrl } from "@/lib/contact"

const PLAN_OPTIONS: WorkspaceBilling["plan"][] = ["Free", "Solo", "Pro", "Agency Starter", "Agency Growth"]
const isValidLinkedInUrl = (value: string) => {
  if (!value.trim()) return true
  try {
    const url = new URL(value.trim())
    const host = url.hostname.replace(/^www\./, "")
    return host === "linkedin.com" && /^\/(in|company)\/[A-Za-z0-9-_%]+\/?$/.test(url.pathname)
  } catch {
    return false
  }
}

const PLAN_DESC: Record<WorkspaceBilling["plan"], string> = {
  Free: "Starter workspace, 5 drafts/month",
  Solo: "50 drafts, publish, scheduling",
  Pro: "Unlimited drafts, carousels, research",
  "Agency Starter": "3 client workspaces, 5 seats",
  "Agency Growth": "Unlimited workspaces and seats",
}

export default function SettingsPage() {
  const { user, beginLinkedInAuth, disconnectLinkedIn } = useAuth()
  const { profile, billing, saveProfile, saveBilling, posts, drafts, scheduled, isLoadingProfile, postsError } = useWorkspace()
  const [profileDraft, setProfileDraft] = useState({
    name: profile.name || user?.fullName || "",
    title: profile.title,
    linkedinUrl: profile.linkedinUrl,
    industry: profile.industry,
    tone: profile.tone,
    goals: profile.goals.join(", "),
  })
  const [billingDraft, setBillingDraft] = useState<WorkspaceBilling>(billing)
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [profileError, setProfileError] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (profileStatus === "saving") return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileDraft({
      name: profile.name || user?.fullName || "",
      title: profile.title,
      linkedinUrl: profile.linkedinUrl,
      industry: profile.industry,
      tone: profile.tone,
      goals: profile.goals.join(", "),
    })
  }, [profile, profileStatus, user?.fullName])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBillingDraft(billing)
  }, [billing])

  const onSaveProfile = async () => {
    setProfileStatus("saving")
    setProfileError(null)
    try {
      if (!isValidLinkedInUrl(profileDraft.linkedinUrl)) throw new Error("Enter a valid LinkedIn profile or company URL.")
      await saveProfile({
        name: profileDraft.name.trim(),
        title: profileDraft.title.trim(),
        linkedinUrl: profileDraft.linkedinUrl.trim(),
        industry: profileDraft.industry.trim(),
        tone: profileDraft.tone.trim(),
        goals: profileDraft.goals.split(",").map((item) => item.trim()).filter(Boolean),
      })
      setProfileStatus("saved")
      setTimeout(() => setProfileStatus("idle"), 2500)
    } catch (e) {
      setProfileStatus("error")
      setProfileError((e as Error).message || "Save failed")
    }
  }

  const onSaveBilling = () => saveBilling(billingDraft)

  const onDisconnectLinkedIn = async () => {
    if (!confirm("Disconnect LinkedIn? This removes the saved publishing token and you will need to reconnect.")) return
    setDisconnecting(true)
    try {
      await disconnectLinkedIn()
    } finally {
      setDisconnecting(false)
    }
  }

  const selectedPlanPrices = PLAN_PRICES[billingDraft.plan] ?? { monthly: 0, annual: 0 }
  const upgradePrice = billingDraft.billingCycle === "annual"
    ? selectedPlanPrices.annual
    : selectedPlanPrices.monthly
  const isUpgrade = billingDraft.plan !== billing.plan
  const isPaidUpgrade = isUpgrade && billingDraft.plan !== "Free"
  const planSummary = getPlanSummary(billing.plan)

  const whatsappHref = whatsappUpgradeUrl(billingDraft.plan, user?.email || "", upgradePrice)
  const mailHref = upgradesMailUrl(billingDraft.plan, user?.email || "")

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      {/* Page header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-100 bg-white px-6 py-5 shadow-sm">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(201,135,31,0.1) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <h1 className="text-3xl font-bold text-zinc-900">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">Profile, integrations, plan, and workspace status.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Voice Profile */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Voice Profile</h2>
            {isLoadingProfile && <span className="animate-pulse text-xs text-zinc-400">Loading...</span>}
            {profileStatus === "saved" && <span className="text-xs font-semibold text-emerald-600">Saved</span>}
            {profileStatus === "error" && <span className="text-xs text-red-600">{profileError}</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input value={profileDraft.name} onChange={(e) => setProfileDraft((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
            <Field label="Title"><input value={profileDraft.title} onChange={(e) => setProfileDraft((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
            <Field label="LinkedIn URL"><input value={profileDraft.linkedinUrl} onChange={(e) => setProfileDraft((prev) => ({ ...prev, linkedinUrl: e.target.value }))} placeholder="https://www.linkedin.com/in/username" className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 focus:outline-none ${isValidLinkedInUrl(profileDraft.linkedinUrl) ? "border-zinc-200 focus:border-teal" : "border-red-300 focus:border-red-500"}`} />{!isValidLinkedInUrl(profileDraft.linkedinUrl) && <p className="mt-1 text-xs text-red-600">Use a real LinkedIn /in/ or /company/ URL.</p>}</Field>
            <Field label="Industry"><input value={profileDraft.industry} onChange={(e) => setProfileDraft((prev) => ({ ...prev, industry: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
            <Field label="Brand tone"><input value={profileDraft.tone} onChange={(e) => setProfileDraft((prev) => ({ ...prev, tone: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
            <Field label="Goals (comma-separated)"><input value={profileDraft.goals} onChange={(e) => setProfileDraft((prev) => ({ ...prev, goals: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
          </div>
          <button onClick={onSaveProfile} disabled={profileStatus === "saving"} className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60">{profileStatus === "saving" ? "Saving..." : "Save profile"}</button>
        </section>

        {/* Plan */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          {/* Current plan */}
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Your plan</h2>
              <p className="mt-1 text-sm text-zinc-500">Upgrade by selecting a plan and following the instructions below.</p>
            </div>
            <span className="shrink-0 rounded-full bg-teal/10 px-3 py-1 text-xs font-bold text-teal">{billing.plan}</span>
          </div>

          {/* Current plan summary */}
          <div className="mb-5 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Included in {billing.plan}</p>
            <ul className="space-y-1">
              {planSummary.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-zinc-700">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Plan selection */}
          <p className="mb-2 text-xs font-semibold text-zinc-500">Select a plan</p>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PLAN_OPTIONS.map((plan) => (
              <button
                key={plan}
                onClick={() => setBillingDraft((prev) => ({ ...prev, plan }))}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${billingDraft.plan === plan ? "border-teal bg-teal/5 shadow-sm" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
              >
                <p className={`text-sm font-semibold ${billingDraft.plan === plan ? "text-teal" : "text-zinc-900"}`}>{plan}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{PLAN_DESC[plan]}</p>
              </button>
            ))}
          </div>

          {/* Billing cycle */}
          <div className="mb-4 flex gap-2">
            {(["monthly", "annual"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingDraft((prev) => ({ ...prev, billingCycle: cycle }))}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${billingDraft.billingCycle === cycle ? "bg-teal text-white" : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"}`}
              >
                {cycle === "monthly" ? "Monthly" : "Annual (save ~20%)"}
              </button>
            ))}
          </div>

          {/* Price display for paid plans */}
          {billingDraft.plan !== "Free" && (
            <div className="mb-4 rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
              <p className="text-sm font-semibold text-teal">{billingDraft.plan}</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{formatPkr(upgradePrice)}<span className="ml-1 text-sm font-normal text-zinc-500">/month</span></p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {billingDraft.billingCycle === "annual" ? "Billed as annual subscription" : "Billed monthly"}
                {billingDraft.billingCycle === "monthly" && selectedPlanPrices.annual > 0 && (
                  <> - or <span className="font-semibold text-teal">{formatPkr(selectedPlanPrices.annual)}/mo</span> on annual</>
                )}
              </p>
            </div>
          )}

          {/* Upgrade instructions */}
          {isPaidUpgrade && (
            <div className="mb-4 overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
              <div className="border-b border-amber-200 bg-amber-100/60 px-4 py-3">
                <p className="text-sm font-bold text-amber-900">Upgrade to {billingDraft.plan}</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  {formatPkr(upgradePrice)}/month
                  {billingDraft.billingCycle === "annual" ? " - billed annually" : " - billed monthly"}
                </p>
              </div>
              <div className="p-4">
                <ol className="space-y-2 text-sm text-amber-800">
                  <li className="flex gap-2"><span className="font-bold">1.</span>Message us on WhatsApp or email - we confirm the amount and send payment details.</li>
                  <li className="flex gap-2"><span className="font-bold">2.</span>Pay via Easypaisa, JazzCash, or bank transfer.</li>
                  <li className="flex gap-2"><span className="font-bold">3.</span>Send your payment screenshot in the same thread.</li>
                  <li className="flex gap-2"><span className="font-bold">4.</span>Your workspace plan is updated within 24 hours.</li>
                </ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1daf54]"
                  >
                    WhatsApp us
                  </a>
                  <a
                    href={mailHref}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50"
                  >
                    Email {UPGRADES_EMAIL}
                  </a>
                </div>
                <p className="mt-3 text-xs text-amber-600">Automated checkout is being built. Manual onboarding is the current path - your plan access is confirmed by our team after payment.</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={onSaveBilling} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50">Save preference</button>
            <Link href="/pricing" className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600">Compare all plans</Link>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Integrations */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900">Integrations</h2>
          <div className="mt-4 rounded-xl border border-zinc-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">LinkedIn</h3>
                <p className="mt-1 text-sm text-zinc-500">{user?.linkedinMemberId ? "Connected and ready for publishing" : "Not connected"}</p>
                {user?.linkedinTokenExpiresAt && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Publishing token valid until {new Date(user.linkedinTokenExpiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              {user?.linkedinMemberId ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Connected</span>
                  <button onClick={onDisconnectLinkedIn} disabled={disconnecting} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50">{disconnecting ? "Disconnecting..." : "Disconnect"}</button>
                </div>
              ) : (
                <button onClick={() => beginLinkedInAuth("/settings")} className="rounded-lg bg-[#0A66C2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#085fa8]">Connect LinkedIn</button>
              )}
            </div>
            <p className="mt-3 text-xs text-zinc-500">Disconnect removes the publishing token from the server. Future publishes will fail until you reconnect.</p>
          </div>
        </section>

        {/* Workspace status */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900">Workspace status</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Posts" value={String(posts.length)} />
            <MiniStat label="Drafts" value={String(drafts.length)} />
            <MiniStat label="Scheduled" value={String(scheduled.length)} />
            <MiniStat label="Storage health" value={postsError || "Healthy"} />
          </div>
          <p className="mt-4 text-xs text-zinc-500">Posts, profile, and events are stored in Supabase. Billing upgrades are manual until automated checkout is live.</p>
        </section>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  )
}
