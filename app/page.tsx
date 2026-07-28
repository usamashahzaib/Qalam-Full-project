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
  CommentIcon,
  ComposeIcon,
  GrowthIcon,
  HookIcon,
  LibraryIcon,
  TeamIcon,
  VoiceIcon,
} from "@/components/ui/qalam-icons"
import { PLANS, MANAGED_PLANS, formatPkr } from "@/lib/pricing"
import { SUPPORT_EMAIL } from "@/lib/contact"
import { LIVE_SURFACE, LANDING_FAQ } from "@/lib/marketing-content"

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
    title: "Voice Profile",
    desc: "Train Qalam on your real posts so the draft starts closer to your actual tone, rhythm, and vocabulary.",
  },
  {
    icon: AnalyticsIcon,
    title: "Performance Intelligence",
    desc: "Review workspace activity, compare patterns, and keep the signals that should shape the next draft.",
  },
  {
    icon: HookIcon,
    title: "Hook Intelligence",
    desc: "Generate multiple openings, keep the strong ones, and build a reusable archive of proven structures.",
  },
  {
    icon: LibraryIcon,
    title: "Content Capital",
    desc: "Store frameworks, angles, and finished assets in one system instead of losing them across notes and docs.",
  },
  {
    icon: CalendarIcon,
    title: "Post Scheduler",
    desc: "Move from draft to planned publishing without breaking the connection between content, timing, and review.",
  },
  {
    icon: TeamIcon,
    title: "Agency Workflow",
    desc: "Keep client voices, approvals, content, and publishing controls isolated across five workspaces.",
  },
  {
    icon: CommentIcon,
    title: "Comment Generator",
    desc: "Draft sharp, on-voice replies to other people's posts so you stay visible between your own publishing days.",
  },
]

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Start Writing",
    desc: "Turn a topic into a structured post draft with hooks, tone, and revision room in one workflow.",
    icon: ComposeIcon,
  },
  {
    step: "02",
    title: "The System Learns",
    desc: "Approved examples, edits, and outcomes become memory, so Qalam gets closer to the writer over time.",
    icon: BrainIcon,
  },
  {
    step: "03",
    title: "Your Archive Compounds",
    desc: "Drafts, versions, hooks, and results stay attached, so the system becomes more useful the longer it is used.",
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

const SOLO_PLAN = PLANS.find((plan) => plan.plan === "Solo")
const SOLO_MONTHLY_PRICE = SOLO_PLAN ? `${formatPkr(SOLO_PLAN.monthlyPkr)}/month` : "Paid plan"

type DraftSegment = { text: string; bold?: boolean }
type DraftVariant = { tone: string; segments: DraftSegment[] }

const DRAFT_VARIANTS: DraftVariant[] = [
  {
    tone: "Witty",
    segments: [
      { text: "I spent three years testing LinkedIn advice that looked smart but produced nothing durable.\n\n" },
      { text: "What changed was not another prompt.\n\n" },
      { text: "It was the system that remembered what I kept, what I edited, and what I wanted the next draft to inherit.", bold: true },
    ],
  },
  {
    tone: "Professional",
    segments: [
      { text: "Most LinkedIn advice optimizes for the algorithm instead of the reader.\n\n" },
      { text: "We rebuilt the process around one question: would a specific person stop scrolling for this.\n\n" },
      { text: "The result was fewer posts, more replies, and a pipeline that did not depend on going viral.", bold: true },
    ],
  },
  {
    tone: "Bold",
    segments: [
      { text: "Delete your content calendar.\n\n" },
      { text: "Nobody remembers a post that sounded like every other post in their feed that week.\n\n" },
      { text: "Write the one sentence you would actually say out loud, then build the post backward from there.", bold: true },
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
            <span className="text-sm font-semibold text-white/90">Qalam · Workspace Preview</span>
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
              <p className="text-xs font-semibold text-zinc-900">Sample workspace draft</p>
              <p className="text-xs text-zinc-400">Live surface preview</p>
            </div>
          </div>
          <p className="min-h-[104px] whitespace-pre-line text-xs leading-relaxed text-zinc-700">
            {renderTypedSegments(variant.segments, visibleChars)}
            {isTyping && <span className="ml-0.5 inline-block h-3 w-[2px] -mb-0.5 animate-pulse bg-teal align-middle" />}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
            <span className="rounded-lg bg-zinc-50 px-2 py-1">Draft saved</span>
            <span className="rounded-lg bg-zinc-50 px-2 py-1">Voice settings attached</span>
            <span className="rounded-lg bg-zinc-50 px-2 py-1">Archive ready</span>
            <span className="rounded-lg bg-zinc-50 px-2 py-1">Schedule path available</span>
          </div>
        </div>

        <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-3 py-2">
          <VoiceIcon className="h-4 w-4 text-gold" />
          <span className="text-xs font-medium text-white/85">Voice profile attached to current workspace</span>
        </div>

        <div className="flex gap-2 px-5 pb-4">
          <button className="flex-1 rounded-xl bg-gold py-2 text-xs font-semibold text-white">Copy Draft</button>
          <button className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white/75">Save</button>
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
        <p className="text-xs font-medium text-zinc-500">Live product</p>
        <p className="text-xl font-bold text-teal">Free to start</p>
        <p className="text-xs font-medium text-zinc-500">{SOLO_MONTHLY_PRICE} to unlock Solo</p>
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
  name: "How Qalam works: from first post to trained voice",
  description: "A three-step workflow for building a voice-aware LinkedIn publishing system that compounds with every post.",
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
    price: formatPkr(plan.monthlyPkr),
    annualSavings: plan.plan === "Free" ? undefined : `Billed quarterly at ${formatPkr(plan.quarterlyPkr)} - 1 month free`,
    usdReference: plan.plan === "Free" ? "Free forever" : "Pakistan-first pricing",
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
                Live product. Honest status.
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="mb-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl"
            >
              Turn your career
              <br />
              into visible proof.
              <br />
              <span className="text-gold gold-underline">Get found. Build trust. Get shortlisted.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="mb-8 max-w-xl font-cormorant text-2xl italic leading-relaxed text-zinc-600"
            >
              Qalam aligns your LinkedIn profile, content, and ATS resume around one credible professional story - without inventing achievements.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.3 }}
              className="mb-10 flex flex-col gap-3 sm:flex-row"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href={`${APP_URL}/login`}
                  className="press pulse-gold inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-4 text-base font-semibold text-white shadow-[0_4px_24px_rgba(13,74,69,0.35)] transition-all hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-[0_8px_28px_rgba(13,74,69,0.4)]"
                >
                  Start free - no card needed
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="#before-after"
                  className="press inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white/75 px-7 py-4 text-base font-semibold text-zinc-700 shadow-sm transition-all hover:border-teal/30 hover:bg-white"
                >
                  See the difference
                </Link>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45 }} className="flex items-center gap-2 text-sm text-zinc-600">
              <CheckIcon className="h-4 w-4 shrink-0 text-gold" />
              <span>Your drafts are private - no one reads your content. Pay by card and your plan unlocks instantly. Free plan is real - 5 posts a month. No card. No expiry.</span>
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
              "Your drafts are private - No one at Qalam reads your content. Ever.",
              "Card checkout unlocks your plan instantly. JazzCash and Easypaisa accepted on request.",
              "Free plan is real - 5 posts a month. No card. No expiry. No trick.",
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
            <span className="chip mb-4 border-teal/30 bg-teal/10 text-teal">Current Product Surface</span>
            <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900 sm:text-5xl">
              Serious product, <span className="text-gold gold-underline">strictly stated.</span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600">
              This is the public truth layer: what is live, what is handled manually, and what is still in rollout.
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
              You are not just using a tool. <span className="text-gold gold-underline">You are building an asset.</span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600">
              Every post trains your voice, feeds your archive, and makes the next session more useful than the last one.
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
                    <h3 className="mb-2 text-lg font-bold text-zinc-900">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-zinc-600">{feature.desc}</p>
                  </motion.div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>

      <VoiceMemorySection />

      <section id="how-it-works" className="grid-bg px-6 py-28">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp className="mb-16 text-center">
            <span className="chip mb-4 border-teal/30 bg-teal/10 text-teal">How It Works</span>
            <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900 sm:text-5xl">
              From first post to <span className="text-gold gold-underline">full intelligence</span>
            </h2>
            <p className="mx-auto max-w-xl text-xl text-zinc-600">The system keeps context instead of starting over every time you need a draft.</p>
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

      {/* Personal onboarding offer */}
      <section className="border-y border-gold/20 bg-gold/5 px-6 py-20">
        <div className="mx-auto max-w-[760px] text-center">
          <FadeUp>
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-gold">New Users</span>
            <h2 className="mb-5 mt-2 text-4xl font-bold text-zinc-900 sm:text-5xl">
              Something no paid plan includes.
            </h2>
            <p className="mb-8 text-xl leading-relaxed text-zinc-600">
              New users get guided onboarding from the Qalam team. 20 minutes. We set up your voice profile with you and draft your first three posts together.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Link
                href={`${APP_URL}/login`}
                className="inline-flex items-center gap-2 rounded-xl bg-teal px-8 py-4 text-base font-semibold text-white shadow-[0_4px_24px_rgba(13,74,69,0.35)] transition-colors hover:bg-teal-600"
              >
                Get started - it&apos;s free to start
              </Link>
            </motion.div>
            <p className="mt-4 text-sm text-zinc-400">Guided onboarding is offered manually by the Qalam team.</p>
          </FadeUp>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-lg leading-relaxed text-slate-600">
            Built for people who post with intention. Qalam helps you show up consistently - without sounding like everyone else. Questions? Reach us at info@byqalam.com
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
              Free is live now. Paid plans use PKR-first pricing and unlock the moment card payment clears.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
                  Managed plans start at {formatPkr(MANAGED_PLANS[0].monthlyPrice)}/mo, and agencies get isolated client workspaces.
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
          <p className="mt-5 text-sm text-white/62">No credit card required. No expiry. Your content stays in your workspace.</p>
        </FadeUp>
      </section>
    </>
  )
}
