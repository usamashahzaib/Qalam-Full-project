"use client"

import { useEffect } from "react"
import Image from "next/image"
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion"

const SPRING = { mass: 1, stiffness: 100, damping: 10 }

export function InteractiveQalamGuide() {
  const prefersReducedMotion = useReducedMotion()
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  const targetRotate = useMotionValue(0)
  const targetGlintX = useMotionValue(0)
  const targetGlintY = useMotionValue(0)

  const x = useSpring(targetX, SPRING)
  const y = useSpring(targetY, SPRING)
  const rotate = useSpring(targetRotate, SPRING)
  const glintX = useSpring(targetGlintX, SPRING)
  const glintY = useSpring(targetGlintY, SPRING)

  const characterTransform = useMotionTemplate`translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`
  const glintTransform = useMotionTemplate`translate3d(${glintX}px, ${glintY}px, 0)`

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")

    const resetPose = () => {
      targetX.set(0)
      targetY.set(0)
      targetRotate.set(0)
      targetGlintX.set(0)
      targetGlintY.set(0)
    }

    const followPointer = (event: PointerEvent) => {
      if (prefersReducedMotion || !finePointer.matches || event.pointerType === "touch") return

      const normalizedX = (event.clientX / window.innerWidth - 0.5) * 2
      const normalizedY = (event.clientY / window.innerHeight - 0.5) * 2

      targetX.set(normalizedX * 20)
      targetY.set(normalizedY * 12)
      targetRotate.set(normalizedX * 2.4)
      targetGlintX.set(normalizedX * 4.5)
      targetGlintY.set(normalizedY * 3)
    }

    if (prefersReducedMotion || !finePointer.matches) {
      resetPose()
      return
    }

    window.addEventListener("pointermove", followPointer, { passive: true })
    window.addEventListener("blur", resetPose)

    return () => {
      window.removeEventListener("pointermove", followPointer)
      window.removeEventListener("blur", resetPose)
    }
  }, [
    prefersReducedMotion,
    targetGlintX,
    targetGlintY,
    targetRotate,
    targetX,
    targetY,
  ])

  return (
    <div
      className="relative isolate mx-auto min-h-[500px] w-full max-w-[560px] overflow-visible sm:min-h-[640px] lg:min-h-[700px]"
      aria-label="Interactive Qalam rabbit guide"
    >
      <div
        className="absolute bottom-[8%] right-[1%] h-[72%] w-[72%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(220,233,223,0.95),rgba(220,233,223,0.38)_58%,transparent_72%)] blur-sm"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[9%] right-[3%] h-[66%] w-[66%] rounded-full border border-teal/10"
        aria-hidden="true"
      />
      <div className="absolute bottom-[2%] right-[5%] h-16 w-[74%] rounded-[50%] bg-teal/[0.12] blur-xl" aria-hidden="true" />

      <div className="absolute right-[1%] top-[12%] z-0 text-right" aria-hidden="true">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-teal/35">Qalam guide</p>
        <p className="mt-2 font-cormorant text-lg italic text-gold-700/70">Present. Attentive. Yours.</p>
      </div>

      <motion.div
        style={{ transform: characterTransform, transformOrigin: "54% 82%" }}
        className="absolute -bottom-[1%] right-[-4%] z-10 h-[98%] w-[96%] will-change-transform sm:right-[-2%]"
      >
        <Image
          src="/brand/qalam-film/qalam-rabbit.png"
          alt="Qalam's black rabbit guide wearing a teal overshirt and ivory trousers"
          fill
          priority
          sizes="(max-width: 640px) 96vw, 560px"
          className="object-contain object-bottom-right drop-shadow-[0_24px_30px_rgba(13,74,69,0.16)]"
        />

        <motion.span
          style={{ transform: glintTransform }}
          className="absolute left-[49.8%] top-[17.3%] h-1.5 w-1.5 rounded-full bg-[#fff4cf]/90 shadow-[0_0_8px_rgba(255,244,207,0.85)]"
          aria-hidden="true"
        />
        <motion.span
          style={{ transform: glintTransform }}
          className="absolute left-[56.1%] top-[17.5%] h-1.5 w-1.5 rounded-full bg-[#fff4cf]/90 shadow-[0_0_8px_rgba(255,244,207,0.85)]"
          aria-hidden="true"
        />
      </motion.div>
    </div>
  )
}
