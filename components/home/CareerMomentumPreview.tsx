import type { CSSProperties } from "react"
import { CheckIcon } from "@/components/ui/qalam-icons"

const SCORE = 73

const breakdown = [
  { label: "Proof", value: 28, max: 35 },
  { label: "Profile", value: 12, max: 15 },
  { label: "Visibility", value: 16, max: 25 },
  { label: "Pipeline", value: 9, max: 15 },
  { label: "Consistency", value: 8, max: 10 },
]

// Sunday-first week. Five active days, today captured.
const week = [
  { day: "M", active: true },
  { day: "T", active: true },
  { day: "W", active: false },
  { day: "T", active: true },
  { day: "F", active: true },
  { day: "S", active: false },
  { day: "S", active: true },
]

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const dash = (SCORE / 100) * CIRCUMFERENCE

export function CareerMomentumPreview() {
  return (
    <div className="panel-raised p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="t-eyebrow text-gold-700">Career momentum</p>
          <p className="mt-1 text-xs text-zinc-500">Example score, sample data</p>
        </div>
        <span className="inline-flex min-h-8 shrink-0 items-center gap-2 rounded-full border border-teal/15 bg-teal/5 px-3 t-eyebrow text-teal">
          <span className="h-2 w-2 rounded-full bg-gold" aria-hidden />
          4 day streak
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-[132px] w-[132px] shrink-0 sm:mx-0">
          <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="66" cy="66" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="10" className="text-zinc-200" />
            <circle
              cx="66"
              cy="66"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              className="text-teal"
              strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold tabular-nums leading-none text-teal">{SCORE}</span>
            <span className="mt-1 t-eyebrow text-zinc-500">of 100</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2" aria-hidden>
            {week.map((entry, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-[0.7rem] font-bold ${
                    entry.active ? "bg-teal text-white" : "border border-zinc-200 bg-white text-zinc-300"
                  }`}
                >
                  {entry.active ? <CheckIcon className="h-3.5 w-3.5" /> : ""}
                </span>
                <span className="t-eyebrow font-semibold text-zinc-400">{entry.day}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">Five active days this week. Momentum builds from proof captured, not hours logged.</p>
        </div>
      </div>

      <div className="mt-6 space-y-2.5 border-t border-zinc-200 pt-5">
        {breakdown.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs font-semibold text-zinc-600">{item.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-teal to-gold"
                style={{ width: `${(item.value / item.max) * 100}%` } as CSSProperties}
              />
            </span>
            <span className="w-12 shrink-0 text-right text-xs font-bold tabular-nums text-zinc-500">
              {item.value}/{item.max}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-[#fffaf0] p-4">
        <div>
          <p className="t-eyebrow text-gold-700">Today&apos;s move</p>
          <p className="mt-1 text-sm font-bold leading-5 text-zinc-900">Document one achievement</p>
        </div>
        <span className="shrink-0 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-teal-900">+5 proof</span>
      </div>
    </div>
  )
}
