"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useSpring } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { PricingCard } from "@/components/PricingCard"
import { APP_URL } from "@/lib/seo"
import {
  AnalyticsIcon,
  BrainIcon,
  CalendarIcon,
  CheckIcon,
  GrowthIcon,
  GiftIcon,
  HookIcon,
  LibraryIcon,
  MicroscopeIcon,
  TeamIcon,
  VoiceIcon,
} from "@/components/ui/qalam-icons"
import { PLANS, MANAGED_PLANS, formatPkr, getQuarterlyMonthlyEquivalent } from "@/lib/pricing"
import { SUPPORT_EMAIL } from "@/lib/contact"
import { LIVE_SURFACE, LANDING_FAQ } from "@/lib/marketing-content"
import { CAREER_ADD_ONS } from "@/lib/career-pricing"

function useCountUp(end: number, duration = 1400) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let startTime: number
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, end, duration])

  return { count, ref }
}

const FEATURES = [
  {
    icon: VoiceIcon,
    title: "LinkedIn Positioning + ATS Review",
    desc: "Find the gaps weakening recruiter discovery, credibility, job fit, and the evidence behind your professional story.",
    tier: "Free",
  },
  {
    icon: AnalyticsIcon,
    title: "AI Posts + Carousel Studio",
    desc: "Turn your expertise into scored LinkedIn posts, stronger hooks, carousels, and thoughtful comments.",
    tier: "Free",
  },
  {
    icon: HookIcon,
    title: "Career Vault + Voice Profile",
    desc: "Store verified roles, skills, achievements, goals, and voice context once. Reuse them across every output.",
    tier: "Free",
  },
  {
    icon: LibraryIcon,
    title: "Plan, Publish + Analyze",
    desc: "Move from draft to scheduled LinkedIn post with a library, version history, and performance feedback.",
    tier: "Solo",
  },
  {
    icon: CalendarIcon,
    title: "Voice Training + Push to 90+",
    desc: "Train Qalam on your real writing, then improve weak drafts without flattening the voice that makes them yours.",
    tier: "Pro",
  },
  {
    icon: TeamIcon,
    title: "Strategist + Competitor Research",
    desc: "Ask strategic questions, study content patterns, unlock deeper analytics, and build recruiter visibility.",
    tier: "Pro",
  },
]

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Assess Your Position",
    desc: "Review the profile, proof, content, and career signals shaping how the market understands your value.",
    icon: AnalyticsIcon,
  },
  {
    step: "02",
    title: "Strengthen Your Story",
    desc: "Align LinkedIn copy, content, achievements, and role-specific evidence around one credible position.",
    icon: BrainIcon,
  },
  {
    step: "03",
    title: "Build Career Momentum",
    desc: "Keep improving what the market sees, what you publish, and how clearly you match the opportunities you want.",
    icon: GrowthIcon,
  },
]

const STATUS_META: Record<string, {
  label: string
  dotClass: string
  pillClass: string
  headerClass: string
  borderClass: string
  animate?: boolean
}> = {
  "Live now": {
    label: "Operational",
    dotClass: "bg-emerald-500",
    pillClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    headerClass: "border-emerald-100 bg-emerald-50/40",
    borderClass: "border-emerald-200/70",
    animate: true,
  },
  "Active workflows": {
    label: "Manual",
    dotClass: "bg-gold",
    pillClass: "bg-gold-50 text-gold-700 border border-gold-200",
    headerClass: "border-gold/15 bg-gold/5",
    borderClass: "border-gold/25",
  },
  "Building next": {
    label: "Planned",
    dotClass: "bg-zinc-400",
    pillClass: "bg-zinc-100 text-zinc-500 border border-zinc-200",
    headerClass: "border-zinc-100 bg-zinc-50/60",
    borderClass: "border-zinc-200",
  },
}

type DraftSegment = { text: string; bold?: boolean }
type DraftVariant = { tone: string; segments: DraftSegment[] }

