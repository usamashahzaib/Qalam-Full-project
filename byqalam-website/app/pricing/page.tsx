"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { PricingCard } from "@/components/PricingCard"

const PLANS = {
  monthly: [
    {
      plan: "Free",
      price: "$0",
      period: "forever",
      description: "Great for trying Qalam and building your first posting habit.",
      features: [
        "5 AI posts per week",
        "3 hook variations per post",
        "Basic tones (3 options)",
        "Post preview & copy",
        "Community support",
      ],
      cta: "Get Started Free →",
      href: "/signup",
      highlighted: false,
    },
    {
      plan: "Pro",
      price: "$19",
      period: "mo",
      description: "For serious creators and founders building their LinkedIn presence.",
      features: [
        "Unlimited AI post generation",
        "Voice Fingerprint training",
        "All 5 tone modes",
        "Hook Generator (unlimited)",
        "Post Scheduler (30 posts/mo)",
        "LinkedIn Analytics",
        "7-day free trial",
        "Priority email support",
      ],
      cta: "Start Free Trial →",
      href: "/signup?plan=pro",
      highlighted: true,
      badge: "Most Popular",
    },
    {
      plan: "Team",
      price: "$49",
      period: "mo",
      description: "For marketing teams that want coordinated LinkedIn dominance.",
      features: [
        "Everything in Pro",
        "5 team member seats",
        "Team analytics & reports",
        "Custom voice per seat",
        "Brand voice guidelines",
        "Unlimited scheduling",
        "Shared idea library",
        "Dedicated success manager",
      ],
      cta: "Start Team Trial →",
      href: "/signup?plan=team",
      highlighted: false,
    },
  ],
  annual: [
    {
      plan: "Free",
      price: "$0",
      period: "forever",
      description: "Great for trying Qalam and building your first posting habit.",
      features: [
        "5 AI posts per week",
        "3 hook variations per post",
        "Basic tones (3 options)",
        "Post preview & copy",
        "Community support",
      ],
      cta: "Get Started Free →",
      href: "/signup",
      highlighted: false,
    },
    {
      plan: "Pro",
      price: "$15",
      period: "mo",
      description: "Billed annually. Save $48/year vs monthly.",
      features: [
        "Unlimited AI post generation",
        "Voice Fingerprint training",
        "All 5 tone modes",
        "Hook Generator (unlimited)",
        "Post Scheduler (30 posts/mo)",
        "LinkedIn Analytics",
        "7-day free trial",
        "Priority email support",
      ],
      cta: "Start Free Trial →",
      href: "/signup?plan=pro-annual",
      highlighted: true,
      badge: "Best Value",
    },
    {
      plan: "Team",
      price: "$39",
      period: "mo",
      description: "Billed annually. Save $120/year vs monthly.",
      features: [
        "Everything in Pro",
        "5 team member seats",
        "Team analytics & reports",
        "Custom voice per seat",
        "Brand voice guidelines",
        "Unlimited scheduling",
        "Shared idea library",
        "Dedicated success manager",
      ],
      cta: "Start Team Trial →",
      href: "/signup?plan=team-annual",
      highlighted: false,
    },
  ],
}

const COMPARISON_FEATURES = [
  { label: "AI Post Generation", free: "5/week", pro: "Unlimited", team: "Unlimited" },
  { label: "Hook Variations", free: "3/post", pro: "10/post", team: "10/post" },
  { label: "Tone Modes", free: "3", pro: "5 + custom", team: "5 + custom" },
  { label: "Voice Fingerprint", free: "✗", pro: "✓", team: "✓" },
  { label: "Post Scheduler", free: "✗", pro: "30/mo", team: "Unlimited" },
  { label: "LinkedIn Analytics", free: "Basic", pro: "Full", team: "Team + Reports" },
  { label: "Team Seats", free: "1", pro: "1", team: "5" },
  { label: "Support", free: "Community", pro: "Priority", team: "Dedicated Manager" },
]

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const plans = PLANS[billing]

  return (
    <div className="pt-24 min-h-screen bg-zinc-50">
      {/* Header */}
      <section className="py-20 px-6 bg-white border-b border-zinc-100 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.25) 0%, transparent 70%)" }}
        />

        <div className="max-w-[1200px] mx-auto text-center relative z-10">
          <FadeUp>
            <span className="chip border-teal/30 text-teal bg-teal-50 mb-5 inline-flex">
              Simple Pricing
            </span>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-zinc-900 mb-5">
              Invest in your{" "}
              <span className="text-gold gold-underline">LinkedIn growth</span>
            </h1>
            <p className="font-cormorant text-2xl italic text-zinc-500 max-w-xl mx-auto mb-10">
              Start free. Upgrade when you&apos;re ready. No lock-ins, ever.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 bg-zinc-100 rounded-xl p-1.5">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  billing === "monthly"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  billing === "annual"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Annual
                <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-md font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={billing}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center"
            >
              {plans.map((plan, i) => (
                <FadeUp key={plan.plan} delay={i * 0.1}>
                  <PricingCard {...plan} />
                </FadeUp>
              ))}
            </motion.div>
          </AnimatePresence>

          <FadeUp className="text-center mt-8">
            <p className="text-sm text-zinc-400">
              All plans include a 7-day free trial on Pro and Team · No credit card required
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-[900px] mx-auto">
          <FadeUp className="text-center mb-10">
            <h2 className="text-3xl font-bold text-zinc-900">Compare plans in detail</h2>
          </FadeUp>

          <FadeUp>
            <div className="overflow-x-auto rounded-2xl border border-zinc-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="text-left px-6 py-4 font-semibold text-zinc-700">Feature</th>
                    <th className="px-6 py-4 font-semibold text-zinc-700 text-center">Free</th>
                    <th className="px-6 py-4 font-semibold text-teal text-center bg-teal-50/50">Pro</th>
                    <th className="px-6 py-4 font-semibold text-zinc-700 text-center">Team</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {COMPARISON_FEATURES.map((row, i) => (
                    <motion.tr
                      key={row.label}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.04 }}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-zinc-700 font-medium">{row.label}</td>
                      <td className="px-6 py-4 text-center text-zinc-500">
                        {row.free === "✗" ? (
                          <span className="text-zinc-300 text-base">✕</span>
                        ) : (
                          row.free
                        )}
                      </td>
                      <td className="px-6 py-4 text-center bg-teal-50/30">
                        {row.pro === "✓" ? (
                          <span className="text-teal font-bold">✓</span>
                        ) : (
                          <span className="text-teal font-semibold">{row.pro}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-zinc-700">
                        {row.team === "✓" ? (
                          <span className="text-teal font-bold">✓</span>
                        ) : (
                          row.team
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Enterprise */}
      <section className="py-16 px-6 bg-zinc-50">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp>
            <div className="bg-teal-800 rounded-2xl p-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <p className="text-teal-200 text-sm font-semibold uppercase tracking-widest mb-2">
                  Enterprise
                </p>
                <h3 className="text-3xl font-bold text-white mb-3">
                  Need more than 5 seats?
                </h3>
                <p className="text-white/60 max-w-md">
                  Custom pricing for large teams, agencies, and companies. Includes SSO, custom integrations, SLA, and a dedicated account team.
                </p>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                <Link
                  href="mailto:enterprise@qalam.ai"
                  className="px-8 py-4 bg-gold text-white font-bold rounded-xl text-center hover:bg-gold-600 transition-colors whitespace-nowrap"
                >
                  Contact Sales →
                </Link>
                <Link
                  href="/demo"
                  className="px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-xl text-center hover:bg-white/10 transition-colors"
                >
                  Book a Demo
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
