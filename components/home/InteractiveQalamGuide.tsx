"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion"

const HEAD_SPRING = { mass: 1, stiffness: 100, damping: 10 }
const HEAD_MASK = "radial-gradient(ellipse 19.5% 17.5% at 51% 13.5%, #000 98%, transparent 100%)"
const BODY_MASK = "radial-gradient(ellipse 18% 16% at 51% 13.5%, transparent 98%, #000 100%)"
const PORTRAIT_FADE = "linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%)"

const rabbitImageProps = {
  src: "/brand/qalam-film/qalam-rabbit.png",
  width: 1024,
  height: 1536,
  sizes: "(max-width: 640px) 118vw, 650px",
}

export function InteractiveQalamGuide() {
  const guideRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const targetHeadX = useMotionValue(0)
  const targetHeadY = useMotionValue(0)
  const targetHeadRotate = useMotionValue(0)
  const targetGlintX = useMotionValue(0)
  const targetGlintY = useMotionValue(0)

  const headX = useSpring(targetHeadX, HEAD_SPRING)
  const headY = useSpring(targetHeadY, HEAD_SPRING)
  const headRotate = useSpring(targetHeadRotate, HEAD_SPRING)
  const glintX = useSpring(targetGlintX, HEAD_SPRING)
  const glintY = useSpring(targetGlintY, HEAD_SPRING)

  const headTransform = useMotionTemplate`perspective(900px) rotateX(${headY}deg) rotateY(${headX}deg) rotateZ(${headRotate}deg)`
  const glintTransform = useMotionTemplate`translate3d(${glintX}px, ${glintY}px, 0)`

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")

    const resetPose = () => {
      targetHeadX.set(0)
      targetHeadY.set(0)
      targetHeadRotate.set(0)
      targetGlintX.set(0)
      targetGlintY.set(0)
    }

    const followPointer = (event: PointerEvent) => {
      const guide = guideRef.current
      if (!guide || prefersReducedMotion || !finePointer.matches || event.pointerType === "touch") return

      const bounds = guide.getBoundingClientRect()
      const centerX = bounds.left + bounds.width * 0.52
      const centerY = bounds.top + bounds.height * 0.2
      const normalizedX = Math.max(-1, Math.min(1, (event.clientX - centerX) / (window.innerWidth * 0.42)))
      const normalizedY = Math.max(-1, Math.min(1, (event.clientY - centerY) / (window.innerHeight * 0.52)))

      targetHeadX.set(normalizedX * 3.2)
      targetHeadY.set(normalizedY * -2.6)
      targetHeadRotate.set(normalizedX * 1.4)
      targetGlintX.set(normalizedX * 4)
      targetGlintY.set(normalizedY * 3)
    }

    if (prefersReducedMotion || !finePointer.matches) {
      resetPose()
      return
    }

    window.addEventListener("pointermove", followPointer, { passive: true })
    window.addEventListener("blur", resetPose)
    document.addEventListener("mouseleave", resetPose)

    return () => {
      window.removeEventListener("pointermove", followPointer)
      window.removeEventListener("blur", resetPose)
      document.removeEventListener("mouseleave", resetPose)
    }
  }, [
    prefersReducedMotion,
    targetGlintX,
    targetGlintY,
    targetHeadRotate,
    targetHeadX,
    targetHeadY,
  ])

  return (
    <div
      ref={guideRef}
      className="relative isolate mx-auto min-h-[460px] w-full max-w-[560px] overflow-hidden sm:min-h-[520px] lg:min-h-[590px]"
      aria-label="Interactive Qalam rabbit guide"
    >
      <div
        className="absolute bottom-[-6%] right-[-5%] h-[86%] w-[86%] rounded-[46%] bg-[radial-gradient(circle_at_50%_42%,rgba(220,233,223,0.98),rgba(220,233,223,0.44)_60%,transparent_76%)] blur-sm"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-7%] right-[-3%] h-[80%] w-[80%] rounded-[46%] border border-teal/10"
        aria-hidden="true"
      />

      <div className="absolute right-[1%] top-[12%] z-30 text-right" aria-hidden="true">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-teal/75">Qalam guide</p>
        <p className="mt-2 font-cormorant text-lg italic text-gold-700">Present. Attentive. Yours.</p>
      </div>

      <div
        className="absolute -right-[10%] top-0 z-10 w-[118%] sm:-right-[8%] sm:w-[116%]"
        style={{ WebkitMaskImage: PORTRAIT_FADE, maskImage: PORTRAIT_FADE }}
      >
        <Image
          {...rabbitImageProps}
          alt="Qalam's black rabbit guide wearing a teal overshirt and ivory trousers"
          priority
          className="h-auto w-full"
          style={{ WebkitMaskImage: BODY_MASK, maskImage: BODY_MASK }}
        />

        <motion.div
          style={{ transform: headTransform, transformOrigin: "51% 30%" }}
          className="pointer-events-none absolute inset-0 will-change-transform"
          aria-hidden="true"
        >
          <Image
            {...rabbitImageProps}
            alt=""
            priority
            className="h-auto w-full"
            style={{ WebkitMaskImage: HEAD_MASK, maskImage: HEAD_MASK }}
          />

          <motion.span
            style={{ transform: glintTransform }}
            className="absolute left-[46.8%] top-[16.5%] h-1.5 w-1.5 rounded-full bg-[#fff4cf]/90 shadow-[0_0_8px_rgba(255,244,207,0.85)]"
          />
          <motion.span
            style={{ transform: glintTransform }}
            className="absolute left-[54.2%] top-[16.7%] h-1.5 w-1.5 rounded-full bg-[#fff4cf]/90 shadow-[0_0_8px_rgba(255,244,207,0.85)]"
          />
        </motion.div>
      </div>

    </div>
  )
}
