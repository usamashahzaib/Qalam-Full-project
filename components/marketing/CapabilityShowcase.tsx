"use client"

import { useRef, useState, type KeyboardEvent } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { CAPABILITIES, type CapabilityKey } from "@/lib/marketing-discovery"
import {
  AnalyticsIcon,
  ArchiveIcon,
  BrainIcon,
  CalendarIcon,
  CheckIcon,
  ComposeIcon,
  GrowthIcon,
  MicroscopeIcon,
  ProfileIcon,
} from "@/components/ui/qalam-icons"

const icons = {
  "ats-checker": MicroscopeIcon,
  "resume-builder": ComposeIcon,
  "jd-match": BrainIcon,
  "linkedin-optimizer": ProfileIcon,
  "content-studio": AnalyticsIcon,
  "career-hub": ArchiveIcon,
} satisfies Record<CapabilityKey, typeof MicroscopeIcon>

function WindowShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-[0_24px_60px_-32px_rgba(13,74,69,0.32)]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{title}</span>
        </div>
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal">Qalam</span>
      </div>
      {children}
    </div>
  )
}

function AtsPreview() {
  const scores = [
    ["ATS parsing", "86", "bg-teal"],
    ["Role alignment", "74", "bg-gold"],
    ["Recruiter read", "81", "bg-teal"],
    ["Achievement evidence", "63", "bg-gold"],
  ]
  return (
    <WindowShell title="Resume readiness report">
      <div className="grid gap-4 p-4 sm:grid-cols-[0.8fr_1.2fr] sm:p-6">
        <div className="rounded-2xl bg-[#073f3b] p-5 text-white">
          <p className="text-xs font-semibold text-white/60">Overall readiness</p>
          <div className="mt-3 flex items-end gap-2"><strong className="text-5xl">76</strong><span className="pb-1 text-sm text-white/65">/100</span></div>
          <p className="mt-5 text-xs leading-5 text-white/70">Strong structure. Improve evidence depth and match three role-critical requirements.</p>
        </div>
        <div className="space-y-3 rounded-2xl border border-zinc-100 p-4">
          {scores.map(([label, value, color]) => (
            <div key={label}>
              <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-zinc-600"><span>{label}</span><span>{value}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100"><motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: Number(value) / 100 }} viewport={{ once: true }} className={`h-full origin-left rounded-full ${color}`} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-zinc-100 px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3 rounded-xl bg-gold-50 p-3 text-xs leading-5 text-zinc-700"><MicroscopeIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span><strong>Priority finding:</strong> Two claimed skills have no supporting evidence in recent experience.</span></div>
      </div>
    </WindowShell>
  )
}

function ResumePreview() {
  return (
    <WindowShell title="Targeted resume builder">
      <div className="grid min-h-[330px] sm:grid-cols-[0.38fr_0.62fr]">
        <div className="border-b border-zinc-100 bg-zinc-50 p-4 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Verified evidence</p>
          {[
            ["Role", "Product Marketing Lead"],
            ["Scope", "4 markets"],
            ["Outcome", "Pipeline +31%"],
            ["Team", "7 collaborators"],
          ].map(([label, value]) => <div key={label} className="border-b border-zinc-200 py-3 last:border-0"><p className="text-[10px] text-zinc-400">{label}</p><p className="mt-1 text-xs font-semibold text-zinc-800">{value}</p></div>)}
        </div>
        <div className="p-5 sm:p-7">
          <div className="border-b-2 border-teal pb-3"><p className="text-lg font-extrabold text-zinc-900">Areeba Farooq</p><p className="mt-1 text-[11px] font-semibold text-teal">PRODUCT MARKETING LEAD</p></div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Experience</p>
          <p className="mt-2 text-xs font-bold text-zinc-800">Growth Marketing Manager</p>
          <p className="mt-2 text-[11px] leading-5 text-zinc-600">Led positioning and launch programs across four markets, contributing to a 31% increase in qualified pipeline.</p>
          <div className="mt-5 flex flex-wrap gap-2">{["Go-to-market", "Positioning", "Analytics", "Research"].map((skill) => <span key={skill} className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal">{skill}</span>)}</div>
        </div>
      </div>
    </WindowShell>
  )
}

function JobMatchPreview() {
  const rows = [
    ["Go-to-market strategy", "Supported", "text-emerald-700 bg-emerald-50"],
    ["B2B SaaS positioning", "Partial evidence", "text-gold-700 bg-gold-50"],
    ["SQL reporting", "Missing proof", "text-rose-700 bg-rose-50"],
    ["Stakeholder leadership", "Supported", "text-emerald-700 bg-emerald-50"],
  ]
  return (
    <WindowShell title="Job description evidence match">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-zinc-400">Target role</p><p className="font-bold text-zinc-900">Senior Product Marketing Manager</p></div><div className="w-fit rounded-xl bg-teal px-4 py-2 text-sm font-bold text-white">72% evidence match</div></div>
        <div className="mt-4 divide-y divide-zinc-100">{rows.map(([requirement, status, style]) => <div key={requirement} className="flex items-center justify-between gap-3 py-3"><span className="text-xs font-medium text-zinc-700">{requirement}</span><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${style}`}>{status}</span></div>)}</div>
      </div>
    </WindowShell>
  )
}

function LinkedInPreview() {
  return (
    <WindowShell title="LinkedIn positioning review">
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-4 border-b border-zinc-100 pb-5"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal text-sm font-extrabold text-white">HA</div><div><p className="font-bold text-zinc-900">Hassan Ahmed</p><p className="mt-1 text-xs text-zinc-500">Operations leader | Multi-site growth | Process improvement</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{[["Search relevance", "78"], ["Credibility", "83"], ["Conversion clarity", "64"]].map(([label, score]) => <div key={label} className="border-t-2 border-teal bg-zinc-50 p-3"><p className="text-2xl font-extrabold text-zinc-900">{score}</p><p className="mt-1 text-[10px] font-semibold text-zinc-500">{label}</p></div>)}</div>
        <div className="mt-4 rounded-xl border border-zinc-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gold">Recommended headline direction</p><p className="mt-2 text-xs leading-5 text-zinc-700">Operations leader scaling multi-site teams through measurable process improvement and service reliability.</p></div>
      </div>
    </WindowShell>
  )
}

function ContentPreview() {
  return (
    <WindowShell title="Voice-aware content studio">
      <div className="grid min-h-[330px] sm:grid-cols-[0.34fr_0.66fr]">
        <div className="border-b border-zinc-100 bg-[#073f3b] p-4 text-white sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Content system</p>
          {[[ComposeIcon, "Draft"], [BrainIcon, "Improve"], [CalendarIcon, "Schedule"], [AnalyticsIcon, "Analyze"]].map(([Icon, label], index) => {
            const ItemIcon = Icon as typeof ComposeIcon
            return <div key={label as string} className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${index === 0 ? "bg-white text-teal" : "text-white/65"}`}><ItemIcon className="h-4 w-4" />{label as string}</div>
          })}
        </div>
        <div className="p-5 sm:p-6"><div className="flex items-center justify-between"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal">Voice profile active</span><span className="text-[10px] text-zinc-400">Draft 3</span></div><p className="mt-5 text-sm font-bold leading-6 text-zinc-900">The career advice I stopped giving after interviewing 47 product candidates.</p><p className="mt-3 text-xs leading-6 text-zinc-600">Most candidates do not have a skills problem. They have an evidence problem. Their resume lists what they know, but the interview never shows where they used it.</p><div className="mt-5 grid grid-cols-3 gap-2">{[["Hook", "84"], ["Clarity", "91"], ["Specificity", "79"]].map(([label, score]) => <div key={label} className="rounded-lg bg-zinc-50 p-2 text-center"><p className="text-sm font-bold text-teal">{score}</p><p className="text-[9px] text-zinc-400">{label}</p></div>)}</div></div>
      </div>
    </WindowShell>
  )
}

function CareerHubPreview() {
  const steps = ["Evidence", "Resume", "LinkedIn", "Applications", "Interview"]
  return (
    <WindowShell title="Career Visibility Hub">
      <div className="p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]"><div className="rounded-2xl bg-[#073f3b] p-5 text-white"><p className="text-xs text-white/55">Target position</p><p className="mt-2 text-xl font-extrabold">Head of Talent Acquisition</p><div className="mt-6 flex items-center gap-2"><GrowthIcon className="h-5 w-5 text-gold" /><span className="text-sm font-semibold">Visibility readiness: 74</span></div></div><div className="rounded-2xl border border-zinc-200 p-5"><p className="text-xs font-bold text-zinc-800">Next best action</p><p className="mt-2 text-xs leading-5 text-zinc-500">Add measurable hiring outcomes to two recent roles before generating the target resume.</p></div></div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">{steps.map((step, index) => <div key={step} className={`rounded-xl border p-3 ${index < 2 ? "border-teal-200 bg-teal-50" : "border-zinc-200 bg-white"}`}><span className="text-[10px] font-bold text-zinc-400">0{index + 1}</span><p className="mt-2 text-[10px] font-semibold text-zinc-700">{step}</p></div>)}</div>
      </div>
    </WindowShell>
  )
}

const previews: Record<CapabilityKey, () => React.ReactNode> = {
  "ats-checker": AtsPreview,
  "resume-builder": ResumePreview,
  "jd-match": JobMatchPreview,
  "linkedin-optimizer": LinkedInPreview,
  "content-studio": ContentPreview,
  "career-hub": CareerHubPreview,
}

export function CapabilityShowcase({
  compact = false,
  headingLevel = 3,
}: {
  compact?: boolean
  /* Rank for the active panel title. The component is used both under a
     section h2 (homepage) and directly under a page h1 (/features), so a
     fixed level skips a rank on one of them. */
  headingLevel?: 2 | 3
}) {
  const PanelHeading = `h${headingLevel}` as "h2" | "h3"
  const [activeKey, setActiveKey] = useState<CapabilityKey>("ats-checker")
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const reducedMotion = useReducedMotion()
  const active = CAPABILITIES.find(({ key }) => key === activeKey) ?? CAPABILITIES[0]
  const Preview = previews[active.key]

  const moveToTab = (index: number) => {
    const boundedIndex = (index + CAPABILITIES.length) % CAPABILITIES.length
    setActiveKey(CAPABILITIES[boundedIndex].key)
    tabRefs.current[boundedIndex]?.focus()
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Partial<Record<string, number>> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: CAPABILITIES.length - 1,
    }
    const targetIndex = moves[event.key]
    if (targetIndex === undefined) return
    event.preventDefault()
    moveToTab(targetIndex)
  }

  return (
    <div className={`mx-auto max-w-[1240px] ${compact ? "px-0" : "px-4 sm:px-6"}`}>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div role="tablist" aria-label="Qalam capabilities" className="flex max-w-full gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {CAPABILITIES.map((item, index) => {
            const Icon = icons[item.key]
            const selected = item.key === active.key
            return (
              <button
                key={item.key}
                id={`capability-tab-${item.key}`}
                ref={(node) => { tabRefs.current[index] = node }}
                role="tab"
                aria-selected={selected}
                aria-controls="capability-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveKey(item.key)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`press flex min-w-[210px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors lg:min-w-0 ${selected ? "border-teal bg-teal text-white shadow-sm" : "border-zinc-200 bg-white text-zinc-700 hover:border-teal-200 hover:bg-teal-50"}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${selected ? "text-gold-100" : "text-teal"}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div id="capability-panel" role="tabpanel" aria-labelledby={`capability-tab-${active.key}`} className="min-w-0 overflow-hidden rounded-[2rem] border border-teal/10 bg-[linear-gradient(145deg,#eef7f6,#fbfaf6)] p-4 sm:p-7 lg:p-9">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.key}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="grid min-w-0 gap-7 xl:grid-cols-[0.78fr_1.22fr] xl:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal">{active.eyebrow}</span><span className="rounded-full border border-gold/30 bg-gold-50 px-2.5 py-1 text-[10px] font-bold text-gold-700">{active.availability}</span></div>
                  <PanelHeading className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-4xl">{active.title}</PanelHeading>
                  <p className="mt-4 max-w-[60ch] text-sm leading-7 text-zinc-600">{active.description}</p>
                  <ul className="mt-5 space-y-3">{active.benefits.map((benefit) => <li key={benefit} className="flex gap-3 text-sm text-zinc-700"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-white"><CheckIcon className="h-3 w-3" /></span><span>{benefit}</span></li>)}</ul>
                  <Link href={active.href} className="press mt-7 inline-flex items-center rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-600">{active.cta}</Link>
                </div>
                <div className="min-w-0"><Preview /></div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
