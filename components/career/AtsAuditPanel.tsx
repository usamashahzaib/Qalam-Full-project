"use client"

import { useState } from "react"
import type { AtsAudit, AtsCheck, AtsFactorResult } from "@/lib/ats-engine"
import { ATS_METHODOLOGY_PATH } from "@/lib/ats-methodology"

/**
 * Renders the deterministic audit behind a readiness score.
 *
 * The point of this panel is that the number is arguable. Every factor opens
 * to the checks that produced it, each check states the fact it observed and
 * the fix that recovers the points, and the fixes are ordered by how many
 * points they are actually worth. A candidate who disputes the score can find
 * the exact line they disagree with.
 */

const stateStyles: Record<AtsCheck["state"], string> = {
  pass: "bg-teal/10 text-teal",
  warn: "bg-gold/15 text-gold-700",
  fail: "bg-red-50 text-red-700",
  na: "bg-zinc-100 text-zinc-500",
}

const stateLabel: Record<AtsCheck["state"], string> = {
  pass: "Pass",
  warn: "Partial",
  fail: "Fail",
  na: "Not scored",
}

const barTone = (score: number) => (score >= 80 ? "bg-teal" : score >= 60 ? "bg-gold" : "bg-red-500")

function FactorRow({ factor }: { factor: AtsFactorResult }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-zinc-100 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-900">{factor.name}</span>
          <span className="block text-xs text-zinc-500">
            {factor.earned} of {factor.weight} points
          </span>
        </span>
        <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-zinc-100">
          <span className={`block h-full rounded-full ${barTone(factor.score)}`} style={{ width: `${factor.score}%` }} />
        </span>
        <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-zinc-900">{factor.score}</span>
        <span aria-hidden className="w-3 shrink-0 text-xs text-zinc-400">{open ? "-" : "+"}</span>
      </button>

      {open && (
        <div className="pb-4">
          <p className="mb-3 text-xs leading-relaxed text-zinc-500">{factor.definition}</p>
          <ul className="space-y-2.5">
            {factor.checks.map((check) => (
              <li key={check.id} className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${stateStyles[check.state]}`}>
                    {stateLabel[check.state]}
                  </span>
                  <span className="text-sm font-semibold text-zinc-900">{check.label}</span>
                  {check.pointsAtStake > 0 && (
                    <span className="text-[11px] font-semibold text-zinc-500">{check.pointsAtStake} points available</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-zinc-600">{check.detail}</p>
                {check.fix && <p className="mt-1.5 text-xs leading-relaxed text-zinc-700">{check.fix}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function AtsAuditPanel({ audit }: { audit: AtsAudit }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold leading-none tabular-nums text-zinc-900">{audit.overall}</span>
          <span className="pb-1 text-sm text-zinc-500">/ 100</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-600">
          Computed from {audit.factors.reduce((total, factor) => total + factor.checks.length, 0)} checks against the
          published factor weights. Open any factor below to see the checks that produced it.{" "}
          <a href={ATS_METHODOLOGY_PATH} className="font-semibold text-teal underline underline-offset-2">
            Methodology
          </a>
        </p>
        {audit.provisional && (
          <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-xs text-zinc-700">
            Scored without a job description, so role alignment is measured against standard expectations for the role.
            Paste the posting to score against the exact advert.
          </p>
        )}
      </div>

      {audit.suggestions.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-zinc-900">Highest value fixes</h3>
          <ol className="space-y-2">
            {audit.suggestions.slice(0, 5).map((item) => (
              <li key={item.checkId} className="rounded-lg border border-zinc-200 bg-white p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-teal">{item.factor}</span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-gold-700">+{item.pointsAvailable}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{item.detail}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-800">{item.action}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <h3 className="mb-1 text-sm font-bold text-zinc-900">Score breakdown</h3>
        <div className="rounded-xl border border-zinc-200 bg-white px-4">
          {audit.factors.map((factor) => (
            <FactorRow key={factor.key} factor={factor} />
          ))}
        </div>
      </section>

      {(audit.keywords.matched.length > 0 || audit.keywords.missing.length > 0) && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-zinc-900">
            Keyword coverage <span className="font-normal text-zinc-500">{audit.keywords.coverage} percent</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {audit.keywords.matched.map((item) => (
              <span key={item.keyword} className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal">
                {item.keyword}
              </span>
            ))}
            {audit.keywords.missing.map((item) => (
              <span
                key={item.keyword}
                className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-500"
              >
                {item.keyword}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Dashed terms are not evidenced anywhere in the resume. Add one only where the work genuinely happened. A
            keyword you cannot defend in an interview costs more than the one it wins.
          </p>
        </section>
      )}
    </div>
  )
}
