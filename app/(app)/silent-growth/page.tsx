"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { StealthIcon } from "@/components/ui/qalam-icons"
import { SILENT_GROWTH_LIVE } from "@/lib/constants"
import { SafetyBanner } from "./_components/SafetyBanner"
import { DnaAnalyzer } from "./_components/DnaAnalyzer"
import { PrePostFilter } from "./_components/PrePostFilter"
import { CommentExpander } from "./_components/CommentExpander"
import { EngagementLedger } from "./_components/EngagementLedger"

const TABS = [
  { id: "dna", label: "Target DNA" },
  { id: "filter", label: "Pre-Post Filter" },
  { id: "expand", label: "Comment Expander" },
  { id: "ledger", label: "Engagement Ledger" },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function SilentGrowthPage() {
  const [tab, setTab] = useState<TabId>("dna")
  const router = useRouter()

  useEffect(() => {
    if (!SILENT_GROWTH_LIVE) router.replace("/dashboard")
  }, [router])

  if (!SILENT_GROWTH_LIVE) return null

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 lg:px-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal">
          <StealthIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-400">Engagement</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">Silent Growth</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Study how a target profile writes, then engage with intent - custom comments, a matching post template, and a filter to sanity-check your own drafts before you publish.
          </p>
        </div>
      </div>

      <SafetyBanner />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "border-teal text-teal"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dna" && <DnaAnalyzer />}
      {tab === "filter" && <PrePostFilter />}
      {tab === "expand" && <CommentExpander />}
      {tab === "ledger" && <EngagementLedger />}
    </div>
  )
}
