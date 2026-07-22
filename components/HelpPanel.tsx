"use client"

import Link from "next/link"
import { SUPPORT_EMAIL } from "@/lib/contact"

const QUICK_LINKS = [
  { label: "How to write a post", desc: "AI hooks, drafting, and scoring", href: "/writer" },
  { label: "How to schedule", desc: "Plan posts on the calendar", href: "/calendar" },
  { label: "How to use voice", desc: "Teach the AI your writing style", href: "/voice" },
] as const

const SHORTCUTS = [
  { keys: "Ctrl / Cmd + K", desc: "Open command menu" },
  { keys: "Enter", desc: "Send chat message" },
  { keys: "Shift + Enter", desc: "New line in chat or writer" },
] as const

export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close help panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-zinc-950/30"
      />
      <div className="relative flex h-full w-full max-w-sm flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-bold text-zinc-900">Help</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Quick links</p>
            <div className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="block rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-teal/40 hover:bg-teal/5"
                >
                  <span className="block text-sm font-semibold text-zinc-900">{link.label}</span>
                  <span className="block text-xs text-zinc-500">{link.desc}</span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Keyboard shortcuts</p>
            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
              {SHORTCUTS.map((shortcut) => (
                <div key={shortcut.keys} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-zinc-500">{shortcut.desc}</span>
                  <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                    {shortcut.keys}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contact support</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="block rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-teal/40 hover:bg-teal/5"
            >
              <span className="block text-sm font-semibold text-zinc-900">Email support</span>
              <span className="block text-xs text-zinc-500">{SUPPORT_EMAIL}</span>
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}
