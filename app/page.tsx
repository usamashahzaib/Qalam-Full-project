"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, useInView, useScroll, useSpring } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { CapabilityShowcase } from "@/components/marketing/CapabilityShowcase"
import { HeroChecker } from "@/components/home/HeroChecker"
import { InteractiveQalamGuide } from "@/components/home/InteractiveQalamGuide"
import { FaqAccordion } from "@/components/home/FaqAccordion"
import { PricingCard } from "@/components/PricingCard"
import { resolvePublicHref } from "@/lib/seo"
import {
  AnalyticsIcon,
  BrainIcon,
  GrowthIcon,
} from "@/components/ui/qalam-icons"
import { PLANS, MANAGED_PLANS, formatPkr, getQuarterlyMonthlyEquivalent } from "@/lib/pricing"
import { SUPPORT_EMAIL } from "@/lib/contact"
import { LANDING_FAQ } from "@/lib/marketing-content"
import { CAREER_ADD_ONS, CAREER_PACKS } from "@/lib/career-pricing"
import { trackMarketingEvent } from "@/lib/marketing-events"

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
          style={{ pathLength }}
          className="motion-reduce:hidden"
        />
        <line
          x1="75"
          y1="20"
          x2="825"
          y2="20"
          stroke="#C9871F"
          strokeWidth="2"
          strokeLinecap="round"
          className="hidden motion-reduce:block"
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
            <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center align-middle text-teal underline underline-offset-2">
              Email us
            </a>
          </p>
        </FadeUp>

        <FaqAccordion items={LANDING_FAQ} />
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
  useEffect(() => {
    trackMarketingEvent("homepage_view")
  }, [])

  const homepagePlans = PLANS.map((plan) => ({
    ...plan,
    features: plan.features.slice(0, 5),
    href: resolvePublicHref(plan.href),
    price: formatPkr(plan.quarterlyPkr),
    period: plan.plan === "Free" ? "" : "quarter",
    annualSavings: plan.plan === "Free" ? undefined : `${formatPkr(getQuarterlyMonthlyEquivalent(plan.quarterlyPkr))}/month effective`,
    usdReference: plan.plan === "Free" ? "No payment card required" : "Billed every three months",
  }))

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageHowToSchema).replace(/</g, "\\u003c") }} />

      <section className="relative flex min-h-screen items-center overflow-hidden bg-[#f7f3ea] pb-20 pt-36 text-teal">
        <div className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-[#dce9df]/75 blur-3xl" aria-hidden />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-[#f0ddb9]/65 blur-3xl" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal/15 to-transparent" aria-hidden />

        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-8 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(430px,0.84fr)] lg:gap-12">
          <div className="max-w-[650px]">
            <div>
              <span className="chip mb-7 border-teal/15 bg-white/55 text-teal shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-gold" />
                One professional story. Built from real evidence.
              </span>
            </div>

            <h1
              className="text-[clamp(3.25rem,7vw,6.2rem)] font-extrabold leading-[0.95] tracking-[-0.055em] text-teal"
            >
              Turn experience into
              <br />
              {" "}
              <span className="font-cormorant font-semibold italic tracking-[-0.035em] text-gold-700">visible proof.</span>
            </h1>

            <p
              className="mt-7 max-w-[590px] font-cormorant text-2xl font-medium leading-relaxed text-teal/75 sm:text-3xl"
            >
              Be easier to trust, shortlist, and remember.
            </p>

            <p
              className="mt-5 max-w-xl text-base leading-7 text-zinc-600 sm:text-lg"
            >
              Qalam turns the experience you already have into ATS-ready resumes, clearer LinkedIn positioning, and voice-aware content without inventing a single achievement.
            </p>

            <div
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href={resolvePublicHref("/signup")}
                onClick={() => trackMarketingEvent("homepage_primary_cta_click", { placement: "hero" })}
                className="press inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(13,74,69,0.2)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-[0_16px_34px_rgba(13,74,69,0.24)]"
              >
                Build my professional story free
              </Link>
              <Link
                href="#free-resume-check"
                onClick={() => trackMarketingEvent("resume_check_start", { placement: "hero", method: "anchor" })}
                className="press inline-flex min-h-12 items-center justify-center rounded-xl border border-teal/20 bg-white/60 px-7 py-3.5 text-sm font-semibold text-teal transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-teal/35 hover:bg-white"
              >
                Check my resume free
              </Link>
            </div>

            <div
              className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold uppercase tracking-[0.12em] text-teal/80"
            >
              <span>No payment card</span>
              <span>No automatic posting</span>
              <span>No invented experience</span>
            </div>
          </div>

          <InteractiveQalamGuide />
        </div>
      </section>

      <section id="free-resume-check" className="bg-[#f7f3ea] px-6 pb-24 pt-6">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 rounded-[2rem] border border-teal/10 bg-[#e8f0eb] p-6 shadow-[0_18px_60px_rgba(13,74,69,0.08)] sm:p-10 lg:grid-cols-[0.82fr_1.18fr] lg:p-12">
          <div className="max-w-md">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Start with something useful</span>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-teal sm:text-4xl">
              See what recruiters and ATS systems see first.
            </h2>
            <p className="mt-5 text-base leading-7 text-zinc-600">
              Drop in your resume for an immediate structural read. No account, no invented claims, and nothing stored.
            </p>
            <Link href="/free-tools/ats-resume-checker" onClick={() => trackMarketingEvent("resume_check_start", { placement: "inline_checker", method: "full_checker_link" })} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-teal underline decoration-gold/60 decoration-2 underline-offset-4">
              Open the full free checker
            </Link>
          </div>

          <div className="qlx rounded-[1.5rem] bg-[#123f3b] p-4 shadow-[0_20px_50px_rgba(13,74,69,0.18)] sm:p-7">
            <HeroChecker />
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="border-b border-zinc-100 bg-white px-6 py-8">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-1 divide-y divide-zinc-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              "Start with a useful result before creating an account",
              "Keep resumes, LinkedIn, and content aligned to the same evidence",
              "Nothing posts until you explicitly approve it",
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
            <span className="chip mb-4 border-gold/25 bg-gold-50 text-gold-700">Illustrative transformation</span>
            <h2 className="mb-3 text-4xl font-bold text-zinc-900 sm:text-5xl">This is what the difference looks like.</h2>
            <p className="mx-auto max-w-2xl text-xl text-zinc-600">The same supplied experience, first as generic copy and then as a specific, evidence-led story.</p>
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
                  &ldquo;Our weekly project review used to take 90 minutes and still end without clear owners. I replaced the slide deck with three questions: what changed, what is blocked, and who decides next. Within a month, the meeting was down to 35 minutes and every action had an owner. Better communication is not more talking. It is making the next decision obvious.&rdquo;
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

      <section id="features" className="grid-bg px-6 py-28">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp className="mb-12 text-center">
            <span className="chip mb-4 border-teal/30 bg-teal/10 text-teal">Features</span>
            <h2 className="mb-4 mt-3 text-4xl font-bold text-zinc-900 sm:text-5xl">
              See every major workflow <span className="text-gold gold-underline">before you sign in.</span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600">
              Explore the real decisions Qalam helps you make across ATS resumes, target roles, LinkedIn positioning, content, and career progress.
            </p>
          </FadeUp>
          <CapabilityShowcase compact />
          <div className="mt-8 text-center">
            <Link href="/features" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal/25 bg-white px-6 text-sm font-bold text-teal transition-colors hover:bg-teal/5">
              Explore all features and methods
            </Link>
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
              <Link href={resolvePublicHref("/login?callbackUrl=/career")} className="rounded-xl bg-teal px-6 py-3.5 text-sm font-bold text-white">Explore Career Hub</Link>
              <Link href="/pricing" className="rounded-xl border border-zinc-300 px-6 py-3.5 text-sm font-bold text-zinc-700">See plans and add-ons</Link>
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/60">
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 bg-zinc-900 px-5 py-5 text-white sm:px-6">
                <span className="text-xs font-bold text-gold-200">TOP</span>
                <div><p className="text-sm font-bold">Job-Win Pack</p><p className="mt-0.5 text-xs text-white/55">Review, resume, cover letter, and interview practice</p></div>
                <span className="text-sm font-bold text-gold-200">{formatPkr(CAREER_PACKS.find(({ key }) => key === "job_win_pack")!.price)}</span>
              </div>
              {CAREER_ADD_ONS.map((item, index) => (
                <div key={item.key} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-200 px-5 py-4 last:border-b-0 sm:px-6">
                  <span className="text-xs font-bold text-zinc-400">0{index + 1}</span>
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
            <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-gold-700">Transparent methodology</span>
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
            <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center align-middle text-teal underline underline-offset-2">{SUPPORT_EMAIL}</a>
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

          <div className="mt-8 text-center">
            <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-xl border border-teal/20 bg-white px-5 text-sm font-semibold text-teal transition-colors hover:border-teal/40 hover:bg-teal/5">
              Compare every plan feature
            </Link>
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
                <Link href="/pricing?tab=managed" className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-semibold text-teal-900 transition-colors hover:bg-gold-600">
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

      <section data-nav-ground="dark" className="qlx qlx-surface relative overflow-hidden px-6 py-28">
        <div className="qlx-grain" aria-hidden />
        <div className="absolute left-[-10%] top-[-30%] h-[500px] w-[500px] rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.4 0.05 196 / 0.5) 0%, transparent 70%)" }} aria-hidden />
        <div className="absolute bottom-[-35%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, oklch(0.85 0.05 85 / 0.4) 0%, transparent 70%)" }} aria-hidden />

        <FadeUp className="relative z-10 mx-auto max-w-[720px] text-center">
          <span className="chip mb-6 inline-flex border-white/15 bg-white/8 text-white/85">Your experience already contains the proof</span>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            Make your professional story <span style={{ color: "oklch(0.85 0.05 85)" }}>easier to trust.</span>
          </h2>
          <p className="mb-10 font-cormorant text-2xl italic leading-relaxed text-white/78">
            One evidence base for your resume, LinkedIn, and content.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link href={resolvePublicHref("/login")} onClick={() => trackMarketingEvent("homepage_primary_cta_click", { placement: "final_cta" })} className="qlx-champagne-btn inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold">
                Build my professional story free
              </Link>
            </motion.div>
            <Link href="#free-resume-check" onClick={() => trackMarketingEvent("resume_check_start", { placement: "final_cta", method: "anchor" })} className="inline-flex items-center gap-2 rounded-xl border-2 border-white/25 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10">
              Check my resume free
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/55">No payment card. No automatic posting. No invented achievements.</p>
        </FadeUp>
      </section>
    </>
  )
}
