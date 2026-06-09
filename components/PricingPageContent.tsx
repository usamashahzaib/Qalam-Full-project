"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { PricingCard } from "@/components/PricingCard"
import { ArchiveIcon, ShieldIcon, VoiceIcon } from "@/components/ui/qalam-icons"
import { COMPARISON_ROWS, PLANS, annualFraming, annualSavingsPercent, formatPkr } from "@/lib/pricing"
import { UPGRADES_EMAIL } from "@/lib/contact"

const PRICING_FAQ = [
  {
    q: "Is there a free plan?",
    a: "Yes. Free is live with no time limit - 10 AI drafts per month, no scheduling, no voice training, no analytics, and no carousels.",
  },
  {
    q: "How much does Qalam cost?",
    a: "Solo starts at PKR 899/month with 25 drafts. Pro is PKR 1,899/month with 60 drafts, 10 carousels, and voice training. Agency is PKR 7,490/month and coming soon. Annual billing gives 4 months free.",
  },
  {
    q: "What's the difference between monthly and annual billing?",
    a: "Annual Solo is PKR 599/mo (save PKR 3,596), Pro is PKR 1,266/mo (save PKR 7,596), and Agency is PKR 4,993/mo. Each annual plan includes 4 months free.",
  },
  {
    q: "What does Pro include that Solo doesn't?",
    a: "Pro adds carousel generation (10/month), voice training so Qalam learns your tone, Push to 90+ quality improvement, AI Strategist, and analytics.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Paid plans can be cancelled - your workspace and drafts stay accessible on the Free tier. You never lose your content history.",
  },
  {
    q: "Is Qalam actually worth it compared to hiring a ghostwriter?",
    a: "A LinkedIn ghostwriter in Pakistan runs PKR 20,000-80,000/month. Qalam gives you AI writing infrastructure, scheduling, scoring, and workflow from PKR 899/month.",
  },
]

type PricingPageContentProps = {
  pricingCurrency?: { currencyCode?: string; label?: string }
}

