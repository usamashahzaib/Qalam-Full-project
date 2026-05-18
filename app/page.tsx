"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useInView } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { PricingCard } from "@/components/PricingCard"
import {
  AnalyticsIcon,
  BrainIcon,
  CalendarIcon,
  CheckIcon,
  ComposeIcon,
  GrowthIcon,
  HookIcon,
  LibraryIcon,
  TeamIcon,
  VoiceIcon,
} from "@/components/ui/qalam-icons"
import { formatLocalizedPrice, formatUsdPrice, type PricingCurrency, USD_PRICING_CURRENCY } from "@/lib/geo-pricing"
import { PLANS } from "@/lib/pricing"

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

const NICHES = [
  "Founders",
  "HR Leaders",
  "SaaS Marketers",
  "Recruiters",
  "Consultants",
  "Agency Owners",
  "Product Leaders",
  "Sales Teams",
]

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
    title: "Agency Workflow Preview",
    desc: "Current agency surfaces live in the product, while role controls, client isolation, and approvals are still being hardened.",
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

const LIVE_SURFACE = [
  {
    title: "Live now",
    items: [
      "LinkedIn-first auth",
      "Writer, archive, calendar, analytics, voice settings",
      "Free public tools",
      "Custom session plus LinkedIn OAuth path",
    ],
  },
  {
    title: "Guided rollout",
    items: [
      "Paid onboarding",
      "Team pilots",
      "Agency setup",
      "Commercial migration support",
    ],
  },
  {
    title: "Still hardening",
    items: [
      "Billing automation",
      "Client isolation",
      "Approval workflow",
      "Broad self-serve collaboration",
    ],
  },
]

const FAQ_ITEMS = [
  {
    q: "How does the Voice Profile actually learn my writing?",
    a: "You provide real LinkedIn posts you have written. Qalam extracts tone, structure, and vocabulary patterns from those examples. Every draft you approve and every edit you keep then improves future starting points.",
  },
  {
    q: "What happens to my archive if I stop using the product?",
    a: "The current product keeps drafts, saved items, and voice settings in your workspace. Commercial retention policy should be treated as an operational detail, not assumed from generic SaaS copy.",
  },
  {
    q: "How is this different from just using ChatGPT?",
    a: "ChatGPT resets every session. Qalam keeps approved examples, editing history, hook archive, and workspace continuity so each session starts closer to your actual voice instead of from scratch.",
  },
  {
    q: "Who is Team for today?",
    a: "Team is the guided path for internal operators who want shared workflow evaluation before broader collaboration hardening is complete.",
  },
  {
    q: "Who is Agency for today?",
    a: "Agency is the guided path for multi-client operators who want the current workspace preview while isolation and approval controls are still being hardened.",
  },
  {
    q: "Does Qalam work for any niche?",
    a: "Yes, when the writer brings real source material from that niche. The system performs best when it learns from authentic examples instead of generic prompts.",
  },
]

