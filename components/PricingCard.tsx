"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { CheckIcon } from "@/components/ui/qalam-icons"

interface PricingCardProps {
  plan: string
  price: string
  perDay?: string
  annualSavings?: string
  usdReference: string
  period: string
  description: string
  audience?: string
  featureLead?: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
  featureStatus?: "live" | "beta" | "coming_soon"
  comingSoon?: boolean
  note?: string
  discountBadge?: React.ReactNode
}

function badgeClasses(badge: string): string {
  if (badge === "Most popular") return "bg-gold text-white"
  if (badge === "Most powerful") return "bg-teal text-white"
  if (badge === "Coming Soon") return "bg-zinc-100 text-zinc-600"
  if (badge === "Current plan") return "bg-emerald-100 text-emerald-700"
  return "bg-zinc-100 text-zinc-600"
}

export function PricingCard({
  plan,
  price,
  perDay,
  annualSavings,
  usdReference,
  period,
  description,
  audience,
  featureLead,
  features,
  cta,
  href,
  highlighted = false,
  badge,
  featureStatus,
  comingSoon,
  note,
  discountBadge,
}: PricingCardProps) {
  const isComingSoon = comingSoon || featureStatus === "coming_soon"

  return (
    <motion.div
      whileHover={{ scale: isComingSoon ? 1.005 : 1.02, transition: { duration: 0.22, ease: "easeOut" } }}
      whileTap={{ scale: 0.995 }}
      className={`relative flex flex-col rounded-2xl border p-8 ${
        isComingSoon
          ? "border-zinc-200 bg-white/60 opacity-70 shadow-sm"
          : highlighted
          ? "border-teal bg-teal shadow-[0_8px_40px_rgba(13,74,69,0.28)]"
          : "border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:border-gold/50 hover:shadow-[0_8px_32px_rgba(13,74,69,0.12)]"
      }`}
    >
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${badgeClasses(badge)}`}>
            {badge !== "Coming Soon" && badge !== "No card required" && (
              <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            )}
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <p className={`mb-2 text-sm font-semibold uppercase tracking-widest ${
          isComingSoon ? "text-zinc-400" : highlighted ? "text-teal-100" : "text-teal"
        }`}>{plan}</p>
        <div className="mb-1 flex flex-wrap items-baseline gap-x-1 gap-y-0">
          <span className={`break-words text-4xl font-bold xl:text-[2.5rem] ${
            isComingSoon ? "text-zinc-400" : highlighted ? "text-white" : "text-zinc-900"
          }`}>{price}</span>
          {period && <span className={`text-sm ${highlighted ? "text-teal-100" : "text-zinc-500"}`}>/{period}</span>}
        </div>
        {discountBadge && <div className="mb-1">{discountBadge}</div>}
        {perDay && (
          <p className={`text-xs font-medium ${highlighted ? "text-gold-200" : "text-gold"}`}>
            {perDay}
          </p>
        )}
        {annualSavings && (
          <p className={`mt-1 text-xs font-semibold ${highlighted ? "text-emerald-300" : "text-emerald-600"}`}>
            {annualSavings}
          </p>
        )}
        <p className={`mt-2 text-xs ${highlighted ? "text-teal-100/80" : "text-zinc-400"}`}>{usdReference}</p>
        {audience && <p className={`mt-4 text-sm font-bold ${highlighted ? "text-white" : "text-zinc-900"}`}>{audience}</p>}
        <p className={`mt-1 text-sm leading-relaxed ${highlighted ? "text-teal-100" : "text-zinc-600"}`}>{description}</p>
      </div>

      {featureLead && <p className={`mb-3 text-[11px] font-bold uppercase tracking-[0.14em] ${highlighted ? "text-gold-200" : "text-teal"}`}>{featureLead}</p>}
      <ul className="mb-8 flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <CheckIcon className={`mt-0.5 h-4 w-4 shrink-0 ${
              isComingSoon ? "text-zinc-300" : highlighted ? "text-gold-200" : "text-teal"
            }`} />
            <span className={`text-sm ${
              isComingSoon ? "text-zinc-400" : highlighted ? "text-white/92" : "text-zinc-700"
            }`}>{feature}</span>
          </li>
        ))}
      </ul>

      {isComingSoon ? (
        <button
          disabled
          title="Agency tier is launching soon."
          className="w-full cursor-not-allowed rounded-xl border border-zinc-300 py-3 text-center text-sm font-semibold text-zinc-400"
        >
          Coming Soon
        </button>
      ) : (
        <Link
          href={href}
          className={`w-full rounded-xl border py-3 text-center text-sm font-semibold transition-all duration-200 ${
            highlighted
              ? "border-transparent bg-gold text-white shadow-sm hover:bg-gold-600"
              : "border-teal/30 bg-teal-50 text-teal hover:border-teal hover:bg-teal hover:text-white"
          }`}
        >
          {cta}
        </Link>
      )}

      {featureStatus === "beta" && !isComingSoon && (
        <p className={`mt-3 text-center text-xs ${highlighted ? "text-teal-200" : "text-zinc-400"}`}>
          Contact us to get started.
        </p>
      )}
      {isComingSoon && (
        <p className="mt-3 text-center text-xs text-zinc-400">
          Not available for purchase yet.
        </p>
      )}
      {note && !isComingSoon && (
        <p className={`mt-3 text-center text-xs font-medium ${highlighted ? "text-teal-200" : "text-zinc-500"}`}>
          {note}
        </p>
      )}
    </motion.div>
  )
}