const DRAFT_VARIANTS: DraftVariant[] = [
  {
    tone: "ATS parse",
    segments: [
      { text: "Standard headings and readable chronology are strong.\n\n" },
      { text: "The skills section is visible, but three terms lack evidence in recent experience.\n\n" },
      { text: "Priority: connect each target skill to a credible achievement.", bold: true },
    ],
  },
  {
    tone: "Recruiter read",
    segments: [
      { text: "The target role is clear within six seconds.\n\n" },
      { text: "Recent scope is credible, but the strongest result is buried below routine responsibilities.\n\n" },
      { text: "Priority: lead with scale, ownership, and outcome.", bold: true },
    ],
  },
  {
    tone: "Role fit",
    segments: [
      { text: "Core responsibilities match the target job.\n\n" },
      { text: "Two required tools appear in the skills list without supporting project or work evidence.\n\n" },
      { text: "Priority: prove depth or remove unsupported keywords.", bold: true },
    ],
  },
]

function renderTypedSegments(segments: DraftSegment[], visibleChars: number) {
  let consumed = 0
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < segments.length; i++) {
    if (consumed >= visibleChars) break
    const seg = segments[i]
    const slice = seg.text.slice(0, visibleChars - consumed)
    nodes.push(
      seg.bold ? (
        <span key={i} className="font-semibold text-teal">{slice}</span>
      ) : (
        <span key={i}>{slice}</span>
      )
    )
    consumed += seg.text.length
  }
  return nodes
}

