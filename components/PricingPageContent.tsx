"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { PricingCard } from "@/components/PricingCard"
import { ReferralBadge } from "@/components/ReferralBadge"
import { ArchiveIcon, CheckIcon, ShieldIcon, VoiceIcon } from "@/components/ui/qalam-icons"
import { AGENCY_PLAN_LIVE, COMPARISON_ROWS, PLANS, MANAGED_PLANS, formatPkr, getQuarterlyMonthlyEquivalent, upgradeUrl } from "@/lib/pricing"
import { CAREER_ADD_ONS, CAREER_PACKS } from "@/lib/career-pricing"
import { isAddonSelfServe } from "@/lib/career-checkout"
import { UPGRADES_EMAIL, MANUAL_UPGRADE_METHODS } from "@/lib/contact"
import { resolvePublicHref } from "@/lib/seo"
import type { ManagedPlan } from "@/lib/pricing"

const PRICING_FAQ = [
  {
    q: "Is there a free plan?",
    a: "Yes. Free includes unlimited public ATS checks with abuse protection, 1 targeted resume per month, 10 active applications, a 15-item Evidence Vault, 5 AI posts, and core writing tools. No payment card is required.",
  },
  {
    q: "How much does Qalam cost?",
    a: "Solo is PKR 1,598 per quarter and Pro is PKR 2,998 per quarter. Every plan is billed quarterly and includes the equivalent of one free month.",
  },
  {
    q: "Why does Qalam use quarterly billing?",
    a: "Career visibility needs consistent work over several weeks. Quarterly billing keeps the entry price practical while giving enough time to improve LinkedIn, content, and resumes.",
  },
  {
    q: "What does Pro include that Solo doesn't?",
    a: "Solo adds 3 targeted resumes per month, 5 ATS reviews, 1 flexible career credit per quarter, publishing, and basic analytics. Pro adds 10 resumes, 3 career credits per quarter, advanced outcome intelligence, featured recruiter visibility, cohorts, trained voice, research, and full analytics.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Paid renewals can be cancelled before the next quarter. Access and retention follow the account terms shown during checkout.",
  },
  {
    q: "Which plan should I choose?",
    a: "Choose Solo for a serious personal job search and consistent publishing. Choose Pro for advanced career outcome intelligence, more resume versions, featured recruiter visibility, cohorts, and professional research workflows.",
  },
  {
    q: "Is the Qalam LinkedIn extension included?",
    a: "Yes. Free, Solo, and Pro include the Qalam LinkedIn extension. It uses the same smart comment allowance: 10 per month on Free, 50 on Solo, and 150 on Pro. Qalam suggests comments only and never posts automatically.",
  },
  {
    q: "Can I buy a career tool without changing my plan?",
    a: "Yes. Career add-ons are one-time software credits for a targeted resume, cover letter, interview pack, deep resume review, LinkedIn rewrite, or career strategy blueprint. Checkout is shown only when that product is configured for card payment.",
  },
  {
    q: "How does Refer and Earn work?",
    a: "Create a referral code inside Qalam. A referred customer gets 10% off their first paid purchase, and you earn 10% commission after their payment is confirmed.",
  },
]

