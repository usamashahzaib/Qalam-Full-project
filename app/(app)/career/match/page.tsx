"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import type { MatchPrefillSource } from "@/lib/match-profile-prefill"

type Suggestion = {
  id: string
  status: "pending" | "interested" | "passed"
  score: number
  reasons: string[]
  displayName: string
  headline: string
  industry: string
  seniority: string
  location: string
  expertise: string[]
  connected: boolean
  contactEmail: string | null
  linkedinUrl: string | null
}

type ProfileForm = {
  optedIn: boolean
  displayName: string
  headline: string
  industry: string
  seniority: string
  location: string
  expertise: string
  audience: string
  goals: string
  contactEmail: string
  linkedinUrl: string
}

const emptyForm: ProfileForm = {
  optedIn: false,
  displayName: "",
  headline: "",
  industry: "",
  seniority: "",
  location: "",
  expertise: "",
  audience: "",
  goals: "",
  contactEmail: "",
  linkedinUrl: "",
}

const field = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal"
const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean)
const sourceLabels: Record<MatchPrefillSource, string> = {
  career_vault: "Career Vault",
  profile: "profile",
  publishing_context: "publishing context",
}

function toForm(profile: Record<string, unknown>): ProfileForm {
  return {
    optedIn: profile.opted_in === true,
    displayName: typeof profile.display_name === "string" ? profile.display_name : "",
    headline: typeof profile.headline === "string" ? profile.headline : "",
    industry: typeof profile.industry === "string" ? profile.industry : "",
    seniority: typeof profile.seniority === "string" ? profile.seniority : "",
    location: typeof profile.location === "string" ? profile.location : "",
    expertise: Array.isArray(profile.expertise) ? profile.expertise.join(", ") : "",
    audience: Array.isArray(profile.audience) ? profile.audience.join(", ") : "",
    goals: Array.isArray(profile.goals) ? profile.goals.join(", ") : "",
    contactEmail: typeof profile.contact_email === "string" ? profile.contact_email : "",
    linkedinUrl: typeof profile.linkedin_url === "string" ? profile.linkedin_url : "",
  }
}

function MatchField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  wide = false,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  helper?: string
  wide?: boolean
  type?: "text" | "email" | "url"
}) {
  return (
    <label className={wide ? "sm:col-span-2" : undefined}>
      <span className="mb-1.5 block text-xs font-semibold text-zinc-700">{label}</span>
      <input
        className={field}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? <span className="mt-1.5 block text-xs leading-5 text-zinc-500">{helper}</span> : null}
    </label>
  )
}

