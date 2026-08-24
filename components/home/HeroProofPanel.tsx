"use client"

import { useEffect, useRef } from "react"
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Variants,
} from "framer-motion"

/* Hero visual: a physical stack of authority artifacts, cascading in depth.
   Weightless (pure vector + HTML/CSS/motion, no raster assets) so it scales
   crisp on any density and never gates LCP.

   Each artifact carries real product content - a scored resume fragment, a
   voice-matched LinkedIn post preview, and an authority score panel - so the
   hero reads as "your professional evidence, layered" rather than a wireframe.
   The cards use the site's existing double-bezel language: warm cream outer
   tray, white inner core, hairline gold accents, ambient teal-tinted shadow.

   Motion runs on the site's own expo-out curve. Pointer parallax leans the
   whole stack toward the cursor, gated to fine pointers and disabled under
   reduced-motion. On mobile the tilts and negative-margin overlaps collapse
   to a clean vertical stack, per skill's mobile-collapse rule. */

const EASE = [0.16, 1, 0.3, 1] as const
const PARALLAX_SPRING = { stiffness: 90, damping: 16, mass: 0.6 }

const stackContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
}

const backCardIn: Variants = {
  hidden: { opacity: 0, y: 24, rotate: -3 },
  show: { opacity: 1, y: 0, rotate: -3, transition: { duration: 0.9, ease: EASE } },
}

const midCardIn: Variants = {
  hidden: { opacity: 0, y: 28, rotate: 2 },
  show: { opacity: 1, y: 0, rotate: 2, transition: { duration: 0.9, ease: EASE } },
}

const frontCardIn: Variants = {
  hidden: { opacity: 0, y: 36, rotate: 0, scale: 0.96 },
  show: { opacity: 1, y: 0, rotate: 0, scale: 1, transition: { duration: 0.95, ease: EASE } },
}

const softIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

const drawIn: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.2, ease: EASE },
      opacity: { duration: 0.25 },
    },
  },
}