export function PricingPageContent({}: PricingPageContentProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const displayPlans = PLANS.map((plan) => {
    const noteOverride =
      plan.plan === "Free"
        ? "Real free. Not a 7-day trial disguised as a free plan."
        : plan.plan === "Solo"
          ? "This is the plan most people upgrade to after their first week."
          : undefined

    return {
      ...plan,
      description: plan.description,
      note: noteOverride,
      price: formatPkr(plan.monthlyPkr),
      annualSavings: plan.annualPkrPerMonth && (plan.monthlyPkr ?? 0) > 0 ? `Annual ${formatPkr(plan.annualPkrPerMonth)}/mo - ${annualFraming}` : undefined,
      usdReference: plan.annualPkrPerMonth && (plan.monthlyPkr ?? 0) > 0 ? `Save ${annualSavingsPercent}%` : "Free forever",
    }
  })

  const soloPlan = PLANS.find((plan) => plan.plan === "Solo")
  const maxAnnualSave = annualFraming

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">

      {/* Urgency / early-access banner */}
      <div className="bg-teal text-white text-center py-2.5 px-4 text-xs font-semibold tracking-wide">
        Early-access pricing - rates increase when self-serve checkout launches.{" "}
        <span className="text-gold font-bold">Lock your rate now.</span>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-100 bg-white px-6 py-20">
        <div
          className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.25) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-[1200px] text-center">
          <FadeUp>
            <span className="chip mb-5 inline-flex border-teal/30 bg-teal-50 text-teal">Pricing</span>
            <h1 className="mb-5 text-5xl font-extrabold text-zinc-900 sm:text-6xl">
              Every week without a system,
              <span className="text-gold gold-underline"> someone else builds what you should.</span>
            </h1>
            <p className="mx-auto mb-6 max-w-2xl font-cormorant text-2xl italic text-zinc-500">
              Qalam is what serious LinkedIn professionals use to stay consistent, get better over time, and never start from blank again.
            </p>

            {/* Social proof strip */}
            <div className="mx-auto mb-8 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <strong className="text-zinc-700">PKR 0</strong> to start
              </span>
              <span className="text-zinc-200">|</span>
              <span>
                <strong className="text-zinc-700">{soloPlan ? `${formatPkr(soloPlan.monthlyPkr)}/mo` : "Solo"}</strong> Solo
              </span>
              <span className="text-zinc-200">|</span>
              <span>
                Annual saves <strong className="text-zinc-700">{maxAnnualSave}</strong>
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-700">
              Annual billing: <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700">{annualFraming}</span>
            </div>
            <p className="mt-3 text-xs text-zinc-400">No credit card required for Free. Paid plans start instantly.</p>
          </FadeUp>
        </div>
      </section>

      {/* Value props strip */}
      <section className="border-b border-zinc-100 bg-zinc-50 px-6 py-8">
        <div className="mx-auto max-w-[860px]">
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            {[
              {
                icon: VoiceIcon,
                label: "AI that learns your voice",
                sub: "Not a template machine - a memory layer that gets sharper with every post",
              },
              {
                icon: ArchiveIcon,
                label: "Your entire content history, intact",
                sub: "Drafts, versions, and wins live in your workspace permanently",
              },
              {
                icon: ShieldIcon,
                label: "PKR-first, honest pricing",
                sub: "No USD conversion guesswork. Real features, real status.",
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex max-w-[240px] items-start gap-3">
                  <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-teal shadow-sm ring-1 ring-zinc-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-snug text-zinc-800">{item.label}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{item.sub}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp className="mb-8 text-center">
            <p className="text-lg font-medium text-zinc-600">
              Start free. Stay free if you want. Upgrade when posting becomes the habit you don&apos;t want to lose.
            </p>
          </FadeUp>

          <AnimatePresence mode="wait">
            <motion.div
              key="monthly-pricing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 xl:grid-cols-4"
            >
              {displayPlans.map((plan, i) => (
                <FadeUp key={plan.plan} delay={i * 0.08}>
                  <PricingCard {...plan} />
                </FadeUp>
              ))}
            </motion.div>
          </AnimatePresence>

          <FadeUp className="mt-8 text-center">
            <p className="text-sm text-zinc-400">
              Agency plans include guided setup. Contact us to start.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Manual payment block */}
      <section className="border-y border-zinc-100 bg-zinc-50 px-6 py-14">
        <div className="mx-auto max-w-[600px] text-center">
          <FadeUp>
            <h2 className="mb-3 text-2xl font-bold text-zinc-900">Card not working? Pay manually.</h2>
            <p className="mb-7 text-base leading-relaxed text-zinc-600">
              Send payment via JazzCash, Easypaisa, or bank transfer. Email the payment screenshot - plan activated after manual review.
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <a
                href={`mailto:${UPGRADES_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600"
              >
                Email payment team
              </a>
            </motion.div>
            <p className="mt-4 text-xs text-zinc-400">Support response time: under 4 hours</p>
          </FadeUp>
        </div>
      </section>

      {/* Privacy line */}
      <div className="border-b border-zinc-100 bg-white px-6 py-5">
        <div className="mx-auto max-w-[860px] text-center">
          <p className="text-xs leading-relaxed text-zinc-400">
            Your drafts are private. No one at Qalam reads your content. LinkedIn data is used only for publishing - nothing stored beyond what you authorize.
          </p>
        </div>
      </div>

      {/* What this replaces - value anchor */}
      <section className="border-y border-zinc-100 bg-white px-6 py-16">
        <div className="mx-auto max-w-[860px]">
          <FadeUp className="mb-10 text-center">
            <span className="chip mb-4 border-gold/30 bg-gold-50 text-gold-600">The math is obvious</span>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900">What PKR 899 replaces</h2>
            <p className="mt-2 text-sm text-zinc-500">What professionals typically spend to get what Qalam delivers in one workspace.</p>
          </FadeUp>

          <FadeUp>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "LinkedIn Ghostwriter", cost: "PKR 20,000-80,000/month", note: "For one person, one voice, inconsistent availability" },
                { label: "Content Scheduling Tool", cost: "PKR 4,000-8,000/month", note: "No AI, no voice memory, no analytics depth" },
                { label: "AI Writing Assistant (generic)", cost: "PKR 2,500-5,000/month", note: "No LinkedIn-specific training, no archive, no workflow" },
                { label: "Analytics + Competitor Research", cost: "PKR 5,000-15,000/month", note: "Separate tool, separate login, separate bill" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-zinc-100 bg-zinc-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">{item.label}</p>
                      <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">{item.note}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 whitespace-nowrap">{item.cost}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border-2 border-teal/20 bg-teal-50 p-5 text-center">
              <p className="text-sm text-zinc-600">Qalam replaces all of it.</p>
              <p className="mt-1 text-2xl font-extrabold text-teal">PKR 899/month.</p>
              <p className="mt-1 text-xs text-zinc-400">One workspace. Your voice. Every post in one place.</p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-zinc-900">Compare all plans</h2>
            <p className="mt-2 text-sm text-zinc-500">Live surfaces first. Everything else follows.</p>
          </FadeUp>

          <FadeUp>
            <div className="overflow-x-auto rounded-2xl border border-zinc-100 shadow-sm">
              <table className="min-w-[820px] w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="w-[28%] px-5 py-4 text-left font-semibold text-zinc-700">Feature</th>
                    <th className="px-4 py-4 text-center font-semibold text-zinc-500">Free</th>
                    <th className="px-4 py-4 text-center font-semibold text-teal">Solo</th>
                    <th className="bg-teal-50/50 px-4 py-4 text-center font-semibold text-teal">Pro</th>
                    <th className="bg-zinc-50 px-4 py-4 text-center">
                      <span className="font-semibold text-zinc-400">Agency</span>
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500">Soon</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {COMPARISON_ROWS.map((row, i) => (
                    <motion.tr
                      key={row.label}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.03 }}
                      className="transition-colors hover:bg-zinc-50/50"
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-zinc-700">{row.label}</td>
                      <td className="px-4 py-3.5 text-center text-sm text-zinc-300">{row.free === "-" ? "-" : row.free}</td>
                      <td className="px-4 py-3.5 text-center text-sm text-zinc-600">{row.solo === "-" ? "-" : row.solo}</td>
                      <td className="bg-teal-50/30 px-4 py-3.5 text-center text-sm"><span className="font-semibold text-teal">{row.pro === "-" ? "-" : row.pro}</span></td>
                      <td className="bg-zinc-50/60 px-4 py-3.5 text-center text-sm">
                        <span className={row.agency === "Coming Soon" ? "text-xs italic text-zinc-400" : "text-zinc-400"}>
                          {row.agency === "-" ? "-" : row.agency}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* CTA: Agency / Contact */}
      <section className="bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp>
            <div className="flex flex-col items-center justify-between gap-8 rounded-2xl bg-teal-800 p-10 md:flex-row">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-200">For agencies and teams</p>
                <h3 className="mb-3 text-3xl font-bold text-white">Running multiple client accounts?</h3>
                <p className="max-w-md leading-relaxed text-white/60">
                  Agency plans give you isolated client workspaces, shared voice profiles, per-client analytics, and team publishing controls. Contact us for a walkthrough.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3">
                <Link href={`mailto:${UPGRADES_EMAIL}`} className="whitespace-nowrap rounded-xl bg-gold px-8 py-4 text-center font-bold text-white transition-colors hover:bg-gold-600">
                  Contact Sales
                </Link>
                <Link href="/contact" className="rounded-xl border-2 border-white/20 px-8 py-4 text-center font-semibold text-white transition-colors hover:bg-white/10">
                  Book a Call
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <FadeUp className="mb-12 text-center">
            <span className="chip mb-4 border-teal/30 text-teal">Pricing FAQ</span>
            <h2 className="mt-3 text-4xl font-bold text-zinc-900">Common questions</h2>
          </FadeUp>

          <div className="flex flex-col gap-3">
            {PRICING_FAQ.map((item, i) => (
              <FadeUp key={item.q} delay={i * 0.04}>
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-colors hover:border-teal/30">
                  <button
                    className="flex w-full items-center justify-between px-6 py-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    <span className="text-base font-semibold text-zinc-900">{item.q}</span>
                    <motion.span
                      animate={{ rotate: openFaq === i ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-300/60 text-lg font-light text-zinc-500"
                    >
                      +
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
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
    </div>
  )
}
