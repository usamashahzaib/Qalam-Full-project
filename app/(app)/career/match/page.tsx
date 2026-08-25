"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

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

export default function CareerMatchPage() {
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const suffix = workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : ""

  const [form, setForm] = useState<ProfileForm>(emptyForm)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [optedIn, setOptedIn] = useState(false)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

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
      .then((response) => response.json())
      .then(({ profile }) => {
        if (!profile) return
        setForm({
          optedIn: profile.opted_in,
          displayName: profile.display_name || "",
          headline: profile.headline || "",
          industry: profile.industry || "",
          seniority: profile.seniority || "",
          location: profile.location || "",
          expertise: (profile.expertise || []).join(", "),
          audience: (profile.audience || []).join(", "),
          goals: (profile.goals || []).join(", "),
          contactEmail: profile.contact_email || "",
          linkedinUrl: profile.linkedin_url || "",
        })
      })
      .catch(() => undefined)
    fetchSuggestions()
      .then((data) => {
        setOptedIn(Boolean(data.optedIn))
        setSuggestions(data.suggestions || [])
      })
      .catch(() => undefined)
  }, [suffix, fetchSuggestions])

  const save = async () => {
    setBusy(true)
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
    setBusy(false)
  }

  const respond = async (suggestionId: string, action: "interested" | "passed") => {
    setBusy(true)
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
    setBusy(false)
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

        {message && <p className="mt-4 rounded-xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-zinc-700">{message}</p>}

        <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Your match profile</h2>
              <p className="mt-1 text-sm text-zinc-500">Off by default. Turning it on makes you visible to other opted in members only.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, optedIn: !form.optedIn })}
              className={`rounded-full px-4 py-2 text-xs font-bold ${form.optedIn ? "bg-teal text-white" : "bg-zinc-100 text-zinc-600"}`}
            >
              {form.optedIn ? "Matching on" : "Matching off"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input className={field} placeholder="Display name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            <input className={field} placeholder="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            <input className={`${field} sm:col-span-2`} placeholder="Headline" value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} />
            <input className={field} placeholder="Industry" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} />
            <input className={field} placeholder="Seniority, for example Senior or Founder" value={form.seniority} onChange={(event) => setForm({ ...form, seniority: event.target.value })} />
            <input className={`${field} sm:col-span-2`} placeholder="You write about, comma separated" value={form.expertise} onChange={(event) => setForm({ ...form, expertise: event.target.value })} />
            <input className={`${field} sm:col-span-2`} placeholder="You write for, comma separated" value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} />
            <input className={`${field} sm:col-span-2`} placeholder="What you want this year, comma separated" value={form.goals} onChange={(event) => setForm({ ...form, goals: event.target.value })} />
            <input className={field} placeholder="Private contact email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
            <input className={field} placeholder="LinkedIn URL" value={form.linkedinUrl} onChange={(event) => setForm({ ...form, linkedinUrl: event.target.value })} />
          </div>

          <button type="button" onClick={save} disabled={busy} className="mt-4 min-h-11 rounded-xl bg-teal px-5 text-sm font-bold text-white disabled:opacity-40">
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
