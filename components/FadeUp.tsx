"use client"

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react"

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
  const [revealed, setRevealed] = useState(true)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !window.IntersectionObserver) return

    const isInitiallyVisible = element.getBoundingClientRect().top < window.innerHeight - 80
    setRevealed(isInitiallyVisible)

    const observer = new IntersectionObserver(
      ([entry]) => {
        setRevealed(entry.isIntersecting)
        if (entry.isIntersecting && once) observer.unobserve(element)
      },
      { rootMargin: "0px 0px -80px" },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [once])

  const style = {
    "--fade-up-delay": `${delay}s`,
    "--fade-up-duration": `${duration}s`,
    "--fade-up-distance": `${y}px`,
  } as CSSProperties

  return (
    <div
      ref={ref}
      className={`fade-up ${revealed ? "is-revealed" : ""} ${className || ""}`}
      style={style}
    >
      {children}
    </div>
  )
}
