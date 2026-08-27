"use client"

import { useId, useState } from "react"

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
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
                <span
                  aria-hidden="true"
                  className={`relative ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-transform duration-300 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                >
                  <span className="absolute h-0.5 w-3 rounded-full bg-current" />
                  <span
                    className={`absolute h-3 w-0.5 rounded-full bg-current transition-transform duration-300 motion-reduce:transition-none ${isOpen ? "scale-y-0" : "scale-y-100"}`}
                  />
                </span>
              </button>
            </h3>
            {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="qlx-mobile-section-enter overflow-hidden"
                >
                  <p className="t-body px-6 pb-5 text-zinc-600">{item.a}</p>
                </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
