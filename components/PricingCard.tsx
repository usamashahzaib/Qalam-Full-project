"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { CheckIcon } from "@/components/ui/qalam-icons"

interface PricingCardProps {
  plan: string
  price: string
  usdReference: string
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
}

export function PricingCard({
  plan,
  price,
  usdReference,
  period,
  description,
  features,
  cta,
  href,
  highlighted = false,
  badge,
}: PricingCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, transition: { duration: 0.22, ease: "easeOut" } }}
      whileTap={{ scale: 0.995 }}
      className={`relative flex flex-col rounded-2xl border p-8 ${
        highlighted
          ? "border-teal bg-teal shadow-[0_8px_40px_rgba(13,74,69,0.25)]"
          : "border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:border-gold/50 hover:shadow-[0_8px_32px_rgba(13,74,69,0.12)]"
      }`}
    >
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-xs font-bold text-white shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <p className={`mb-2 text-sm font-semibold uppercase tracking-widest ${highlighted ? "text-teal-100" : "text-teal"}`}>{plan}</p>
        <div className="mb-2 flex items-end gap-1">
          <span className={`text-5xl font-bold ${highlighted ? "text-white" : "text-zinc-900"}`}>{price}</span>
          {period && <span className={`mb-2 text-sm ${highlighted ? "text-teal-100" : "text-zinc-500"}`}>/{period}</span>}
        </div>
        <p className={`text-xs ${highlighted ? "text-teal-100/80" : "text-zinc-400"}`}>USD source of truth: {usdReference}</p>
        <p className={`mt-2 text-sm leading-relaxed ${highlighted ? "text-teal-100" : "text-zinc-600"}`}>{description}</p>
      </div>

      <ul className="mb-8 flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <CheckIcon className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? "text-gold-200" : "text-teal"}`} />
            <span className={`text-sm ${highlighted ? "text-white/92" : "text-zinc-700"}`}>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200 ${
          highlighted ? "bg-gold text-white shadow-sm hover:bg-gold-600" : "bg-teal-50 text-teal hover:bg-teal hover:text-white"
        }`}
      >
        {cta}
      </Link>
    </motion.div>
  )
}
