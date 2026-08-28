"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { CareerMomentumView } from "@/lib/career-momentum"
import { trackCareerEvent } from "@/lib/career-events"

const DAY_FORMAT = new Intl.DateTimeFormat("en", { weekday: "narrow" })

const breakdownLabels: Array<{
  key: keyof CareerMomentumView["breakdown"]
  label: string
  max: number
}> = [
  { key: "proof", label: "Proof", max: 35 },
  { key: "profile", label: "Direction", max: 15 },
  { key: "visibility", label: "Visibility", max: 25 },
  { key: "pipeline", label: "Pipeline", max: 15 },
  { key: "consistency", label: "Rhythm", max: 10 },
]

function MomentumSkeleton() {
  return (
    <section className="grid gap-px overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-200 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <div className="h-80 animate-pulse bg-white" />
      <div className="h-80 animate-pulse bg-zinc-50" />
    </section>
  )
}

export function DailyMomentumCard() {
  const [momentum, setMomentum] = useState<CareerMomentumView | null>(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reminderSaving, setReminderSaving] = useState(false)
  const [error, setError] = useState("")
  const timezoneOffset = useMemo(() => new Date().getTimezoneOffset(), [])

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch(`/api/career/momentum?timezoneOffset=${timezoneOffset}`, {
      cache: "no-store",
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) setError(data.error || "Career momentum could not be loaded.")
    else setMomentum(data.momentum)
    setLoading(false)
  }, [timezoneOffset])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const capture = async () => {
    if (!momentum || note.trim().length < 3) return
    setSaving(true)
    setError("")
    const response = await fetch("/api/career/momentum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note,
        promptKey: momentum.prompt.key,
        timezoneOffset,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) setError(data.error || "Today's proof could not be saved.")
    else {
      setNote("")
      if (data.momentum) setMomentum(data.momentum)
      else await load()
      void trackCareerEvent("career.daily_signal_captured", {
        prompt_key: momentum.prompt.key,
        note_length: note.trim().length,
      })
    }
    setSaving(false)
  }

  const saveReminder = async (enabled: boolean, hour: number) => {
    if (!momentum) return
    setReminderSaving(true)
    setError("")
    const response = await fetch("/api/career/momentum", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, hour, timezoneOffset }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) setError(data.error || "Reminder settings could not be saved.")
    else {
      setMomentum((current) => current ? { ...current, reminder: data.reminder } : current)
      void trackCareerEvent("career.momentum_reminder_updated", { enabled, hour })
    }
    setReminderSaving(false)
  }

  if (loading) return <MomentumSkeleton />

  if (!momentum) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white px-6 py-8">
        <p className="text-sm font-bold text-zinc-900">Career momentum is unavailable.</p>
        <p className="mt-1 text-sm text-zinc-500">{error || "Refresh the page to try again."}</p>
        <button type="button" onClick={() => void load()} className="mt-4 min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-bold text-zinc-700">Retry</button>
      </section>
    )
  }

  const scoreAngle = `${Math.max(4, momentum.score) * 3.6}deg`

  return (
    <section id="daily-proof" className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Today&apos;s proof</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">Do not let today&apos;s work disappear.</h2>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-sm font-bold text-white">{momentum.currentStreak}</span>
              <span className="text-xs leading-4 text-zinc-500"><strong className="block text-zinc-800">day rhythm</strong>Current run</span>
            </div>
          </div>

          {momentum.proofCapturedToday ? (
            <div className="mt-7 rounded-2xl border border-teal/20 bg-teal/5 p-5" role="status">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Today&apos;s signal is banked.</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">Your Signal Bank now holds {momentum.counts.signals} career moment{momentum.counts.signals === 1 ? "" : "s"}. You are done for today unless you want to build on it.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-7">
              <label htmlFor="daily-proof-note" className="text-base font-bold text-zinc-900">{momentum.prompt.copy}</label>
              <p className="mt-1 text-sm text-zinc-500">One honest sentence. Usually under 30 seconds.</p>
              <div className="mt-4 rounded-2xl border border-zinc-300 bg-[oklch(0.99_0.004_165)] p-2 transition focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/10">
                <textarea
                  id="daily-proof-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Example: I shortened client onboarding from five steps to three by removing duplicate approvals."
                  className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
                />
                <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-2 pt-2">
                  <span className="text-xs tabular-nums text-zinc-400">{note.length}/500</span>
                  <button
                    type="button"
                    onClick={() => void capture()}
                    disabled={saving || note.trim().length < 3}
                    className="min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white transition hover:bg-teal disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? "Banking..." : "Bank today's proof"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error ? <p className="mt-3 text-sm font-medium text-red-600" role="alert">{error}</p> : null}

          <div className="mt-7 border-t border-zinc-100 pt-5">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Seven-day rhythm</p>
                <p className="mt-1 text-sm font-semibold text-zinc-700">{momentum.activeDaysLast7} useful day{momentum.activeDaysLast7 === 1 ? "" : "s"} recorded</p>
              </div>
              <div className="flex justify-between gap-1 sm:justify-start sm:gap-2" aria-label={`${momentum.activeDaysLast7} active days in the last seven days`}>
                {momentum.week.map((day) => (
                  <div key={day.date} className="text-center">
                    <span className={`block h-3 w-6 rounded-full sm:w-7 ${day.active ? "bg-teal" : "bg-zinc-200"}`} />
                    <span className="mt-1 block t-eyebrow font-semibold text-zinc-400">{DAY_FORMAT.format(new Date(`${day.date}T12:00:00`))}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="border-t border-zinc-200 bg-zinc-50/80 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
          <div className="flex items-center gap-5">
            <div
              className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(var(--color-teal, #0d9488) ${scoreAngle}, #e4e4e7 0deg)` }}
              aria-label={`Career momentum ${momentum.score} out of 100`}
            >
              <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white">
                <span className="text-2xl font-bold tabular-nums text-zinc-950">{momentum.score}</span>
                <span className="t-eyebrowr text-zinc-400">Momentum</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Next best move</p>
              <h3 className="mt-1 text-lg font-bold text-zinc-950">{momentum.nextAction.label}</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">{momentum.nextAction.reason}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {breakdownLabels.map(({ key, label, max }) => {
              const value = momentum.breakdown[key]
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs"><span className="font-semibold text-zinc-600">{label}</span><span className="tabular-nums text-zinc-400">{value}/{max}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
                </div>
              )
            })}
          </div>

          <Link
            href={momentum.nextAction.href}
            onClick={() => void trackCareerEvent("career.momentum_next_action", { label: momentum.nextAction.label })}
            className="mt-6 flex min-h-11 items-center justify-between rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-800 transition hover:border-teal hover:text-teal"
          >
            {momentum.nextAction.label}
            <span aria-hidden="true">&rarr;</span>
          </Link>
          {momentum.counts.signals > 0 ? (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-zinc-800">Daily anchor</p>
                  <p className="mt-1 t-eyebrow leading-4 text-zinc-500">One reminder only when today&apos;s signal is still missing.</p>
                </div>
                <label className="relative mt-0.5 inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={momentum.reminder.enabled}
                    disabled={reminderSaving}
                    onChange={(event) => void saveReminder(event.target.checked, momentum.reminder.hour)}
                  />
                  <span className="h-6 w-11 rounded-full bg-zinc-200 transition peer-checked:bg-teal peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
                  <span className="sr-only">Enable daily proof reminder</span>
                </label>
              </div>
              {momentum.reminder.enabled ? (
                <label className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs font-semibold text-zinc-600">
                  Remind me around
                  <select
                    value={momentum.reminder.hour}
                    disabled={reminderSaving}
                    onChange={(event) => void saveReminder(true, Number(event.target.value))}
                    className="min-h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-800 outline-none focus:border-teal"
                  >
                    <option value={8}>8:00 AM</option>
                    <option value={12}>12:00 PM</option>
                    <option value={17}>5:00 PM</option>
                    <option value={20}>8:00 PM</option>
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          <p className="mt-4 t-eyebrow leading-5 text-zinc-400">{momentum.measurementNote}</p>
        </aside>
      </div>

      {momentum.recentSignals.length ? (
        <div className="border-t border-zinc-200 px-5 py-4 sm:px-7 lg:px-8">
          <div className="flex gap-3 overflow-x-auto pb-1">
            <span className="shrink-0 pt-2 t-eyebrow text-zinc-400">Signal bank</span>
            {momentum.recentSignals.map((signal) => (
              <div key={signal.id} className="min-w-64 max-w-sm rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="line-clamp-2 text-xs leading-5 text-zinc-600">{signal.note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
