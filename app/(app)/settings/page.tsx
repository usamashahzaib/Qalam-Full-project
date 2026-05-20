"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/providers/AuthProvider"
import { useWorkspace, type WorkspaceBilling } from "@/components/providers/WorkspaceProvider"

const PLANS: WorkspaceBilling["plan"][] = ["Free", "Pro", "Team", "Agency"]

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
    setBillingDraft(billing)
  }, [billing])

  const onSaveProfile = async () => {
    setProfileStatus("saving")
    setProfileError(null)
    try {
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Profile, integrations, billing direction, and workspace health.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Voice Profile</h2>
            {isLoadingProfile && <span className="text-xs text-zinc-400 animate-pulse">Loading...</span>}
            {profileStatus === "saved" && <span className="text-xs font-semibold text-emerald-600">Saved</span>}
            {profileStatus === "error" && <span className="text-xs text-red-600">{profileError}</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input value={profileDraft.name} onChange={(e) => setProfileDraft((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
            <Field label="Title"><input value={profileDraft.title} onChange={(e) => setProfileDraft((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
            <Field label="LinkedIn URL"><input value={profileDraft.linkedinUrl} onChange={(e) => setProfileDraft((prev) => ({ ...prev, linkedinUrl: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
            <Field label="Industry"><input value={profileDraft.industry} onChange={(e) => setProfileDraft((prev) => ({ ...prev, industry: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
            <Field label="Brand tone"><input value={profileDraft.tone} onChange={(e) => setProfileDraft((prev) => ({ ...prev, tone: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
            <Field label="Goals (comma-separated)"><input value={profileDraft.goals} onChange={(e) => setProfileDraft((prev) => ({ ...prev, goals: e.target.value }))} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-teal focus:outline-none" /></Field>
          </div>
          <button onClick={onSaveProfile} disabled={profileStatus === "saving"} className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60">{profileStatus === "saving" ? "Saving..." : "Save profile"}</button>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900">Plan</h2>
          <p className="mt-1 text-sm text-zinc-500">Choose your target plan here. Checkout still runs as a guided manual upgrade.</p>
          <div className="mt-4 flex flex-wrap gap-2">{PLANS.map((plan) => <button key={plan} onClick={() => setBillingDraft((prev) => ({ ...prev, plan }))} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${billingDraft.plan === plan ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"}`}>{plan}</button>)}</div>
          <div className="mt-4 flex gap-2">{(["monthly", "annual"] as const).map((cycle) => <button key={cycle} onClick={() => setBillingDraft((prev) => ({ ...prev, billingCycle: cycle }))} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${billingDraft.billingCycle === cycle ? "bg-teal text-white" : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"}`}>{cycle}</button>)}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Current plan" value={billing.plan} />
            <MiniStat label="Billing cycle" value={billing.billingCycle} />
            <MiniStat label="Posts in DB" value={String(posts.length)} />
            <MiniStat label="Upgrade flow" value="Manual" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={onSaveBilling} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50">Save plan preference</button>
            <Link href="/pricing" className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600">Open pricing</Link>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900">Integrations</h2>
          <div className="mt-4 rounded-xl border border-zinc-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">LinkedIn</h3>
                <p className="mt-1 text-sm text-zinc-500">{user?.linkedinMemberId ? "Connected and ready for publishing" : "Not connected"}</p>
                {user?.linkedinTokenExpiresAt && <p className="mt-1 text-xs text-zinc-500">Session refresh due: {new Date(user.linkedinTokenExpiresAt).toLocaleString()}</p>}
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
            <p className="mt-3 text-xs text-zinc-500">Disconnect removes the saved publishing token from the server. You can reconnect any time.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900">Workspace status</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="Posts" value={String(posts.length)} />
            <MiniStat label="Drafts" value={String(drafts.length)} />
            <MiniStat label="Scheduled" value={String(scheduled.length)} />
            <MiniStat label="Storage health" value={postsError || "Healthy"} />
          </div>
          <p className="mt-4 text-xs text-zinc-500">Posts, profile, and events are stored in Supabase. Billing still uses a manual upgrade flow.</p>
        </section>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>{children}</label>
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 truncate text-sm font-semibold text-zinc-900">{value}</p></div>
}