function ManagedCard({ plan, index }: { plan: ManagedPlan; index: number }) {
  const isPremium = plan.name === "Premium Management"
  const monthlySaving = plan.originalMonthlyPrice - plan.monthlyPrice

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.08 }}
    >
      <motion.div
        whileHover={{ scale: 1.02, transition: { duration: 0.22, ease: "easeOut" } }}
        whileTap={{ scale: 0.995 }}
        className={`relative flex flex-col rounded-2xl border p-8 shadow-md transition-all duration-300 ${
          isPremium
            ? "border-gold/40 bg-gradient-to-br from-amber-50 to-white hover:shadow-[0_12px_40px_rgba(180,83,9,0.18)]"
            : "border-zinc-200 bg-white hover:border-gold/50 hover:shadow-[0_8px_32px_rgba(13,74,69,0.12)]"
        }`}
      >
        {/* Managed badge */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-md ${isPremium ? "bg-gradient-to-r from-gold to-amber-500" : "bg-gold"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            {isPremium ? "Premium Managed" : "Managed"}
          </span>
        </div>

        <div className="mb-6 pt-2">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold-600">{plan.name}</p>
          <div className="mb-1 flex items-center gap-2 text-sm">
            <span className="text-zinc-400 line-through">{formatPkr(plan.originalMonthlyPrice)}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Save {formatPkr(monthlySaving)}</span>
          </div>
          <div className="mb-2 flex items-end gap-1.5">
            <span className={`text-5xl font-extrabold ${isPremium ? "text-amber-900" : "text-zinc-900"}`}>
              {formatPkr(plan.monthlyPrice)}
            </span>
            <span className="mb-2 text-sm font-medium text-zinc-500">/mo</span>
          </div>
          <p className="mb-2 text-xs font-semibold text-emerald-700">Discounted monthly price</p>
          <p className="text-xs font-semibold text-gold">{plan.postsPerMonth} posts/month</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{plan.description}</p>
        </div>

        <ul className="mb-8 flex flex-1 flex-col gap-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <CheckIcon className={`mt-0.5 h-4 w-4 shrink-0 ${isPremium ? "text-gold" : "text-teal"}`} />
              <span className="text-sm text-zinc-700">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/managed/apply?plan=${encodeURIComponent(plan.name)}&type=individual`}
            className={`rounded-xl py-3.5 text-center text-sm font-bold transition-all duration-200 ${
              isPremium
                ? "bg-gold text-white shadow-sm hover:bg-amber-600"
                : "bg-teal-50 text-teal hover:bg-teal hover:text-white"
            }`}
          >
            Individual
          </Link>
          <Link
            href={`/managed/apply?plan=${encodeURIComponent(plan.name)}&type=company`}
            className={`rounded-xl border py-3.5 text-center text-sm font-bold transition-all duration-200 ${
              isPremium
                ? "border-gold/50 text-gold-600 hover:bg-gold/10"
                : "border-teal/40 text-teal hover:bg-teal-50"
            }`}
          >
            Company
          </Link>
        </div>
        <p className="mt-3 text-center text-[10px] text-zinc-400">Application reviewed before managed service begins</p>
      </motion.div>
    </motion.div>
  )
}

// The ?tab=managed deep link is read through useSyncExternalStore rather than
// useSearchParams. That hook opts the whole route out of static prerendering,
// and because app/pricing/page.tsx wraps this component in
// <Suspense fallback={null}>, the bailout meant the served HTML contained no
// pricing body at all: no headline, no plan names, no prices, nothing for a
// crawler or a reader with slow JS. useSyncExternalStore is SSR-safe, so the
// page prerenders in full and the deep link still resolves on the client.
const subscribeToUrl = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange)
  return () => window.removeEventListener("popstate", onStoreChange)
}
const readTabParam = () => new URLSearchParams(window.location.search).get("tab")
const readTabParamOnServer = () => null

export function PricingPageContent() {
  const { data: session, status } = useSession()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [referralDiscountPercent, setReferralDiscountPercent] = useState(0)

  // A tab the visitor picked wins over the one the URL asked for.
  const urlTab = useSyncExternalStore(subscribeToUrl, readTabParam, readTabParamOnServer)
  const [chosenTab, setChosenTab] = useState<"selfserve" | "managed" | null>(null)
  const pricingTab = chosenTab ?? (urlTab === "managed" ? "managed" : "selfserve")

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.user?.plan) setCurrentPlan(data.user.plan)
      })
      .catch(() => {})
    fetch("/api/referrals/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (data.activeDiscountPercent) setReferralDiscountPercent(data.activeDiscountPercent) })
      .catch(() => {})
  }, [session?.user?.id, status])

  const displayPlans = PLANS.filter((plan) => !plan.comingSoon).map((plan) => {
    const isCurrentPlan = currentPlan != null && plan.plan.toLowerCase() === currentPlan.toLowerCase()
    const noteOverride =
      plan.plan === "Free"
        ? "No payment card required."
        : plan.plan === "Solo" || plan.plan === "Pro"
          ? "Access unlocks after confirmed card payment."
          : "Agency onboarding is reviewed before activation."

    const basePkr = plan.quarterlyPkr
    const hasDiscount = referralDiscountPercent > 0 && !!basePkr && basePkr > 0
    const price = formatPkr(basePkr)
    const monthlyEquivalent = getQuarterlyMonthlyEquivalent(plan.quarterlyPkr)
    const annualSavings = plan.plan === "Free"
      ? undefined
      : `${formatPkr(monthlyEquivalent)}/month effective`
    const usdReference = plan.plan === "Free" ? "Core tools included" : "Billed every three months"

    // Paid plans route to the in-app upgrade page, which mints the checkout token at
    // click time and opens the Lemon Squeezy overlay. Logged-out visitors hit the app's
    // auth guard there and come back to the same plan and cycle after logging in, so the
    // choice made here survives the round trip. Checkout is never launched straight from
    // this page: without an authenticated session the webhook has no signed token and
    // cannot attribute the payment to an account.
    const href = plan.plan === "Solo" || plan.plan === "Pro"
      ? upgradeUrl(plan.plan, "quarterly")
      : resolvePublicHref(plan.href)

    return {
      ...plan,
      period: plan.plan === "Free" ? "" : "quarter",
      description: plan.description,
      note: noteOverride,
      price,
      discountBadge: hasDiscount ? <ReferralBadge discountPercent={referralDiscountPercent} /> : undefined,
      annualSavings,
      usdReference,
      cta: plan.cta,
      href,
      badge: isCurrentPlan ? "Current plan" : plan.badge,
    }
  })

  const soloPlan = PLANS.find((plan) => plan.plan === "Solo")

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">

      {/* Hero */}
      <section data-nav-ground="dark" data-nav-hero="dark" className="qlx qlx-surface relative overflow-hidden px-6 py-20">
        <div className="qlx-grain" aria-hidden />
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.4 0.05 196 / 0.55) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-0 h-[440px] w-[440px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.85 0.05 85 / 0.4) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-[1200px] text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
            <span className="chip mb-5 inline-flex border-white/15 bg-white/8 text-white/85 backdrop-blur">Pricing</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.08 }}
            className="mb-5 text-4xl font-extrabold text-white sm:text-6xl"
          >
            One system for
            {" "}
            <span className="gold-underline" style={{ color: "oklch(0.85 0.05 85)" }}>profile, content, and career growth.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.16 }}
            className="mx-auto mb-6 max-w-2xl font-cormorant text-2xl italic text-white/70"
          >
            Start with the complete loop. Upgrade for a repeatable publishing workflow, then advanced voice and intelligence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.24 }}
          >
            {/* Social proof strip */}
            <div className="mx-auto mb-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <strong className="text-white/90">PKR 0</strong> to start
              </span>
              <span className="text-white/20">|</span>
              <span>
                <strong className="text-white/90">{soloPlan ? `${formatPkr(soloPlan.quarterlyPkr)}/quarter` : "Solo"}</strong> Solo
              </span>
              <span className="text-white/20">|</span>
              <span>
                Pay for <strong className="text-white/90">2 months</strong>, use 3
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-5 py-3 text-sm font-semibold text-white/85">
              Quarterly billing: <span className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-xs font-bold text-emerald-300">1 month free</span>
            </div>
            <p className="mt-3 text-xs text-white/40">No payment card required for Free. Paid access starts after confirmed payment.</p>
          </motion.div>
        </div>
      </section>

      {/* Value props strip */}
      <section className="border-b border-zinc-100 bg-zinc-50 px-6 py-8">
        <div className="mx-auto max-w-[860px]">
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
            {[
              {
                icon: VoiceIcon,
                label: "Trained voice on Pro",
                sub: "Your examples, tone, and editing patterns become reusable writing context",
              },
              {
                icon: ArchiveIcon,
                label: "Full workflow on Solo",
                sub: "Draft, plan, publish, schedule, and keep every version connected",
              },
              {
                icon: ShieldIcon,
                label: "Career tools on every tier",
                sub: "LinkedIn audits, ATS reviews, and one connected Career Vault",
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

          {/* Tab switcher */}
          <FadeUp className="mb-10 text-center">
            <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setChosenTab("selfserve")}
                className={`min-h-11 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  pricingTab === "selfserve"
                    ? "bg-teal text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Self-serve Plans
              </button>
              <button
                type="button"
                onClick={() => setChosenTab("managed")}
                className={`min-h-11 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  pricingTab === "managed"
                    ? "bg-gold text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Managed Plans
              </button>
            </div>
          </FadeUp>

          <AnimatePresence mode="wait">
            {pricingTab === "selfserve" ? (
              <motion.div
                key="selfserve"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <FadeUp className="mb-8 text-center">
                  <p className="text-lg font-medium text-zinc-600">
                    Start free. Stay free if you want. Upgrade when posting becomes the habit you don&apos;t want to lose.
                  </p>
                </FadeUp>

                <div className="mb-8 flex justify-center"><span className="rounded-full bg-teal px-4 py-2 text-sm font-bold text-white">Quarterly plans</span></div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key="quarterly"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="mx-auto grid max-w-[1100px] grid-cols-1 items-start gap-6 md:grid-cols-3"
                  >
                    {displayPlans.map((plan, i) => (
                      <motion.div
                        key={plan.plan}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.07 }}
                      >
                        <PricingCard {...plan} />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="managed"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <FadeUp className="mb-10 text-center">
                  <p className="mx-auto max-w-2xl text-lg font-medium text-zinc-600">
                    We do the writing for you. A dedicated Qalam writer creates and posts content on your behalf - you just approve before it goes live.
                  </p>
                  <p className="mt-3 text-sm font-semibold text-emerald-700">Limited discounted monthly pricing is shown below.</p>
                  <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <CheckIcon className="h-4 w-4 text-gold" />
                      Written in your voice
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckIcon className="h-4 w-4 text-gold" />
                      You approve before posting
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckIcon className="h-4 w-4 text-gold" />
                      WhatsApp support on Premium
                    </span>
                  </div>
                </FadeUp>

                <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:max-w-[820px] lg:mx-auto">
                  {MANAGED_PLANS.map((plan, i) => (
                    <ManagedCard key={plan.name} plan={plan} index={i} />
                  ))}
                </div>

                <FadeUp className="mt-8 text-center">
                  <p className="text-sm text-zinc-400">
                    Managed plans are capacity-limited and begin after a fit review.
                  </p>
                </FadeUp>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="border-y border-zinc-100 bg-white px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp className="mb-10 max-w-3xl">
            <span className="chip mb-4 border-gold/30 bg-gold-50 text-gold-700">Career add-ons</span>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900 sm:text-4xl">Buy the exact career output you need.</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">One-time software credits. Your result is generated and saved inside Qalam. No plan upgrade required.</p>
          </FadeUp>

          <div className="mb-5 grid gap-5 rounded-3xl bg-zinc-900 p-7 text-white sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">Recommended one-time offer</p>
              <h3 className="mt-2 text-2xl font-bold">Job-Win Pack</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Deep recruiter review, JD-matched resume, targeted cover letter, and interview practice for one serious application.</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-white/40 line-through">{formatPkr(CAREER_PACKS.find(({ key }) => key === "job_win_pack")!.originalPrice)}</p>
              <p className="mt-1 text-2xl font-bold text-gold">{formatPkr(CAREER_PACKS.find(({ key }) => key === "job_win_pack")!.price)}</p>
              <Link href={resolvePublicHref("/login?callbackUrl=/career/add-ons")} className="mt-4 inline-flex rounded-xl bg-gold px-5 py-3 text-sm font-bold text-white">Open Job-Win Pack</Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            {CAREER_ADD_ONS.map((item, index) => {
              const checkoutReady = isAddonSelfServe(item.key)
              return (
                <article key={item.key} className="grid gap-3 border-b border-zinc-100 px-5 py-5 last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                  <span className="text-xs font-bold text-zinc-300">0{index + 1}</span>
                  <div>
                    <h3 className="font-semibold text-zinc-900">{item.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500">One {item.unit}, generated inside your Qalam workspace</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${checkoutReady ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                      {checkoutReady ? "Card checkout live" : "Checkout coming soon"}
                    </span>
                    <strong className="min-w-24 text-right text-sm text-teal">{formatPkr(item.price)}</strong>
                  </div>
                </article>
              )
            })}
          </div>

          <FadeUp className="mt-8 flex flex-col gap-5 rounded-2xl bg-teal-800 p-7 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Refer and Earn</p>
              <h3 className="mt-2 text-2xl font-bold">Give 10% off. Earn 10% commission.</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Generate a personal code, track confirmed referrals, and request payouts from your Qalam settings.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href={resolvePublicHref("/login?callbackUrl=/career/add-ons")} className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-white">Open career add-ons</Link>
              <Link href={resolvePublicHref("/login?callbackUrl=/settings/referrals")} className="rounded-xl border border-white/25 px-5 py-3 text-sm font-bold text-white">Get referral code</Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Manual payment fallback. Deliberately a single line, not a section: card
          checkout is the path, and presenting manual payment as an equal option was
          reading as "this product does not actually take payments". */}
      <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-6">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs leading-relaxed text-zinc-500">
            Card declined, or no international card? Send payment via {MANUAL_UPGRADE_METHODS.join(", ")} and email the
            screenshot to{" "}
            <a href={`mailto:${UPGRADES_EMAIL}`} className="font-semibold text-zinc-700 underline">
              {UPGRADES_EMAIL}
            </a>
            . Assisted payments are activated after verification.
          </p>
        </div>
      </div>

      {/* Privacy line */}
      <div className="border-b border-zinc-100 bg-white px-6 py-5">
        <div className="mx-auto max-w-[860px] text-center">
          <p className="text-xs leading-relaxed text-zinc-400">
            Account data and connected services are handled according to the Privacy Policy and the permissions you authorize.
          </p>
        </div>
      </div>

      {/* Value anchor */}
      <section className="border-y border-zinc-100 bg-white px-6 py-16">
        <div className="mx-auto max-w-[860px]">
          <FadeUp className="mb-10 text-center">
            <span className="chip mb-4 border-gold/30 bg-gold-50 text-gold-600">One connected system</span>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900">What your quarterly plan connects</h2>
            <p className="mt-2 text-sm text-zinc-500">Choose capacity based on the professional workflow you need.</p>
          </FadeUp>

          <FadeUp>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "LinkedIn positioning", cost: "Profile", note: "Audit clarity, search relevance, credibility, and alignment" },
                { label: "Content workflow", cost: "Content", note: "Draft, score, revise, plan, and publish from one workspace" },
                { label: "ATS career engine", cost: "Resume", note: "Review and tailor verified experience to a target job" },
                { label: "Career intelligence", cost: "Growth", note: "Track evidence, recruiter visibility, and professional progress" },
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
              <p className="text-sm text-zinc-600">Solo starts at</p>
              <p className="mt-1 text-2xl font-extrabold text-teal">PKR 1,598 per quarter</p>
              <p className="mt-1 text-xs text-zinc-400">One professional story across profile, content, and career assets.</p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-zinc-900">Compare all plans</h2>
            <p className="mt-2 text-sm text-zinc-500">Free proves the value. Solo runs the workflow. Pro adds intelligence.</p>
          </FadeUp>

          <FadeUp>
            <div className="overflow-x-auto rounded-2xl border border-zinc-100 shadow-sm">
              <table className={`${AGENCY_PLAN_LIVE ? "min-w-[760px]" : "min-w-[620px]"} w-full text-sm`}>
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className={`${AGENCY_PLAN_LIVE ? "w-[30%]" : "w-[34%]"} px-5 py-4 text-left font-semibold text-zinc-700`}>Feature</th>
                    <th className="px-4 py-4 text-center font-semibold text-zinc-500">Free</th>
                    <th className="bg-teal-50/50 px-4 py-4 text-center font-semibold text-teal">Solo</th>
                    <th className="px-4 py-4 text-center font-semibold text-zinc-700">Pro</th>
                    {AGENCY_PLAN_LIVE ? (
                      <th className="px-4 py-4 text-center font-semibold text-zinc-700">Agency</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {COMPARISON_ROWS.map((row, i) => {
                    const startsGroup = i === 0 || COMPARISON_ROWS[i - 1].group !== row.group
                    return [
                      startsGroup ? (
                        <tr key={`${row.group}-group`} className="border-y border-zinc-100 bg-zinc-50/80">
                          <th colSpan={AGENCY_PLAN_LIVE ? 5 : 4} className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{row.group}</th>
                        </tr>
                      ) : null,
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
                        <td className="bg-teal-50/40 px-4 py-3.5 text-center text-sm font-semibold text-teal">{row.solo}</td>
                        <td className="px-4 py-3.5 text-center text-sm font-semibold text-zinc-700">{row.pro}</td>
                        {AGENCY_PLAN_LIVE ? <td className="px-4 py-3.5 text-center text-sm text-zinc-700">{row.agency}</td> : null}
                      </motion.tr>,
                    ]
                  })}
                </tbody>
              </table>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* CTA: Teams enquiry */}
      <section className="bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp>
            <div className="flex flex-col items-center justify-between gap-8 rounded-2xl bg-teal-800 p-10 md:flex-row">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-200">Need something custom?</p>
                <h3 className="mb-3 text-3xl font-bold text-white">Managing content for multiple clients?</h3>
                <p className="max-w-md leading-relaxed text-white/60">
                  We work with agencies and marketing teams directly. Reach out and we will find the right setup for your workflow.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3">
                <Link href="/contact" className="whitespace-nowrap rounded-xl bg-gold px-8 py-4 text-center font-bold text-white transition-colors hover:bg-gold-600">
                  Get in Touch
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
            <h2 className="mt-3 text-3xl font-bold text-zinc-900">Common questions</h2>
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