export function HeroProofPanel() {
  const frameRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const rotateX = useSpring(tiltY, PARALLAX_SPRING)
  const rotateY = useSpring(tiltX, PARALLAX_SPRING)
  const stackTransform = useMotionTemplate`perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reset = () => { tiltX.set(0); tiltY.set(0) }
    if (prefersReducedMotion || !finePointer.matches) { reset(); return }
    const onMove = (event: PointerEvent) => {
      const f = frameRef.current
      if (!f || event.pointerType === "touch") return
      const b = f.getBoundingClientRect()
      const nx = Math.max(-1, Math.min(1, (event.clientX - (b.left + b.width / 2)) / (window.innerWidth * 0.5)))
      const ny = Math.max(-1, Math.min(1, (event.clientY - (b.top + b.height / 2)) / (window.innerHeight * 0.55)))
      // Gentle: the whole stack leans, it does not chase.
      tiltX.set(nx * 3)
      tiltY.set(ny * -2.4)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("blur", reset)
    document.addEventListener("mouseleave", reset)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("blur", reset)
      document.removeEventListener("mouseleave", reset)
    }
  }, [prefersReducedMotion, tiltX, tiltY])

  // Reduced motion resolves the stack to its finished state on first paint -
  // starting at "show" means no hidden->show tween runs.
  const initialState = prefersReducedMotion ? "show" : "hidden"

  return (
    <div
      ref={frameRef}
      className="relative isolate mx-auto w-full max-w-[560px]"
      aria-label="Illustration: a stack of authority artifacts - a scored resume, a voice-matched post, and an authority score panel"
    >
      {/* Ambient ground: one soft cream-to-sage radial wash. No filters, no
         blur-3xl, no layout cost. */}
      <div
        className="pointer-events-none absolute inset-x-[4%] inset-y-[6%] rounded-[46%] bg-[radial-gradient(circle_at_52%_46%,rgba(214,231,222,0.85),rgba(214,231,222,0.28)_58%,transparent_78%)]"
        aria-hidden
      />
      {/* Off-main-thread motes */}
      <span className="particle-slow pointer-events-none absolute left-[6%] top-[18%] h-2 w-2 rounded-full bg-gold/45" style={{ ["--dur" as string]: "9s" }} aria-hidden />
      <span className="particle-slow pointer-events-none absolute right-[8%] top-[10%] h-1.5 w-1.5 rounded-full bg-teal/35" style={{ ["--dur" as string]: "11s", ["--delay" as string]: "1.5s" }} aria-hidden />
      <span className="particle-slow pointer-events-none absolute bottom-[10%] left-[16%] h-1.5 w-1.5 rounded-full bg-teal/30" style={{ ["--dur" as string]: "10s", ["--delay" as string]: "0.8s" }} aria-hidden />
      <span className="particle-slow pointer-events-none absolute bottom-[16%] right-[10%] h-2 w-2 rounded-full bg-gold/35" style={{ ["--dur" as string]: "12s", ["--delay" as string]: "2.2s" }} aria-hidden />

      <motion.div
        className="relative min-h-[520px] w-full sm:min-h-[560px] lg:min-h-[600px]"
        style={{ transform: prefersReducedMotion ? undefined : stackTransform }}
      >
        <motion.div
          className="relative h-full w-full"
          variants={stackContainer}
          initial={initialState}
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
        >
          {/* BACK LAYER - scored resume fragment. Sits behind, tilted left. */}
          <motion.div
            variants={backCardIn}
            className="pointer-events-none absolute left-[2%] top-[3%] w-[74%] origin-top-left sm:top-[4%] motion-reduce:rotate-0"
            style={{ transformOrigin: "20% 30%" }}
          >
            {/* Double-bezel: warm cream tray + white core, concentric radii. */}
            <div className="rounded-[24px] bg-[#efe8d6]/70 p-1.5 shadow-[0_18px_36px_-18px_rgba(13,74,69,0.22),0_2px_6px_-2px_rgba(13,74,69,0.10)] ring-1 ring-[#0d4a45]/8">
              <div className="rounded-[18px] bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-cormorant text-[15px] font-semibold leading-tight text-teal">Sarah A. Khan</p>
                    <p className="mt-0.5 text-[10px] font-medium tracking-[0.06em] text-zinc-500">Senior Product Manager  ·  Fintech</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-gold-700">
                    ATS 96
                  </span>
                </div>
                {/* Hairline */}
                <div className="mt-3 h-px w-full bg-[#0d4a45]/8" />
                {/* Achievement bullet with real, specific claim */}
                <div className="mt-3 flex gap-2">
                  <svg viewBox="0 0 20 20" className="mt-[3px] h-3 w-3 flex-none text-gold" aria-hidden>
                    <path d="M4 10 l4 4 l8 -10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[10.5px] leading-[1.55] text-zinc-700">
                    Cut weekly review from 90 to 35 min; every action left the meeting with an owner and a date.
                  </p>
                </div>
                <div className="mt-2 flex gap-2">
                  <svg viewBox="0 0 20 20" className="mt-[3px] h-3 w-3 flex-none text-gold" aria-hidden>
                    <path d="M4 10 l4 4 l8 -10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[10.5px] leading-[1.55] text-zinc-700">
                    Shipped tiered pricing that lifted quarterly ARR 18% without new acquisition spend.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* MID LAYER - LinkedIn-style post preview, tilted right. */}
          <motion.div
            variants={midCardIn}
            className="pointer-events-none absolute right-[1%] top-[24%] w-[76%] origin-top-right sm:top-[26%] motion-reduce:rotate-0"
            style={{ transformOrigin: "80% 30%" }}
          >
            <div className="rounded-[26px] bg-[#efe8d6]/70 p-1.5 shadow-[0_22px_42px_-18px_rgba(13,74,69,0.24),0_2px_6px_-2px_rgba(13,74,69,0.10)] ring-1 ring-[#0d4a45]/8">
              <div className="rounded-[20px] bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {/* Byline */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal to-teal-700 font-cormorant text-[15px] font-semibold text-[#f2e6c7]">
                    SK
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-semibold text-zinc-900">Sarah A. Khan</p>
                    <p className="truncate text-[9.5px] text-zinc-500">Senior PM · Fintech · 3rd</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-teal/25 bg-teal/8 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] text-teal">
                    Voice 96
                  </span>
                </div>
                {/* Real post body */}
                <p className="mt-3 text-[11px] leading-[1.55] text-zinc-800">
                  Our weekly project review used to take 90 minutes and still end without clear owners. I replaced the deck with three questions: what changed, what is blocked, and who decides next.
                </p>
                <p className="mt-1.5 text-[11px] font-medium leading-[1.55] text-teal">
                  Better communication isn&apos;t more talking. It&apos;s making the next decision obvious.
                </p>
                {/* Engagement row - understated, no fake logo */}
                <div className="mt-3.5 flex items-center gap-3 border-t border-[#0d4a45]/8 pt-2.5 text-[9.5px] text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" /> 1,284
                  </span>
                  <span>·</span>
                  <span>147 reposts</span>
                  <span>·</span>
                  <span>92 replies</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* FRONT LAYER - authority score panel with drawn-on gold arc. */}
          <motion.div
            variants={frontCardIn}
            className="pointer-events-none absolute bottom-[2%] left-[9%] w-[68%] origin-bottom-left"
            style={{ transformOrigin: "30% 80%" }}
          >
            <div className="rounded-[28px] bg-[#efe8d6]/85 p-2 shadow-[0_28px_60px_-20px_rgba(13,74,69,0.32),0_4px_10px_-2px_rgba(13,74,69,0.14)] ring-1 ring-[#0d4a45]/10">
              <div className="rounded-[22px] bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="flex items-center gap-4">
                  {/* Seal + drawn-on authority ring */}
                  <div className="relative h-[68px] w-[68px] flex-none">
                    <svg viewBox="0 0 68 68" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                      <defs>
                        <linearGradient id="qpp-seal" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#0f5650" />
                          <stop offset="1" stopColor="#0a3a36" />
                        </linearGradient>
                        <linearGradient id="qpp-gold" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#E8C079" />
                          <stop offset="0.55" stopColor="#C9871F" />
                          <stop offset="1" stopColor="#875613" />
                        </linearGradient>
                      </defs>
                      <circle cx="34" cy="34" r="22" fill="url(#qpp-seal)" />
                      <text x="34" y="34" textAnchor="middle" dominantBaseline="central" fill="#F2E6C7" fontSize="24" fontWeight="600" fontFamily="var(--font-cormorant), Georgia, serif">Q</text>
                      {/* 91% arc, drawn on. */}
                      <motion.path
                        variants={drawIn}
                        d="M34 4 A30 30 0 1 1 6.5 47"
                        fill="none" stroke="url(#qpp-gold)" strokeWidth="3.5" strokeLinecap="round"
                      />
                      <motion.circle variants={softIn} cx="6.5" cy="47" r="3.2" fill="#C9871F" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-gold-700">Authority Score</p>
                    <p className="mt-0.5 font-cormorant text-[38px] font-semibold leading-none text-teal">91</p>
                    <p className="mt-1 text-[10px] text-zinc-500">Positioning, evidence, and voice - transparent method</p>
                  </div>
                </div>
                {/* Score dimensions - real names from the site's own methodology */}
                <div className="mt-4 grid grid-cols-4 gap-2 border-t border-[#0d4a45]/8 pt-3">
                  {[
                    { k: "Positioning", v: "9.2" },
                    { k: "Evidence", v: "8.7" },
                    { k: "Voice", v: "9.4" },
                    { k: "Match", v: "8.9" },
                  ].map((d) => (
                    <motion.div key={d.k} variants={softIn} className="flex flex-col items-start">
                      <span className="font-cormorant text-[18px] font-semibold leading-none text-teal">{d.v}</span>
                      <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-500">{d.k}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Editorial caption - brand voice, not a data claim. */}
      <motion.div
        className="pointer-events-none absolute right-[1%] top-[-2%] text-right"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.65 }}
        aria-hidden
      >
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-teal/75">Evidence in</p>
        <p className="mt-1.5 font-cormorant text-xl italic text-gold-700">Proof out.</p>
      </motion.div>
    </div>
  )
}
