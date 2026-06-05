"use client"

import { motion } from "framer-motion"

interface HookCardProps {
  index: number
  text: string
  selected: boolean
  onSelect: () => void
}

export function HookCard({ index, text, selected, onSelect }: HookCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.08,
      }}
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        selected
          ? "border-teal bg-teal-50 shadow-[0_0_0_3px_rgba(13,74,69,0.12)]"
          : "border-zinc-200 bg-white hover:border-teal/50 hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
            selected ? "bg-teal text-white" : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {index + 1}
        </span>
        <p className="text-sm text-zinc-800 leading-relaxed">{text}</p>
      </div>
    </motion.button>
  )
}