function ProductMockup() {
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
          {["Witty", "Professional", "Bold"].map((tone, i) => (
            <span
              key={tone}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                i === 0 ? "border-gold bg-gold text-white" : "border-white/15 text-white/55"
              }`}
            >
              {tone}
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
              <p className="text-[10px] text-zinc-400">Live surface preview</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-zinc-700">
            I spent three years testing LinkedIn advice that looked smart but produced nothing durable.
            <br />
            <br />
            What changed was not another prompt.
            <br />
            <br />
            <span className="font-semibold text-teal">
              It was the system that remembered what I kept, what I edited, and what I wanted the next draft to inherit.
            </span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-[10px] text-zinc-500">
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
        className="absolute -right-4 top-8 rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-xl"
      >
        <p className="text-[10px] font-medium text-zinc-500">Current truth</p>
        <p className="text-xl font-bold text-teal">Live app</p>
        <p className="text-[10px] font-medium text-zinc-500">with guided commercial rollout</p>
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
  showConnector,
}: {
  label: string
  end: number
  suffix: string
  title: string
  desc: string
  index: number
  showConnector: boolean
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
          {showConnector && <div className="h-px flex-1 bg-gradient-to-r from-teal/20 to-transparent" />}
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {stages.map((stage, i) => (
            <VoiceStatCard key={stage.label} {...stage} index={i} showConnector={i < 2} />
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
            <a href="mailto:hello@byqalam.com" className="text-teal underline underline-offset-2">
              Email us
            </a>
          </p>
        </FadeUp>

        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => (
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
  mainEntity: FAQ_ITEMS.map((item) => ({
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
  const [pricingCurrency, setPricingCurrency] = useState<PricingCurrency>(USD_PRICING_CURRENCY)

  useEffect(() => {
    let active = true

    fetch("/api/geo/pricing-currency", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((currency) => {
        if (active && currency?.currencyCode && currency?.locale) setPricingCurrency(currency as PricingCurrency)
      })
      .catch(() => null)

    return () => {
      active = false
    }
  }, [])

  const homepagePlans = PLANS.slice(0, 3).map((plan) => ({
    ...plan,
    price: formatLocalizedPrice(plan.monthlyUsd, pricingCurrency),
    usdReference: formatUsdPrice(plan.monthlyUsd),
  }))
  const agencyPlan = {
    ...PLANS[3],
    price: formatLocalizedPrice(PLANS[3].monthlyUsd, pricingCurrency),
    usdReference: formatUsdPrice(PLANS[3].monthlyUsd),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageHowToSchema) }} />

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
                Live product, strict product truth
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="mb-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl"
            >
              Write in your voice.
              <br />
              Build real authority.
              <br />
              <span className="text-gold gold-underline">Compound every post.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="mb-8 max-w-xl font-cormorant text-2xl italic leading-relaxed text-zinc-600"
            >
              Qalam learns your voice from real posts and retained edits. The public site now says exactly what is live, what is guided, and what is still hardening.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.3 }}
              className="mb-10 flex flex-col gap-3 sm:flex-row"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/auth/sign-up"
                  className="pulse-gold inline-flex items-center gap-2 rounded-xl bg-teal px-7 py-4 text-base font-semibold text-white shadow-[0_4px_24px_rgba(13,74,69,0.35)] transition-colors hover:bg-teal-600"
                >
                  Start with LinkedIn
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white/75 px-7 py-4 text-base font-semibold text-zinc-700 shadow-sm transition-all hover:border-teal/30 hover:bg-white"
                >
                  Try the Demo
                </Link>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45 }} className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {["No credit card required", "Drafts and edits stay in your archive", "LinkedIn-first auth is the active path"].map((item) => (
                <span key={item} className="flex items-center gap-2 text-sm text-zinc-600">
                  <CheckIcon className="h-4 w-4 text-gold" />
                  {item}
                </span>
              ))}
            </motion.div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ProductMockup />
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-y border-zinc-200 bg-white py-8">
        <div className="mx-auto mb-4 max-w-[1200px] px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Built for professionals who take LinkedIn seriously</p>
        </div>
        <div className="overflow-hidden">
          <div className="marquee-track">
            {NICHES.concat(NICHES).map((name, i) => (
              <span key={`${name}-${i}`} className="shrink-0 px-10 text-lg font-semibold text-zinc-500 opacity-60 transition-opacity hover:opacity-100">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-10">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-base leading-relaxed text-zinc-500">
            <strong className="font-semibold text-zinc-800">Qalam</strong> is an AI LinkedIn writing system that learns your voice from real posts and edits. Unlike session-reset generators, it keeps approved drafts, outcomes, and hook archives in one place so each session starts closer to your actual writing instead of from scratch.
          </p>
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
            {LIVE_SURFACE.map((group, i) => (
              <FadeUp key={group.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
                  <h3 className="mb-4 text-xl font-bold text-zinc-900">{group.title}</h3>
                  <ul className="space-y-3 text-sm leading-relaxed text-zinc-600">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-gold" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>
            ))}
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

      <section id="pricing" className="grid-bg px-6 py-28">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp className="mb-14 text-center">
            <span className="chip mb-4 border-teal/30 bg-teal/10 text-teal">Pricing</span>
            <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900 sm:text-5xl">
              Start free. Upgrade when <span className="text-gold gold-underline">the system earns it.</span>
            </h2>
            <p className="mx-auto max-w-xl text-xl text-zinc-600">
              Free is live now. Paid plans are currently guided onboarding paths, not automated checkout products.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
            {homepagePlans.map((plan, i) => (
              <FadeUp key={plan.plan} delay={i * 0.1}>
                <PricingCard {...plan} />
              </FadeUp>
            ))}
          </div>

          <FadeUp className="mt-8">
            <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-teal/20 bg-teal-800/5 p-8 md:flex-row md:items-center">
              <div>
                <span className="chip mb-3 inline-flex border-gold/40 bg-gold/5 text-gold">Agency Plan</span>
                <h3 className="mb-2 text-xl font-bold text-zinc-900">Running content for multiple clients?</h3>
                <p className="max-w-lg text-sm leading-relaxed text-zinc-600">
                  {agencyPlan.price}/mo is the local display estimate. Billing source of truth stays {agencyPlan.usdReference} while agency onboarding is still assisted and client isolation/approvals keep hardening.
                </p>
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="shrink-0">
                <Link href={agencyPlan.href} className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600">
                  Discuss Agency Setup
                </Link>
              </motion.div>
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
            Your voice gets smarter <span className="text-gold">every time you write.</span>
          </h2>
          <p className="mb-10 font-cormorant text-2xl italic leading-relaxed text-white/78">
            Used by founders, consultants, and teams that want a publishing workflow with memory instead of another disposable generator.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link href="/auth/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-gold px-8 py-4 text-lg font-bold text-white shadow-lg transition-colors hover:bg-gold-600">
                Start with LinkedIn
              </Link>
            </motion.div>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border-2 border-white/35 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10">
              Compare Plans
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/62">No credit card required to start. Paid onboarding is handled manually today.</p>
        </FadeUp>
      </section>
    </>
  )
}
