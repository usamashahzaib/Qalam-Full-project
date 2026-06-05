"use client"

import Link from "next/link"
import { motion } from "framer-motion"

interface PricingCardProps {
  plan: string
  price: string
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
      whileHover={{ scale: 1.03, transition: { duration: 0.22, ease: "easeOut" } }}
      whileTap={{ scale: 0.99 }}
      className={`relative flex flex-col rounded-2xl border p-8 ${
        highlighted
          ? "bg-teal border-teal shadow-[0_8px_40px_rgba(13,74,69,0.25)]"
          : "bg-white/[0.08] backdrop-blur-md border-white/10 shadow-sm hover:border-gold/50 hover:shadow-[0_8px_32px_rgba(13,74,69,0.15)] transition-all duration-300"
      }`}
    >
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold text-white text-xs font-bold shadow-sm">
            ★ {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <p
          className={`text-sm font-semibold uppercase tracking-widest mb-2 ${
            highlighted ? "text-teal-200" : "text-teal"
          }`}
        >
          {plan}
        </p>
        <div className="flex items-end gap-1 mb-2">
          <span className={`text-5xl font-bold ${highlighted ? "text-white" : "text-white"}`}>
            {price}
          </span>
          {period && (
            <span className={`text-sm mb-2 ${highlighted ? "text-teal-200" : "text-white/60"}`}>
              /{period}
            </span>
          )}
        </div>
        <p className={`text-sm leading-relaxed ${highlighted ? "text-teal-200" : "text-white/60"}`}>
          {description}
        </p>
      </div>

      <ul className="flex flex-col gap-3 mb-8 flex-1">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5">
            <span className={`mt-0.5 text-sm ${highlighted ? "text-gold-200" : "text-teal"}`}>
              ✓
            </span>
            <span className={`text-sm ${highlighted ? "text-white/90" : "text-white/80"}`}>
              {feat}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 ${
          highlighted
            ? "bg-gold text-white hover:bg-gold-600 shadow-sm"
            : "bg-white/10 text-teal hover:bg-teal hover:text-white"
        }`}
      >
        {cta}
      </Link>
    </motion.div>
  )
}
