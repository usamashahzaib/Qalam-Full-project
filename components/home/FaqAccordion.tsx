"use client"

import { useId, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  const prefersReducedMotion = useReducedMotion()
  const baseId = useId()

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const isOpen = open === index
        const panelId = `${baseId}-panel-${index}`
        const buttonId = `${baseId}-button-${index}`

        return (
          <div key={item.q} className="panel-raised overflow-hidden">
            <h3>
              <button
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
              >
                <span className="t-h3 text-zinc-900">{item.q}</span>
                {/* Two bars rather than a "+" glyph. The character rendered
                    at whatever weight and optical centre the font happened to
                    give it, and collapsing the vertical bar is a truer
                    plus-to-minus than rotating a plus 45 degrees into an x. */}
                <motion.span
                  aria-hidden="true"
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="relative ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-500"
                >
                  <span className="absolute h-0.5 w-3 rounded-full bg-current" />
                  <motion.span
                    className="absolute h-3 w-0.5 rounded-full bg-current"
                    animate={{ scaleY: isOpen ? 0 : 1 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                  />
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="t-body px-6 pb-5 text-zinc-600">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
