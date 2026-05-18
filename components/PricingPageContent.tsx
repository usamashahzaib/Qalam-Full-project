"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { PricingCard } from "@/components/PricingCard"
import { ArchiveIcon, ShieldIcon, VoiceIcon } from "@/components/ui/qalam-icons"
import { formatLocalizedPrice, formatUsdPrice, type PricingCurrency } from "@/lib/geo-pricing"
import { COMPARISON_ROWS, PLANS } from "@/lib/pricing"

const PRICING_FAQ = [
  {
    q: "Is there a free plan?",
    a: "Yes. The current free experience gives you workspace access plus the public tools. Commercial limits are still being finalized, so this tier should be treated as the live preview path.",
  },
  {
    q: "How much does Qalam cost?",
    a: "Public pricing is anchored in USD: $19/month for Pro, $49/month for Team, and $99/month for Agency. This page can show a local-currency estimate based on your region, but billing source of truth remains USD during assisted onboarding.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "Not as an automated billing feature today. If you are evaluating a paid workspace, the onboarding path is handled manually so scope and expectations stay explicit.",
  },
  {
    q: "What is the difference between Team and Agency?",
    a: "Team is the guided path for internal operators. Agency is the guided path for multi-client workflows. Both are still being hardened before they should be treated as broad self-serve collaboration products.",
  },
  {
    q: "Can I cancel anytime?",
    a: "If your workspace is onboarded manually, cancellation terms are defined in that onboarding agreement. Public site copy should not imply a fully automated subscription lifecycle until it exists.",
  },
  {
    q: "Is annual billing available?",
    a: "Annual pricing can be quoted during assisted onboarding. The annual toggle on this page reflects quoted rates, not a live self-serve checkout flow.",
  },
]

type PricingPageContentProps = {
  pricingCurrency: PricingCurrency
}

export function PricingPageContent({ pricingCurrency }: PricingPageContentProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const displayPlans = PLANS.map((plan) => {
    const usdAmount = billing === "annual" && typeof plan.annualUsd === "number" ? plan.annualUsd : plan.monthlyUsd
    return {
      ...plan,
      price: formatLocalizedPrice(usdAmount, pricingCurrency),
      usdReference: formatUsdPrice(usdAmount),
      href: billing === "annual" && plan.annualHref ? plan.annualHref : plan.href,
      description: billing === "annual" && plan.annualDescription ? plan.annualDescription : plan.description,
    }
  })

  const isUsdDisplay = pricingCurrency.currencyCode === "USD"

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="relative overflow-hidden border-b border-zinc-100 bg-white px-6 py-20">
        <div
          className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.25) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-[1200px] text-center">
          <FadeUp>
            <span className="chip mb-5 inline-flex border-teal/30 bg-teal-50 text-teal">Pricing</span>
            <h1 className="mb-5 text-5xl font-extrabold text-zinc-900 sm:text-6xl">
              Build authority.
              <span className="text-gold gold-underline"> Pay for the layer you need.</span>
            </h1>
            <p className="mx-auto mb-3 max-w-2xl font-cormorant text-2xl italic text-zinc-500">
              Free lets you test the live workflow. Paid plans are currently guided onboarding paths.
            </p>
            <p className="mb-3 text-sm text-zinc-400">
              No credit card required to start. Paid conversion is handled manually today.
            </p>
            <p className="mx-auto mb-10 max-w-2xl rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              {isUsdDisplay
                ? "You are viewing the USD source-of-truth prices used during assisted onboarding."
                : `You are viewing estimated prices in ${pricingCurrency.label} based on your location. Billing source of truth remains USD during assisted onboarding.`}
            </p>

            <div className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 p-1.5">
              <button
                onClick={() => setBilling("monthly")}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  billing === "monthly" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  billing === "annual" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Annual
                <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700">
                  Quoted
                </span>
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="border-b border-zinc-100 bg-zinc-50 px-6 py-8">
        <div className="mx-auto max-w-[860px]">
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            {[
              {
                icon: VoiceIcon,
                label: "Voice profile from real writing",
                sub: "A memory layer, not a cosmetic toggle",
              },
              {
                icon: ArchiveIcon,
                label: "Archive continuity across plans",
                sub: "Drafts, versions, and wins stay attached",
              },
              {
                icon: ShieldIcon,
                label: "Clear pricing and real scope",
                sub: "Local currency display, USD billing source of truth",
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

      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={billing}
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
              Paid plans are sold through assisted onboarding until checkout and entitlement automation are live.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-zinc-900">Compare all plans</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Live surfaces first. Hardened operational layers after that.
            </p>
          </FadeUp>

          <FadeUp>
            <div className="overflow-x-auto rounded-2xl border border-zinc-100 shadow-sm">
              <table className="min-w-[640px] w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="w-[30%] px-5 py-4 text-left font-semibold text-zinc-700">Feature</th>
                    <th className="px-4 py-4 text-center font-semibold text-zinc-500">Free</th>
                    <th className="bg-teal-50/50 px-4 py-4 text-center font-semibold text-teal">Pro</th>
                    <th className="px-4 py-4 text-center font-semibold text-zinc-700">Team</th>
                    <th className="bg-gold/5 px-4 py-4 text-center font-semibold text-gold">Agency</th>
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
                      <td className="px-4 py-3.5 text-center text-sm text-zinc-400">{row.free}</td>
                      <td className="bg-teal-50/30 px-4 py-3.5 text-center text-sm">
                        <span className="font-semibold text-teal">{row.pro}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm text-zinc-600">{row.team}</td>
                      <td className="bg-gold/5 px-4 py-3.5 text-center text-sm">
                        <span className="font-semibold text-gold">{row.agency}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp>
            <div className="flex flex-col items-center justify-between gap-8 rounded-2xl bg-teal-800 p-10 md:flex-row">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-200">
                  Guided rollout
                </p>
                <h3 className="mb-3 text-3xl font-bold text-white">Need a production setup?</h3>
                <p className="max-w-md leading-relaxed text-white/60">
                  Contact Qalam for onboarding, scope confirmation, and commercial terms that match the current product surface.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3">
                <Link
                  href="mailto:enterprise@byqalam.com"
                  className="whitespace-nowrap rounded-xl bg-gold px-8 py-4 text-center font-bold text-white transition-colors hover:bg-gold-600"
                >
                  Contact Sales
                </Link>
                <Link
                  href="/contact"
                  className="rounded-xl border-2 border-white/20 px-8 py-4 text-center font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Book a Call
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <section id="faq" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <FadeUp className="mb-12 text-center">
            <span className="chip mb-4 border-teal/30 text-teal">Pricing FAQ</span>
            <h2 className="mt-3 text-4xl font-bold text-zinc-900">Common questions about plans</h2>
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
