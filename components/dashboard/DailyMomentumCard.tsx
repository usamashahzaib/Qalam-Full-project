"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { progressStageFromScore, type CareerMomentumView } from "@/lib/career-momentum"
import { trackCareerEvent } from "@/lib/career-events"

const DAY_FORMAT = new Intl.DateTimeFormat("en", { weekday: "narrow" })

const breakdownLabels: Array<{
  key: keyof CareerMomentumView["breakdown"]
  label: string
  max: number
}> = [
  { key: "proof", label: "Saved wins", max: 35 },
  { key: "profile", label: "Profile", max: 15 },
  { key: "visibility", label: "Publishing", max: 25 },
  { key: "pipeline", label: "Applications", max: 15 },
  { key: "consistency", label: "Consistency", max: 10 },
]

function MomentumSkeleton() {
  return (
    <section className="grid gap-px overflow-hidden rounded-[2rem] border border-teal/10 bg-teal/10 shadow-card-floating lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
      <div className="h-96 animate-pulse bg-white" />
      <div className="h-96 animate-pulse bg-teal-800" />
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
    if (!response.ok) setError(data.error || "Your progress could not be loaded.")
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
    if (!response.ok) setError(data.error || "Today's win could not be saved.")
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
        <p className="text-sm font-bold text-zinc-900">Your progress is unavailable.</p>
        <p className="mt-1 text-sm text-zinc-500">{error || "Refresh the page to try again."}</p>
        <button type="button" onClick={() => void load()} className="mt-4 min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-bold text-zinc-700">Retry</button>
      </section>
    )
  }

  const scoreAngle = `${Math.max(4, momentum.score) * 3.6}deg`
  const pathStage = progressStageFromScore(momentum.score)

  return (
    <section id="daily-proof" className="overflow-hidden rounded-[2rem] border border-teal/10 bg-white shadow-card-floating">
      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="relative overflow-hidden p-5 sm:p-7 lg:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Today&apos;s 30-second win</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Save one thing you accomplished today.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">Qalam keeps it in Recent Wins so you can reuse it in your next post, resume, interview, or performance review.</p>
            </div>
            <div className="relative flex items-center gap-3 rounded-2xl border border-gold/20 bg-gold-50 px-3 py-2 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-base font-bold text-white">{momentum.currentStreak}</span>
              <span className="text-xs leading-4 text-zinc-500"><strong className="block text-zinc-900">day streak</strong>Keep building</span>
            </div>
          </div>

          {momentum.proofCapturedToday ? (
            <div className="mt-7 rounded-2xl border border-teal/20 bg-teal/5 p-5" role="status">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-white">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Saved. Today&apos;s work will not be forgotten.</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">You now have {momentum.counts.signals} saved win{momentum.counts.signals === 1 ? "" : "s"} ready to reuse. You can stop here or take the next useful step.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-7">
              <label htmlFor="daily-proof-note" className="text-base font-bold text-zinc-900">{momentum.prompt.copy}</label>
              <p className="mt-1 text-sm text-zinc-500">One honest sentence is enough. Add a number or result only when it is true.</p>
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
                    {saving ? "Saving..." : "Save today's win"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error ? <p className="mt-3 text-sm font-medium text-red-600" role="alert">{error}</p> : null}

          <div className="mt-7 border-t border-zinc-100 pt-5">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Your week</p>
                <p className="mt-1 text-sm font-semibold text-zinc-700">Meaningful progress on {momentum.activeDaysLast7} of 7 days</p>
                <p className="mt-1 text-xs text-zinc-500">Miss a day? Continue when you are ready. Your saved work stays.</p>
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

        <aside className="border-t border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(184,122,22,0.24),transparent_42%),linear-gradient(145deg,#0d4a45,#051f1c)] p-5 text-white sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
          <div className="flex items-center gap-5">
            <div
              className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(var(--color-gold, #b87a16) ${scoreAngle}, rgba(255,255,255,0.16) 0deg)` }}
              aria-label={`Qalam progress ${momentum.score} out of 100`}
            >
              <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-teal-900">
                <span className="text-2xl font-bold tabular-nums text-white">{momentum.score}</span>
                <span className="t-eyebrowr text-white/55">Progress</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-200">Next useful move</p>
              <h3 className="mt-1 text-lg font-bold text-white">{momentum.nextAction.label}</h3>
              <p className="mt-1 text-xs leading-5 text-white/60">{momentum.nextAction.reason}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-200">Qalam path</p>
                <p className="mt-1 text-sm font-semibold text-white">{pathStage} of 13 progress signals active</p>
              </div>
              <span className="text-xs text-white/50">Built from real work</span>
            </div>
            <div className="mt-3 grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1" aria-label={`${pathStage} of 13 progress stages reached`}>
              {Array.from({ length: 13 }, (_, index) => (
                <span key={index} className={`h-2 rounded-full ${index < pathStage ? "bg-gold-200" : "bg-white/15"}`} />
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {breakdownLabels.map(({ key, label, max }) => {
              const value = momentum.breakdown[key]
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs"><span className="font-semibold text-white/70">{label}</span><span className="tabular-nums text-white/45">{value}/{max}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gold-200 transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></div>
                </div>
              )
            })}
          </div>

          <Link
            href={momentum.nextAction.href}
            onClick={() => void trackCareerEvent("career.momentum_next_action", { label: momentum.nextAction.label })}
            className="mt-6 flex min-h-12 items-center justify-between rounded-xl bg-gold-200 px-4 text-sm font-bold text-teal-900 shadow-lg shadow-black/10 transition hover:bg-white"
          >
            {momentum.nextAction.label}
            <span aria-hidden="true">&rarr;</span>
          </Link>
          {momentum.counts.signals > 0 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white">Gentle reminder</p>
                  <p className="mt-1 t-eyebrow leading-4 text-white/50">Only when today&apos;s win is still missing.</p>
                </div>
                <label className="relative mt-0.5 inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={momentum.reminder.enabled}
                    disabled={reminderSaving}
                    onChange={(event) => void saveReminder(event.target.checked, momentum.reminder.hour)}
                  />
                  <span className="h-6 w-11 rounded-full bg-white/20 transition peer-checked:bg-gold peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
                  <span className="sr-only">Enable daily proof reminder</span>
                </label>
              </div>
              {momentum.reminder.enabled ? (
                <label className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs font-semibold text-white/65">
                  Remind me around
                  <select
                    value={momentum.reminder.hour}
                    disabled={reminderSaving}
                    onChange={(event) => void saveReminder(true, Number(event.target.value))}
                    className="min-h-10 rounded-lg border border-white/15 bg-teal-900 px-3 text-xs font-bold text-white outline-none focus:border-gold"
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
          <p className="mt-4 t-eyebrow leading-5 text-white/40">{momentum.measurementNote}</p>
        </aside>
      </div>

      {momentum.recentSignals.length ? (
        <div className="border-t border-zinc-200 px-5 py-4 sm:px-7 lg:px-8">
          <div className="flex gap-3 overflow-x-auto pb-1">
            <span className="shrink-0 pt-2 t-eyebrow text-zinc-400">Recent wins</span>
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
