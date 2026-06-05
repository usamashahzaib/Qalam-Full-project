"use client"

import { motion } from "framer-motion"

interface TestimonialCardProps {
  quote: string
  name: string
  title: string
  company: string
  initials: string
  color: string
  index?: number
}

export function TestimonialCard({
  quote,
  name,
  title,
  company,
  initials,
  color,
  index = 0,
}: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.12 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-7 shadow-sm hover:shadow-[0_8px_32px_rgba(13,74,69,0.2)] hover:border-gold/30 transition-all duration-300 flex flex-col"
    >
      {/* Stars */}
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="text-gold text-sm">★</span>
        ))}
      </div>

      {/* Quote */}
      <blockquote className="font-cormorant text-lg italic text-white/70 leading-relaxed flex-1 mb-6">
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: color }}
        >
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs text-white/60">
            {title} · {company}
          </p>
        </div>
        <div className="ml-auto">
          <div className="w-5 h-5 rounded bg-[#0A66C2] flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">in</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
