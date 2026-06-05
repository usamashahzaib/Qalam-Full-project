"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

interface FadeUpProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  y?: number
  once?: boolean
}

export function FadeUp({
  children,
  className,
  delay = 0,
  duration = 0.65,
  y = 40,
  once = true,
}: FadeUpProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once, margin: "-80px 0px" })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{
        duration,
        ease: [0.16, 1, 0.3, 1],
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}
