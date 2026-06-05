"use client"

import { motion, type Easing } from "framer-motion"

interface FadeInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  direction?: "up" | "down" | "left" | "right" | "none"
  once?: boolean
  ease?: Easing
}

const offsets: Record<NonNullable<FadeInProps["direction"]>, object> = {
  up: { y: 28 },
  down: { y: -28 },
  left: { x: 28 },
  right: { x: -28 },
  none: {},
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = "up",
  once = true,
  ease = "easeOut",
}: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration, ease, delay }}
    >
      {children}
    </motion.div>
  )
}