function useTypedDraft(variants: DraftVariant[], charDelay = 16, holdMs = 2600) {
  const prefersReducedMotion = useReducedMotion()
  const [variantIndex, setVariantIndex] = useState(0)
  const [visibleChars, setVisibleChars] = useState(0)
  const [phase, setPhase] = useState<"typing" | "holding">(prefersReducedMotion ? "holding" : "typing")

  const fullLength = useMemo(
    () => variants[variantIndex].segments.reduce((sum, s) => sum + s.text.length, 0),
    [variants, variantIndex]
  )

  useEffect(() => {
    if (prefersReducedMotion || phase !== "typing") return
    let raf: number
    let start: number | null = null
    const step = (now: number) => {
      if (start === null) start = now
      const elapsed = now - start
      const count = Math.min(fullLength, Math.floor(elapsed / charDelay))
      setVisibleChars(count)
      if (count < fullLength) {
        raf = requestAnimationFrame(step)
      } else {
        setPhase("holding")
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase, variantIndex, fullLength, charDelay, prefersReducedMotion])

  useEffect(() => {
    if (prefersReducedMotion || phase !== "holding") return
    const t = setTimeout(() => {
      setVariantIndex((i) => (i + 1) % variants.length)
      setPhase("typing")
    }, holdMs)
    return () => clearTimeout(t)
  }, [phase, holdMs, variants.length, prefersReducedMotion])

  return {
    variant: variants[variantIndex],
    variantIndex,
    visibleChars: prefersReducedMotion ? fullLength : visibleChars,
    isTyping: phase === "typing" && !prefersReducedMotion,
  }
}

function ProductMockup() {
  const { variant, variantIndex, visibleChars, isTyping } = useTypedDraft(DRAFT_VARIANTS)

  return (
    <div className="relative" style={{ perspective: "1200px" }}>
      <motion.div
        initial={{ opacity: 0, rotateX: 8, rotateY: -8, y: 30 }}
        animate={{ opacity: 1, rotateX: 4, rotateY: -4, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        style={{ transformStyle: "preserve-3d" }}
        whileHover={{ rotateX: 2, rotateY: -2, y: -4, transition: { duration: 0.4 } }}
        className="w-full max-w-[430px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b221f] shadow-[0_32px_80px_rgba(13,74,69,0.45)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-gold/15">
              <div className="h-2 w-2 rounded-full bg-gold" />
            </div>
            <span className="text-sm font-semibold text-white/90">Qalam · ATS Review Preview</span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-white/15" />
            <div className="h-3 w-3 rounded-full bg-white/15" />
            <div className="h-3 w-3 rounded-full bg-white/15" />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-2 pt-4">
          {DRAFT_VARIANTS.map((v, i) => (
            <span
              key={v.tone}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-300 ${
                i === variantIndex ? "border-gold bg-gold text-white" : "border-white/15 text-white/55"
              }`}
            >
              {v.tone}
            </span>
          ))}
        </div>

        <div className="mx-5 mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
              SC
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-900">Sample resume review</p>
              <p className="text-xs text-zinc-400">Recruiter and ATS decision lens</p>
            </div>
          </div>
          <p className="min-h-[104px] whitespace-pre-line text-xs leading-relaxed text-zinc-700">
            {renderTypedSegments(variant.segments, visibleChars)}
            {isTyping && <span className="ml-0.5 inline-block h-3 w-[2px] -mb-0.5 animate-pulse bg-teal align-middle" />}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
            <span className="rounded-lg bg-zinc-50 px-2 py-1">ATS parsing 84</span>
            <span className="rounded-lg bg-zinc-50 px-2 py-1">Role alignment 76</span>
            <span className="rounded-lg bg-zinc-50 px-2 py-1">Evidence 62</span>
            <span className="rounded-lg bg-zinc-50 px-2 py-1">Clarity 81</span>
          </div>
        </div>

        <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-3 py-2">
          <MicroscopeIcon className="h-4 w-4 text-gold" />
          <span className="text-xs font-medium text-white/85">High priority: prove achievement scale and outcome</span>
        </div>

        <div className="flex gap-2 px-5 pb-4">
          <div className="flex-1 rounded-xl bg-gold py-2 text-center text-xs font-semibold text-white">Full recruiter report</div>
          <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white/75">Sample score 76</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: [0, -5, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 0.9 },
          scale: { duration: 0.5, delay: 0.9 },
          x: { duration: 0.5, delay: 0.9 },
          y: { duration: 3.5, delay: 1.4, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute -right-4 top-8 hidden rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-xl sm:block"
      >
        <p className="text-xs font-medium text-zinc-500">Public checker</p>
        <p className="text-xl font-bold text-teal">Free. No sign-in.</p>
        <p className="text-xs font-medium text-zinc-500">One full resume monthly after sign-in</p>
      </motion.div>
    </div>
  )
}

function VoiceStatCard({
  label,
  end,
  suffix,
  title,
  desc,
  index,
}: {
  label: string
  end: number
  suffix: string
  title: string
  desc: string
  index: number
}) {
  const { count, ref } = useCountUp(end, 1200 + index * 200)

  return (
    <FadeUp delay={index * 0.12}>
      <motion.div
        whileHover={{ y: -4, borderColor: "#C9871F40", transition: { duration: 0.2 } }}
        className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-full border border-teal/20 bg-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">
            {label}
          </span>
        </div>
        <p className="mb-2 text-3xl font-bold text-gold">
          <span ref={ref}>{count}</span>
          {suffix}
        </p>
        <h3 className="mb-3 text-lg font-bold text-zinc-900">{title}</h3>
        <p className="text-sm leading-relaxed text-zinc-600">{desc}</p>
      </motion.div>
    </FadeUp>
  )
}

function VoiceMemoryConnector({ stages }: { stages: { label: string }[] }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 85%", "end 65%"] })
  const pathLength = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.4 })
  const prefersReducedMotion = useReducedMotion()

  return (
    <div ref={sectionRef} className="relative mb-3 hidden h-10 md:block">
      <svg viewBox="0 0 900 40" preserveAspectRatio="none" className="absolute inset-0 h-10 w-full overflow-visible" aria-hidden>
        <line x1="75" y1="20" x2="825" y2="20" stroke="#0D4A4522" strokeWidth="2" />
        <motion.line
          x1="75"
          y1="20"
          x2="825"
          y2="20"
          stroke="#C9871F"
          strokeWidth="2"
          strokeLinecap="round"
          style={prefersReducedMotion ? undefined : { pathLength }}
        />
        {stages.map((stage, i) => {
          const cx = 75 + (i * (825 - 75)) / (stages.length - 1)
          return <circle key={stage.label} cx={cx} cy="20" r="5" className="fill-white" stroke="#C9871F" strokeWidth="2" />
        })}
      </svg>
    </div>
  )
}

function VoiceMemorySection() {
  const stages = [
    {
      label: "Day 1",
      end: 5,
      suffix: " posts",
      title: "Voice Setup",
      desc: "Start with real source posts. Qalam extracts tone, structure, and vocabulary patterns to create the initial profile.",
    },
    {
      label: "Week 2",
      end: 20,
      suffix: "+ posts",
      title: "Active Training",
      desc: "Every approved draft and edit creates better future starting points instead of resetting the system each session.",
    },
    {
      label: "Month 2+",
      end: 100,
      suffix: "+ posts",
      title: "Compounding Memory",
      desc: "Your voice profile, archive, hooks, and outcomes become harder to replace because the system keeps their context attached.",
    },
  ]

  return (
    <section className="bg-transparent px-6 py-28">
      <div className="mx-auto max-w-[1200px]">
        <FadeUp className="mb-16 text-center">
          <span className="chip mb-4 border-teal/30 bg-teal/10 text-teal">Voice Memory</span>
          <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900 sm:text-5xl">
            A voice that gets <span className="text-gold gold-underline">smarter every post</span>
          </h2>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600">
            Most AI tools generate text. Qalam accumulates memory. The more you publish, the more specific the system becomes to you.
          </p>
        </FadeUp>

        <VoiceMemoryConnector stages={stages} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {stages.map((stage, i) => (
            <VoiceStatCard key={stage.label} {...stage} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-transparent px-6 py-24">
      <div className="mx-auto max-w-[760px]">
        <FadeUp className="mb-14 text-center">
          <span className="chip mb-4 border-teal/30 text-teal">FAQ</span>
          <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900">
            Questions we get <span className="text-gold">all the time</span>
          </h2>
          <p className="text-lg text-zinc-600">
            Need something specific?{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-teal underline underline-offset-2">
              Email us
            </a>
          </p>
        </FadeUp>

        <div className="flex flex-col gap-3">
          {LANDING_FAQ.map((item, i) => (
            <FadeUp key={item.q} delay={i * 0.05}>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-colors hover:border-teal/30">
                <button className="flex w-full items-center justify-between px-6 py-4 text-left" onClick={() => setOpen(open === i ? null : i)}>
                  <span className="text-base font-semibold text-zinc-900">{item.q}</span>
                  <motion.span
                    animate={{ rotate: open === i ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300/60 text-lg font-light text-zinc-500"
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-zinc-600">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

const homepageFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
}

const homepageHowToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How Qalam connects LinkedIn authority and career growth",
  description: "A three-step workflow for assessing professional positioning, strengthening career evidence, and building authority.",
  step: HOW_IT_WORKS.map((step, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: step.title,
    text: step.desc,
  })),
}

export default function HomePage() {
  const homepagePlans = PLANS.map((plan) => ({
    ...plan,
    price: formatPkr(plan.quarterlyPkr),
    period: plan.plan === "Free" ? "" : "quarter",
    annualSavings: plan.plan === "Free" ? undefined : `${formatPkr(getQuarterlyMonthlyEquivalent(plan.quarterlyPkr))}/month effective`,
    usdReference: plan.plan === "Free" ? "No payment card required" : "Billed every three months",
  }))

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageHowToSchema).replace(/</g, "\\u003c") }} />

      <section className="relative flex min-h-screen items-center overflow-hidden border-b border-zinc-200 bg-[radial-gradient(circle_at_12%_18%,rgba(13,74,69,0.08),transparent_20%),radial-gradient(circle_at_84%_16%,rgba(201,135,31,0.12),transparent_18%),radial-gradient(circle_at_78%_76%,rgba(13,74,69,0.06),transparent_20%),linear-gradient(to_bottom,#fcfcfa,#f6f5f1)] pb-16 pt-28">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(rgba(13,74,69,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13,74,69,0.06) 1px, transparent 1px)",
            backgroundSize: "54px 54px",
          }}
        />
        <div className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              <span className="chip mb-6 inline-flex border-teal/20 bg-white/80 text-teal shadow-sm backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
                Free ATS resume checker. No account.
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="mb-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl"
            >
              Check your resume
              <br />
              before recruiters do.
              <br />
              <span className="text-gold gold-underline">Fix every avoidable rejection risk.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="mb-8 max-w-xl font-cormorant text-2xl italic leading-relaxed text-zinc-600"
            >
              Get an ATS and recruiter-style review across parsing, job fit, proof, progression, skills, clarity, and professional risk. Free for everyone.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.3 }}
              className="mb-10 flex flex-col gap-3 sm:flex-row"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/free-tools/ats-resume-checker"
                  className="press pulse-gold inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-4 text-base font-semibold text-white shadow-[0_4px_24px_rgba(13,74,69,0.35)] transition-all hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-[0_8px_28px_rgba(13,74,69,0.4)]"
                >
                  Check my resume free
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={`${APP_URL}/login?callbackUrl=/career/resumes`}
                  className="press inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white/75 px-7 py-4 text-base font-semibold text-zinc-700 shadow-sm transition-all hover:border-teal/30 hover:bg-white"
                >
                  Build one free resume monthly
                </Link>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45 }} className="flex items-center gap-2 text-sm text-zinc-600">
              <CheckIcon className="h-4 w-4 shrink-0 text-gold" />
              <span>No sign-in for the checker. Sign in to build and export one full ATS-safe resume every month.</span>
            </motion.div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="border-b border-zinc-100 bg-white px-6 py-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-1 divide-y divide-zinc-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              "Eight recruiter and ATS decision angles",
              "Exact job description matching",
              "No invented skills, metrics, or experience",
            ].map((block) => (
              <div key={block} className="flex items-center justify-center px-6 py-4 text-center text-sm font-medium leading-relaxed text-zinc-700">
                {block}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section id="before-after" className="border-b border-zinc-100 bg-zinc-50 px-6 py-24">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp className="mb-12 text-center">
            <h2 className="mb-3 text-4xl font-bold text-zinc-900 sm:text-5xl">This is what the difference looks like.</h2>
            <p className="mx-auto max-w-2xl text-xl text-zinc-600">Same idea. One written without Qalam. One written with it.</p>
          </FadeUp>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FadeUp delay={0.05}>
              <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                <span className="mb-4 inline-flex self-start rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">Without Qalam</span>
                <p className="flex-1 text-sm italic leading-relaxed text-zinc-500">
                  &ldquo;Excited to share that I&apos;ve recently been reflecting on the importance of communication in the workplace. In today&apos;s fast-paced environment, it&apos;s more crucial than ever to foster open dialogue and ensure all stakeholders feel heard. Proud to be part of an organization that values this. #Leadership #Growth #Communication&rdquo;
                </p>
                <span className="mt-6 inline-flex self-start rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">Sounds like everyone. Remembered by no one.</span>
              </div>
            </FadeUp>
            <FadeUp delay={0.1}>
              <div className="flex h-full flex-col rounded-2xl border border-teal/30 bg-teal-50/40 p-8 shadow-sm">
                <span className="mb-4 inline-flex self-start rounded-full bg-teal px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">With Qalam</span>
                <p className="flex-1 text-sm leading-relaxed text-zinc-700">
                  &ldquo;I once sent a salary offer without checking the currency. Told a candidate PKR when I meant USD. She accepted before I caught it. That mistake cost the company 3x what the role was budgeted for - and cost me 3 months of trust with the CEO. The most expensive HR errors aren&apos;t policy failures. They&apos;re one unconsidered line in an email. I learned to slow down that day.&rdquo;
                </p>
                <span className="mt-6 inline-flex self-start rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">Sounds like you. Gets saved, shared, and remembered.</span>
              </div>
            </FadeUp>
          </div>
          <FadeUp className="mt-10 text-center">
            <p className="text-lg font-semibold text-zinc-700">Qalam doesn&apos;t replace your voice. It finally lets it out.</p>
          </FadeUp>
        </div>
      </section>

      <section className="bg-transparent px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp className="mb-12 text-center">
            <span className="chip mb-4 border-teal/30 bg-teal/10 text-teal">Product truth</span>
            <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900 sm:text-5xl">
              What you can use now, <span className="text-gold gold-underline">and what comes next.</span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600">
              Available tools, controlled workflows, and planned modules stay clearly separated.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {LIVE_SURFACE.map((group, i) => {
              const status = STATUS_META[group.title] ?? STATUS_META["Building next"]
              return (
                <FadeUp key={group.title} delay={i * 0.08}>
                  <div className={`h-full overflow-hidden rounded-2xl border bg-white shadow-sm ${status.borderClass}`}>
                    <div className={`flex items-center justify-between border-b px-7 py-4 ${status.headerClass}`}>
                      <h3 className="text-base font-bold text-zinc-900">{group.title}</h3>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${status.pillClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass} ${status.animate ? "animate-pulse" : ""}`} />
                        {status.label}
                      </span>
                    </div>
                    <ul className="space-y-3 p-7 text-sm leading-relaxed text-zinc-600">
                      {group.items.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${status.dotClass}`} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>

      <section id="features" className="grid-bg px-6 py-28">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp className="mb-16 text-center">
            <span className="chip mb-4 border-teal/30 bg-teal/10 text-teal">Features</span>
            <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900 sm:text-5xl">
              Build authority and career momentum <span className="text-gold gold-underline">in one place.</span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600">
              Start with how the market sees you. Then improve what you publish, how you present your experience, and which roles you target.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon
              return (
                <FadeUp key={feature.title} delay={i * 0.08}>
                  <motion.div whileHover={{ y: -6, boxShadow: "0 20px 48px rgba(13,74,69,0.12)", borderColor: "#C9871F", transition: { duration: 0.22 } }} className="h-full cursor-default rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm transition-colors">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-zinc-900">{feature.title}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${feature.tier === "Free" ? "bg-emerald-50 text-emerald-700" : feature.tier === "Solo" ? "bg-teal-50 text-teal" : "bg-gold-50 text-gold-700"}`}>{feature.tier}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-600">{feature.desc}</p>
                  </motion.div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-100 bg-white px-6 py-24">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <FadeUp>
            <span className="chip border-gold/30 bg-gold-50 text-gold-700">Career toolkit</span>
            <h2 className="mt-5 text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">Go beyond profile checks and resume scores.</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">Prepare the complete application: targeted resumes, cover letters, interview practice, recruiter review, LinkedIn rewrites, and a 90-day career strategy.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`${APP_URL}/login?callbackUrl=/career`} className="rounded-xl bg-teal px-6 py-3.5 text-sm font-bold text-white">Explore Career Hub</Link>
              <Link href="/pricing" className="rounded-xl border border-zinc-300 px-6 py-3.5 text-sm font-bold text-zinc-700">See plans and add-ons</Link>
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/60">
              {CAREER_ADD_ONS.map((item, index) => (
                <div key={item.key} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-200 px-5 py-4 last:border-b-0 sm:px-6">
                  <span className="text-xs font-bold text-zinc-300">0{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">Software-generated inside Qalam</p>
                  </div>
                  <span className="text-sm font-bold text-teal">From {formatPkr(item.price)}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>

        <FadeUp className="mx-auto mt-10 flex max-w-[1200px] flex-col gap-5 rounded-2xl bg-teal-800 px-7 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold"><GiftIcon className="h-5 w-5" /></span>
            <div>
              <h3 className="text-lg font-bold">Refer and Earn is live.</h3>
              <p className="mt-1 text-sm text-white/65">Your referral gets 10% off. You earn 10% commission after confirmed payment.</p>
            </div>
          </div>
          <Link href={`${APP_URL}/login?callbackUrl=/settings/referrals`} className="shrink-0 rounded-xl bg-gold px-5 py-3 text-center text-sm font-bold text-white">Get my referral code</Link>
        </FadeUp>
      </section>

      <VoiceMemorySection />

      <section id="how-it-works" className="grid-bg px-6 py-28">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp className="mb-16 text-center">
            <span className="chip mb-4 border-teal/30 bg-teal/10 text-teal">How It Works</span>
            <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900 sm:text-5xl">
              From scattered experience to <span className="text-gold gold-underline">clear authority</span>
            </h2>
            <p className="mx-auto max-w-xl text-xl text-zinc-600">The system connects professional positioning, content, proof, and target opportunities.</p>
          </FadeUp>

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              style={{ originX: 0 }}
              className="absolute left-[calc(33%+24px)] right-[calc(33%+24px)] top-12 hidden h-px bg-gradient-to-r from-teal-200 via-gold/40 to-teal-200 md:block"
            />
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <FadeUp key={step.step} delay={i * 0.12}>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="relative mb-5">
                      <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-teal/20 bg-white">
                        <Icon className="mb-1 h-6 w-6 text-teal" />
                        <span className="text-xs font-bold text-teal">{step.step}</span>
                      </div>
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-zinc-900">{step.title}</h3>
                    <p className="max-w-[260px] text-sm leading-relaxed text-zinc-600">{step.desc}</p>
                  </div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="border-y border-gold/20 bg-gold/5 px-6 py-20">
        <div className="mx-auto max-w-[760px] text-center">
          <FadeUp>
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-gold">Transparent methodology</span>
            <h2 className="mb-5 mt-2 text-4xl font-bold text-zinc-900 sm:text-5xl">
              A score is useful only when you can see how it was built.
            </h2>
            <p className="mb-8 text-xl leading-relaxed text-zinc-600">
              Qalam separates profile signals, content-quality checks, ATS compatibility, supplied evidence, and strategic recommendations. It does not invent recruiter data or guarantee outcomes.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Link
                href="/methodology/linkedin-authority-score"
                className="inline-flex items-center gap-2 rounded-xl bg-teal px-8 py-4 text-base font-semibold text-white shadow-[0_4px_24px_rgba(13,74,69,0.35)] transition-colors hover:bg-teal-600"
              >
                Read the scoring methodology
              </Link>
            </motion.div>
          </FadeUp>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-lg leading-relaxed text-slate-600">
            Built for professionals who want clearer positioning, stronger proof, and one consistent story across LinkedIn, content, and resumes. Questions? Reach us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-teal underline underline-offset-2">{SUPPORT_EMAIL}</a>
          </p>
        </div>
      </section>

      <section id="pricing" className="grid-bg px-6 py-28">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp className="mb-14 text-center">
            <span className="chip mb-4 border-teal/30 bg-teal/10 text-teal">Pricing</span>
            <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900 sm:text-5xl">
              Start free. Upgrade when <span className="text-gold gold-underline">the system earns it.</span>
            </h2>
            <p className="mx-auto max-w-xl text-xl text-zinc-600">
              Start free. Paid plans use Pakistan-first quarterly pricing and activate after confirmed payment.
            </p>
          </FadeUp>

          <div className="mx-auto grid max-w-[1100px] grid-cols-1 items-start gap-6 md:grid-cols-3">
            {homepagePlans.map((plan, i) => (
              <FadeUp key={plan.plan} delay={i * 0.1}>
                <PricingCard {...plan} />
              </FadeUp>
            ))}
          </div>

          {/* Managed / agency plans - full detail lives on /pricing, not duplicated here */}
          <FadeUp className="mt-8">
            <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-8 md:flex-row md:items-center">
              <div>
                <h3 className="mb-2 text-xl font-bold text-zinc-700">Want a writer to handle it, or managing content for clients?</h3>
                <p className="max-w-lg text-sm leading-relaxed text-zinc-500">
                  Managed plans start at a discounted {formatPkr(MANAGED_PLANS[0].monthlyPrice)}/mo. Agencies get isolated client workspaces.
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <Link href="/pricing?tab=managed" className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gold-600">
                  See managed plans
                </Link>
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border-2 border-zinc-300 px-6 py-3.5 text-sm font-semibold text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-100">
                  Get in touch
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <FAQSection />

      <section className="relative overflow-hidden bg-teal px-6 py-28">
        <div className="absolute left-[-10%] top-[-30%] h-[500px] w-[500px] rounded-full opacity-25" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-35%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-22" style={{ background: "radial-gradient(circle, rgba(201,135,31,0.35) 0%, transparent 70%)" }} />

        <FadeUp className="relative z-10 mx-auto max-w-[720px] text-center">
          <span className="chip mb-6 inline-flex border-white/20 bg-white/8 text-gold-200">Start building your content advantage</span>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            The thought you&apos;ve been sitting on <span className="text-gold">is already a post.</span>
          </h2>
          <p className="mb-10 font-cormorant text-2xl italic leading-relaxed text-white/78">
            Qalam just finishes it.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link href={`${APP_URL}/login`} className="inline-flex items-center gap-2 rounded-xl bg-gold px-8 py-4 text-lg font-bold text-white shadow-lg transition-colors hover:bg-gold-600">
                Start free - 5 posts, no card
              </Link>
            </motion.div>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border-2 border-white/35 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10">
              Compare Plans
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/62">Start with practical recommendations. Upgrade when you need more capacity.</p>
        </FadeUp>
      </section>
    </>
  )
}