export default function CareerMatchPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const suffix = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""

  const [form, setForm] = useState<ProfileForm>(emptyForm)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [optedIn, setOptedIn] = useState(false)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [hasSavedProfile, setHasSavedProfile] = useState(false)
  const [prefillSources, setPrefillSources] = useState<MatchPrefillSource[]>([])

  // Returns the payload rather than writing state so the effect below never
  // calls setState on a synchronous path.
  const fetchSuggestions = useCallback(async () => {
    const response = await fetch(`/api/match/suggestions${suffix}`)
    return (await response.json().catch(() => ({}))) as { optedIn?: boolean; suggestions?: Suggestion[] }
  }, [suffix])

  const loadSuggestions = useCallback(async () => {
    const data = await fetchSuggestions()
    setOptedIn(Boolean(data.optedIn))
    setSuggestions(data.suggestions || [])
  }, [fetchSuggestions])

  useEffect(() => {
    fetch(`/api/match/profile${suffix}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || "Your match profile could not be loaded.")
        return data
      })
      .then(({ profile, draft, prefillSources: sources }) => {
        setHasSavedProfile(Boolean(profile))
        setPrefillSources(Array.isArray(sources) ? sources : [])
        setForm(draft && typeof draft === "object" ? toForm(draft) : emptyForm)
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Your match profile could not be loaded."))
      .finally(() => setProfileLoading(false))
    fetchSuggestions()
      .then((data) => {
        setOptedIn(Boolean(data.optedIn))
        setSuggestions(data.suggestions || [])
      })
      .catch(() => undefined)
  }, [suffix, fetchSuggestions])

  const save = async () => {
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch(`/api/match/profile${suffix}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceKey,
          optedIn: form.optedIn,
          displayName: form.displayName,
          headline: form.headline,
          industry: form.industry,
          seniority: form.seniority,
          location: form.location,
          expertise: split(form.expertise),
          audience: split(form.audience),
          goals: split(form.goals),
          contactEmail: form.contactEmail,
          linkedinUrl: form.linkedinUrl,
        }),
      })
      const data = await response.json().catch(() => ({}))
      setMessage(response.ok ? "Match profile saved." : data.error || "Match profile could not be saved.")
      if (response.ok) await loadSuggestions()
    } catch {
      setMessage("Match profile could not be saved.")
    } finally {
      setBusy(false)
    }
  }

  const respond = async (suggestionId: string, action: "interested" | "passed") => {
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch(`/api/match/respond${suffix}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceKey, suggestionId, action }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setSuggestions(data.suggestions || [])
        setMessage(data.connected ? "Introduction unlocked. Contact details are now visible." : action === "interested" ? "Saved. They see the introduction on their side." : "Passed. This person will not be suggested again.")
      } else setMessage(data.error || "That response could not be saved.")
    } catch {
      setMessage("That response could not be saved.")
    } finally {
      setBusy(false)
    }
  }

  const open = suggestions.filter((item) => item.status !== "passed")

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl bg-[#073f3b] px-7 py-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Signal match</p>
          <h1 className="mt-2 text-3xl font-bold">Three professionals a week, chosen from your actual signal.</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Matched on what you publish about and who you publish for, not on a headline. Nobody sees your contact details until you both say yes.
          </p>
        </header>

        {message && <p className="mt-4 rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-zinc-700" role="status" aria-live="polite">{message}</p>}

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Your match profile</h2>
              <p className="mt-1 text-sm text-zinc-500">Off by default. Turning it on makes you visible to other opted in members only.</p>
            </div>
            <button
              type="button"
              aria-pressed={form.optedIn}
              disabled={profileLoading || busy}
              onClick={() => setForm({ ...form, optedIn: !form.optedIn })}
              className={`rounded-full px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${form.optedIn ? "bg-teal text-white" : "bg-zinc-100 text-zinc-600"}`}
            >
              {form.optedIn ? "Matching on" : "Matching off"}
            </button>
          </div>

          {profileLoading ? (
            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4" role="status">
              <p className="text-sm font-semibold text-zinc-700">Loading your private draft...</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Nothing is added to Signal Match while this loads.</p>
            </div>
          ) : hasSavedProfile ? (
            <div className="mt-5 rounded-xl border border-teal/20 bg-teal/[0.04] px-4 py-4">
              <p className="text-sm font-semibold text-zinc-800">Your saved match profile is ready to edit.</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Any empty fields were filled from your saved Qalam context where possible. Changes stay private until you save them.</p>
            </div>
          ) : prefillSources.length > 0 ? (
            <div className="mt-5 rounded-xl border border-teal/20 bg-teal/[0.04] px-4 py-4">
              <p className="text-sm font-semibold text-zinc-800">We prepared a private draft from your {prefillSources.map((source) => sourceLabels[source]).join(", ")}.</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Review every field. Nothing enters the matching pool until you turn matching on and save.</p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4">
              <p className="text-sm font-semibold text-zinc-800">No saved context was available for a draft.</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Add the details below in your own words. Nothing enters the matching pool until you turn matching on and save.</p>
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MatchField label="Display name" placeholder="Ayesha Khan" value={form.displayName} onChange={(displayName) => setForm({ ...form, displayName })} />
            <MatchField label="Location" placeholder="Lahore, Pakistan" value={form.location} onChange={(location) => setForm({ ...form, location })} />
            <MatchField wide label="Professional headline" placeholder="People and Culture leader in financial services" value={form.headline} onChange={(headline) => setForm({ ...form, headline })} />
            <MatchField label="Industry" placeholder="Financial services" value={form.industry} onChange={(industry) => setForm({ ...form, industry })} />
            <MatchField label="Seniority" placeholder="Senior, Lead, Director, or Founder" value={form.seniority} onChange={(seniority) => setForm({ ...form, seniority })} />
            <MatchField wide label="Topics you publish about" placeholder="Hiring, people analytics, leadership" helper="Separate topics with commas." value={form.expertise} onChange={(expertise) => setForm({ ...form, expertise })} />
            <MatchField wide label="People you publish for" placeholder="Founders, HR leaders, people managers" helper="This field has the strongest effect on your matches. Separate audiences with commas." value={form.audience} onChange={(audience) => setForm({ ...form, audience })} />
            <MatchField wide label="What you want this year" placeholder="Peer learning, collaborations, stronger professional network" helper="Separate goals with commas." value={form.goals} onChange={(goals) => setForm({ ...form, goals })} />
            <MatchField type="email" label="Private contact email" placeholder="you@example.com" helper="Shared only after you both request an introduction." value={form.contactEmail} onChange={(contactEmail) => setForm({ ...form, contactEmail })} />
            <MatchField type="url" label="LinkedIn profile" placeholder="https://www.linkedin.com/in/username" helper="Shared only after you both request an introduction." value={form.linkedinUrl} onChange={(linkedinUrl) => setForm({ ...form, linkedinUrl })} />
          </div>

          <button type="button" onClick={save} disabled={busy || profileLoading} className="mt-4 min-h-11 rounded-xl bg-teal px-5 text-sm font-bold text-white disabled:opacity-40">
            Save match profile
          </button>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            The strongest matches come from the &quot;you write for&quot; field. It is what lets Qalam pair you with someone whose work is your audience.
          </p>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-lg font-bold text-zinc-900">This week</h2>
          {!optedIn ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
              <p className="font-bold text-zinc-900">Matching is off</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Turn it on above to receive three introductions each week. You can turn it off again at any time and your profile leaves the pool immediately.</p>
            </div>
          ) : open.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
              <p className="font-bold text-zinc-900">No match this week</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Qalam only suggests someone when there is a real reason to. A thin week means no strong pairing was found, not that the feature is broken.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {open.map((suggestion) => (
                <article key={suggestion.id} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-bold uppercase text-teal">{suggestion.score}% fit</span>
                    {suggestion.connected && <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold uppercase text-gold-700">Connected</span>}
                  </div>
                  <h3 className="mt-4 font-bold text-zinc-900">{suggestion.displayName}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{suggestion.headline}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {[suggestion.seniority, suggestion.industry, suggestion.location].filter(Boolean).join(" | ")}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {suggestion.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2 text-xs leading-5 text-zinc-600">
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        {reason}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {suggestion.expertise.slice(0, 5).map((item) => (
                      <span key={item} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-600">{item}</span>
                    ))}
                  </div>

                  <div className="mt-auto pt-5">
                    {suggestion.connected ? (
                      <div className="space-y-1 text-xs">
                        {suggestion.contactEmail && <a className="block font-bold text-teal" href={`mailto:${suggestion.contactEmail}`}>{suggestion.contactEmail}</a>}
                        {suggestion.linkedinUrl && <a className="block font-bold text-teal" href={suggestion.linkedinUrl} target="_blank" rel="noreferrer">Open LinkedIn profile</a>}
                      </div>
                    ) : suggestion.status === "interested" ? (
                      <p className="text-xs leading-5 text-zinc-500">Waiting on them. Contact details unlock when they agree too.</p>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" disabled={busy} onClick={() => respond(suggestion.id, "interested")} className="min-h-11 flex-1 rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white disabled:opacity-40">
                          Introduce us
                        </button>
                        <button type="button" disabled={busy} onClick={() => respond(suggestion.id, "passed")} className="min-h-11 rounded-xl border border-zinc-200 px-4 text-xs font-bold text-zinc-500 disabled:opacity-40">
                          Pass
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
