"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useBilling, type WorkspaceBilling } from "@/lib/hooks/useBilling"
import { useProfile } from "@/lib/hooks/useProfile"
import { usePosts } from "@/lib/hooks/usePosts"
import { PLAN_PRICES, formatPkr, annualFraming, getLemonSqueezyCheckoutUrl } from "@/lib/pricing"
import { getPlanSummary } from "@/lib/entitlements"
import { UPGRADES_EMAIL, upgradesMailUrl } from "@/lib/contact"
import { ACCOUNT_ROLES, INDUSTRY_OPTIONS } from "@/lib/constants"
import { isValidLinkedInUrl } from "@/lib/validation"
import { useProfileForm } from "@/lib/hooks/useProfileForm"
import { formatPlanDate } from "@/lib/plan-expiry"
import { LinkedInIcon } from "@/components/ui/qalam-icons"
import { ReferralCard } from "@/components/ReferralCard"

const PLAN_OPTIONS: WorkspaceBilling["plan"][] = ["Free", "Solo", "Pro", "Agency"]

const PLAN_DESC: Record<WorkspaceBilling["plan"], string> = {
  Free: "5 posts, 1 carousel/month",
  Solo: "30 posts, 4 carousels, library, planner",
  Pro: "60 posts, voice training, analytics, AI Strategist",
  Agency: "Coming soon - multi-workspace, team seats",
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const { data: session, update } = useSession()
  const user = session?.user
    ? {
        email: session.user.email || "",
        fullName: session.user.name || session.user.email || "",
        imageUrl: session.user.image || null,
        linkedinMemberId: null,
        linkedinTokenExpiresAt: null,
      }
    : null
  const { billing, saveBilling } = useBilling()
  const { profile, saveProfile, isLoadingProfile } = useProfile()
  const { posts, drafts, scheduled, postsError } = usePosts()
  const isLinkedInUser = (session?.user as { provider?: string } | undefined)?.provider === "linkedin"
  const {
    draft: profileDraft,
    setDraft: setProfileDraft,
    status: profileStatus,
    error: profileError,
    onSave: onSaveProfile,
  } = useProfileForm({ profile, userName: user?.fullName || "", saveProfile })
  const [billingDraft, setBillingDraft] = useState<WorkspaceBilling>(billing)
  const [disconnecting, setDisconnecting] = useState(false)
  const [linkedinProfile, setLinkedinProfile] = useState<{ name?: string; avatar?: string } | null>(null)
  const [linkedinStatus, setLinkedinStatus] = useState<string | null>(null)
  const [userData, setUserData] = useState<{ id: string; email: string; name: string; role: string; authProvider: string } | null>(null)
  const [accountDraft, setAccountDraft] = useState({ name: "", role: "", industry: "", goals: "" })
  const [accountStatus, setAccountStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [accountError, setAccountError] = useState<string | null>(null)
  const [planUsage, setPlanUsage] = useState<{ drafts: { used: number; limit: number }; carousels: { used: number; limit: number }; planExpiresAt?: string | null } | null>(null)
  const [passwordDraft, setPasswordDraft] = useState({ current: "", new: "", confirm: "" })
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "deleting">("idle")
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const linkedin = searchParams.get("linkedin")
    if (!linkedin) return
    const message = searchParams.get("message")
    setLinkedinStatus(linkedin === "success" || linkedin === "connected" ? "LinkedIn connected successfully." : `LinkedIn connection failed: ${message || "unknown_error"}`)
    if (linkedin === "success" || linkedin === "connected") {
      update().catch(() => undefined)
    }
    window.history.replaceState({}, "", "/settings")
  }, [searchParams, update])

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserData(data.user)
          setAccountDraft((prev) => ({ ...prev, name: data.user.name || "", role: data.user.role || "" }))
        }
      })
      .catch(() => {})
    fetch("/plan/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.drafts) setPlanUsage({ drafts: data.drafts, carousels: data.carousels, planExpiresAt: data.planExpiresAt })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/linkedin/profile")
      .then((res) => {
        if (res.status === 401) {
          // Token expired - surface the reconnect warning without overwriting an existing status.
          setLinkedinStatus((prev) => prev || "Your LinkedIn token has expired. Please reconnect to continue publishing.")
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (!data) return
        setLinkedinProfile(data.connected ? data : null)
      })
      .catch(() => setLinkedinProfile(null))
  }, [user?.email])

  useEffect(() => {
    if (accountStatus === "saving") return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountDraft((prev) => ({
      ...prev,
      industry: profile.industry,
      goals: profile.goals.join(", "),
    }))
  }, [profile, accountStatus])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBillingDraft(billing)
  }, [billing])

  const onSaveBilling = () => saveBilling(billingDraft)

  const onDisconnectLinkedIn = async () => {
    if (!confirm("Disconnect LinkedIn? This removes the saved publishing token and you will need to reconnect.")) return
    setDisconnecting(true)
    try {
      await fetch("/api/linkedin/token", { method: "DELETE" })
      setLinkedinProfile(null)
    } finally {
      setDisconnecting(false)
    }
  }

  const onConnectLinkedIn = async () => {
    setLinkedinStatus(null)
    // Carry the active client workspace through so the connected LinkedIn
    // account is stored against that client, not whichever workspace the
    // session happens to default to.
    const activeClientId = searchParams.get("client")
    const connectUrl = activeClientId ? `/api/linkedin/connect?workspaceKey=${encodeURIComponent(activeClientId)}` : "/api/linkedin/connect"
    try {
      const res = await fetch(connectUrl, { redirect: "manual" })
      if (res.type === "opaqueredirect" || res.status === 0) {
        window.location.href = connectUrl
        return
      }
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("Location")
        if (location) window.location.href = location
        else window.location.href = connectUrl
        return
      }
      const data = await res.json().catch(() => ({}))
      setLinkedinStatus(data.error || "Couldn't start the LinkedIn connection. Please try again or contact support.")
    } catch {
      window.location.href = connectUrl
    }
  }

  const onSaveAccount = async () => {
    setAccountStatus("saving")
    setAccountError(null)
    try {
      const res = await fetch("/api/auth/update-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: accountDraft.name.trim(), role: accountDraft.role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save account.")
      await saveProfile({
        name: profileDraft.name,
        title: profileDraft.title,
        linkedinUrl: profileDraft.linkedinUrl,
        industry: accountDraft.industry.trim(),
        tone: profileDraft.tone,
        goals: accountDraft.goals.split(",").map((item) => item.trim()).filter(Boolean),
      })
      await update()
      setAccountStatus("saved")
      setTimeout(() => setAccountStatus("idle"), 2500)
    } catch (e) {
      setAccountStatus("error")
      setAccountError((e as Error).message || "Save failed")
    }
  }

  const onChangePassword = async () => {
    setPasswordError(null)
    if (passwordDraft.new !== passwordDraft.confirm) {
      setPasswordError("New passwords do not match.")
      return
    }
    if (passwordDraft.new.length < 8) {
      setPasswordError("Password must be at least 8 characters.")
      return
    }
    setPasswordStatus("saving")
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordDraft.current, newPassword: passwordDraft.new }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update password.")
      setPasswordDraft({ current: "", new: "", confirm: "" })
      setPasswordStatus("saved")
      setTimeout(() => setPasswordStatus("idle"), 2500)
    } catch (e) {
      setPasswordStatus("error")
      setPasswordError((e as Error).message || "Update failed")
    }
  }

  const onDeleteAccount = async () => {
    setDeleteStep("deleting")
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete account.")
      }
      await signOut({ callbackUrl: "/" })
    } catch (e) {
      setDeleteStep("confirm")
      setDeleteConfirm("")
      setDeleteError((e as Error).message || "Delete failed. Please try again.")
    }
  }

  const selectedPlanPrices = PLAN_PRICES[billingDraft.plan] ?? { monthly: 0, annual: 0 }
  const annualMonthlyEquiv = selectedPlanPrices.annual > 0 ? Math.round(selectedPlanPrices.annual / 12) : 0
  const displayPrice = billingDraft.billingCycle === "annual" && annualMonthlyEquiv > 0
    ? annualMonthlyEquiv
    : selectedPlanPrices.monthly
  const isUpgrade = billingDraft.plan !== billing.plan
  const isPaidUpgrade = isUpgrade && billingDraft.plan !== "Free"
  const planSummary = getPlanSummary(billing.plan)
  const isLinkedInConnected = Boolean(linkedinProfile)

  const mailHref = upgradesMailUrl(billingDraft.plan, user?.email || "")
  const checkoutUrl = getLemonSqueezyCheckoutUrl(billingDraft.plan, billingDraft.billingCycle, {
    userId: userData?.id,
    email: userData?.email || user?.email,
  })

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
          <button onClick={onSaveProfile} disabled={profileStatus === "saving"} className="mt-4 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-60">{profileStatus === "saving" ? "Saving..." : "Save profile"}</button>
        </section>

        {/* Plan */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          {/* Current plan */}
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Your plan</h2>
              <p className="mt-1 text-sm text-zinc-500">Upgrade by selecting a plan and following the instructions below.</p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <span className="rounded-full bg-teal/10 px-3 py-1 text-xs font-bold text-teal">{billing.plan}</span>
              {billing.overrideActive ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Override active</span> : null}
            </div>
          </div>
          <p className="mb-5 text-xs font-semibold text-zinc-500">
            {billing.plan === "Free" ? "No expiry" : `Expires ${formatPlanDate(planUsage?.planExpiresAt)}`}
          </p>

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

          {/* Usage */}
          {planUsage && (
            <div className="mb-5 rounded-xl border border-zinc-100 bg-zinc-50 p-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">This Month&apos;s Usage</p>
              <UsageBar label="Posts" used={planUsage.drafts.used} limit={planUsage.drafts.limit} />
              <UsageBar label="Carousels" used={planUsage.carousels.used} limit={planUsage.carousels.limit} />
            </div>
          )}

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
                {cycle === "monthly" ? "Monthly" : `Annual (${annualFraming})`}
              </button>
            ))}
          </div>

          {/* Price display for paid plans */}
          {billingDraft.plan !== "Free" && (
            <div className="mb-4 rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
              <p className="text-sm font-semibold text-teal">{billingDraft.plan}</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{formatPkr(displayPrice)}<span className="ml-1 text-sm font-normal text-zinc-500">/month</span></p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {billingDraft.billingCycle === "annual" ? (
                  <>Billed annually at <span className="font-semibold text-teal">{formatPkr(selectedPlanPrices.annual)}/year</span></>
                ) : (
                  <>
                    Billed monthly
                    {annualMonthlyEquiv > 0 && (
                      <> - or <span className="font-semibold text-teal">{formatPkr(annualMonthlyEquiv)}/mo</span> on annual ({annualFraming})</>
                    )}
                  </>
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
                  {billingDraft.billingCycle === "annual"
                    ? `${formatPkr(displayPrice)}/month - billed annually at ${formatPkr(selectedPlanPrices.annual)}/year`
                    : `${formatPkr(displayPrice)}/month - billed monthly`}
                </p>
              </div>
              <div className="p-4">
                {checkoutUrl ? (
                  <>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <a
                        href={checkoutUrl}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
                      >
                        Pay with card - activates instantly
                      </a>
                    </div>
                    <p className="mt-2 text-xs text-amber-600">Processed via Lemon Squeezy - card charged in USD.</p>
                    <p className="mt-3 text-xs text-amber-700">
                      Card not working?{" "}
                      <a href={mailHref} className="font-semibold underline hover:text-amber-900">
                        Email {UPGRADES_EMAIL}
                      </a>{" "}
                      to pay via Easypaisa, JazzCash, or bank transfer instead.
                    </p>
                  </>
                ) : (
                  <>
                    <ol className="space-y-2 text-sm text-amber-800">
                      <li className="flex gap-2"><span className="font-bold">1.</span>Email us - we confirm the amount and send payment details.</li>
                      <li className="flex gap-2"><span className="font-bold">2.</span>Pay via Easypaisa, JazzCash, or bank transfer.</li>
                      <li className="flex gap-2"><span className="font-bold">3.</span>Send your payment screenshot in the same thread.</li>
                      <li className="flex gap-2"><span className="font-bold">4.</span>Your workspace plan is updated within 24 hours.</li>
                    </ol>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={mailHref}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50"
                      >
                        Email {UPGRADES_EMAIL}
                      </a>
                    </div>
                    <p className="mt-3 text-xs text-amber-600">Self-serve checkout for this plan is not available yet. Manual onboarding is the current path - your plan access is confirmed by our team after payment.</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={onSaveBilling} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50">Save preference</button>
            <Link href="/pricing" className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600">Upgrade plan</Link>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Integrations */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Integrations</h2>
          {linkedinStatus ? (
            <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${linkedinStatus.includes("successfully") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {linkedinStatus}
            </p>
          ) : null}
          <div className="mt-4 rounded-2xl border border-zinc-200 p-5 bg-zinc-50/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {isLinkedInConnected && linkedinProfile?.avatar ? (
                  <img src={linkedinProfile.avatar} alt="LinkedIn Avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-[#0A66C2]/20" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A66C2]/15 text-[#0A66C2]">
                    <LinkedInIcon className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">{isLinkedInConnected ? (linkedinProfile?.name || "LinkedIn Account") : "LinkedIn"}</h3>
                  <p className="text-xs text-zinc-500">{isLinkedInConnected ? "Connected for real publishing" : "Not connected. Contact us to enable if unavailable."}</p>
                  {user?.linkedinTokenExpiresAt && (
                    <p className="mt-1 text-[10px] text-zinc-400">
                      Token valid until {new Date(user.linkedinTokenExpiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {isLinkedInConnected ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">Connected</span>
                  <button onClick={onDisconnectLinkedIn} disabled={disconnecting} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 cursor-pointer">{disconnecting ? "Disconnecting..." : "Disconnect"}</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button onClick={onConnectLinkedIn} className="rounded-lg bg-[#0A66C2] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#085fa8] cursor-pointer text-center">Connect LinkedIn</button>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs text-zinc-500 border-t border-zinc-200/55 pt-3">Disconnecting removes the publishing token from the server. Future publishes will fail until you reconnect.</p>
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
          <p className="mt-4 text-xs text-zinc-500">Posts, profile, and events are stored in Supabase. Solo and Pro upgrade instantly via card checkout - other plans are confirmed manually.</p>
        </section>
      </div>
      {/* Account + Password */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Account details */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Account</h2>
            {accountStatus === "saved" && <span className="text-xs font-semibold text-emerald-600">Saved</span>}
            {accountStatus === "error" && <span className="text-xs text-red-600">{accountError}</span>}
          </div>
          <div className="space-y-3">
            <Field label="Full name">
              <input
                value={accountDraft.name}
                onChange={(e) => setAccountDraft((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
                placeholder="Your name"
              />
            </Field>
            <Field label="Email">
              <input
                value={userData?.email || user?.email || ""}
                disabled
                className="w-full rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-zinc-400">Contact support to change your email address.</p>
            </Field>
            <Field label="Role">
              <select
                value={accountDraft.role}
                onChange={(e) => setAccountDraft((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
              >
                <option value="">Select role…</option>
                {ACCOUNT_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Industry">
              <select
                value={accountDraft.industry}
                onChange={(e) => setAccountDraft((prev) => ({ ...prev, industry: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
              >
                <option value="">Select industry…</option>
                {INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </Field>
            <Field label="Goals">
              <textarea
                value={accountDraft.goals}
                onChange={(e) => setAccountDraft((prev) => ({ ...prev, goals: e.target.value }))}
                rows={3}
                placeholder="What are you trying to achieve on LinkedIn?"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none resize-none"
              />
              <p className="mt-1 text-xs text-zinc-400">Separate multiple goals with commas.</p>
            </Field>
          </div>
          <button
            onClick={onSaveAccount}
            disabled={accountStatus === "saving"}
            className="mt-4 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-60"
          >
            {accountStatus === "saving" ? "Saving..." : "Save changes"}
          </button>
        </section>

        {/* Password change */}
        {userData === null || userData.authProvider === "email" ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">Change password</h2>
              {passwordStatus === "saved" && <span className="text-xs font-semibold text-emerald-600">Updated</span>}
              {passwordStatus === "error" && <span className="text-xs text-red-600">{passwordError}</span>}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); onChangePassword() }}
              className="space-y-3"
            >
              <Field label="Current password">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={passwordDraft.current}
                  onChange={(e) => setPasswordDraft((prev) => ({ ...prev, current: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
                  placeholder="••••••••"
                />
              </Field>
              <Field label="New password">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordDraft.new}
                  onChange={(e) => setPasswordDraft((prev) => ({ ...prev, new: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none"
                  placeholder="Min. 8 characters"
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordDraft.confirm}
                  onChange={(e) => setPasswordDraft((prev) => ({ ...prev, confirm: e.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 focus:outline-none ${
                    passwordDraft.confirm && passwordDraft.confirm !== passwordDraft.new
                      ? "border-red-300 focus:border-red-400"
                      : "border-zinc-200 focus:border-teal"
                  }`}
                  placeholder="Re-enter new password"
                />
              </Field>
              <button
                type="submit"
                disabled={
                  passwordStatus === "saving" ||
                  !passwordDraft.current ||
                  !passwordDraft.new ||
                  !passwordDraft.confirm
                }
                className="mt-4 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-60"
              >
                {passwordStatus === "saving" ? "Updating..." : "Update password"}
              </button>
            </form>
          </section>
        ) : (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <h2 className="mb-3 text-base font-semibold text-zinc-900">Password</h2>
            <p className="text-sm text-zinc-500">
              Your account uses{" "}
              <span className="font-semibold capitalize">{userData.authProvider}</span> sign-in.
              Password management is handled by your provider.
            </p>
          </section>
        )}
      </div>

      {/* Referrals */}
      <div className="mt-6">
        <ReferralCard />
      </div>

      {/* Billing history */}
      <div className="mt-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-zinc-900">Billing history</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-100">
            <div className="grid grid-cols-4 bg-zinc-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <span>Date</span>
              <span>Plan</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-zinc-100">
              <div className="px-4 py-8 text-center text-sm text-zinc-400">
                No billing records yet.
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            Billing history will appear here once automated checkout is live. For manual payments, contact{" "}
            <a href="mailto:info@byqalam.com" className="underline hover:text-zinc-600">info@byqalam.com</a>.
          </p>
        </section>
      </div>

      {/* Danger zone */}
      <div className="mt-6">
        <section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-6">
          <h2 className="mb-1 text-base font-semibold text-red-800">Danger zone</h2>
          <p className="mb-4 text-sm text-zinc-500">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          {deleteError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          {deleteStep === "idle" && (
            <button
              onClick={() => { setDeleteStep("confirm"); setDeleteError(null) }}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Delete account
            </button>
          )}
          {deleteStep === "confirm" && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-700">
                Type{" "}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">delete my account</code>
                {" "}to confirm:
              </p>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-red-200 px-3 py-2 text-sm text-zinc-900 focus:border-red-400 focus:outline-none"
                placeholder="delete my account"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={onDeleteAccount}
                  disabled={deleteConfirm !== "delete my account"}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete permanently
                </button>
                <button
                  onClick={() => { setDeleteStep("idle"); setDeleteConfirm("") }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {deleteStep === "deleting" && (
            <p className="text-sm text-zinc-500">Deleting your account…</p>
          )}
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

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-zinc-600">{label}</span>
        <span className={`font-semibold ${pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-zinc-700"}`}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-teal"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
