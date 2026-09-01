import type { CSSProperties } from "react"

// Shows the actual voice-memory mechanism rather than asserting it: examples the
// user deliberately saves, the professional context stored alongside them, the
// retrieval step that pulls the most relevant examples into a draft, and the
// human review that gates everything after. Labels are paragraphs, not headings,
// so the hero visual does not compete with the page heading outline.

const savedExamples = [
  {
    tag: "Example 1",
    text: "Most teams do not have a meetings problem. They have a decision problem. The meeting is just where it becomes visible.",
  },
  {
    tag: "Example 4",
    text: "I killed our weekly status deck. Nobody asked for it back. That told me more than the six months we spent maintaining it.",
  },
]

const contextChips = ["Operations lead", "B2B SaaS", "Writing for founders and COOs"]

export function VoiceMemoryPanel() {
  return (
    <div className="relative rounded-[1.75rem] border border-teal/15 bg-white/88 p-4 shadow-[0_28px_70px_rgba(13,74,69,0.14)] backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="t-eyebrow text-gold-700">Voice profile</p>
          <p className="mt-1 text-xs text-zinc-500">Illustrative example using sample data</p>
        </div>
        <span className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-teal/15 bg-teal/5 px-3 t-eyebrow text-teal">
          You saved this
        </span>
      </div>

      <div className="py-5">
        <p className="t-eyebrow text-teal">Writing examples you saved</p>
        <div className="mt-3 space-y-2.5">
          {savedExamples.map((example, index) => (
            <div
              key={example.tag}
              className="sig-in rounded-2xl border border-gold/30 bg-[#fffaf0] p-4"
              style={{ "--sig-delay": `${0.15 + index * 0.12}s` } as CSSProperties}
            >
              <p className="t-eyebrow text-gold-700">{example.tag}</p>
              <p className="mt-1.5 text-xs leading-5 text-zinc-700">{example.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {contextChips.map((chip) => (
            <span key={chip} className="inline-flex min-h-7 items-center rounded-full border border-teal/15 bg-teal/5 px-2.5 text-[0.7rem] font-semibold text-teal">
              {chip}
            </span>
          ))}
        </div>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-teal/20" aria-hidden />
          <span className="shrink-0 text-xs font-semibold text-teal/70">2 of 6 examples retrieved for this topic</span>
          <span className="h-px w-4 bg-teal/20" aria-hidden />
        </div>

        <div className="sig-in rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5" style={{ "--sig-delay": "0.7s" } as CSSProperties}>
          <div className="flex items-center justify-between gap-3">
            <p className="t-eyebrow text-teal">Draft, before your edit</p>
            <span className="inline-flex min-h-7 items-center rounded-full bg-zinc-100 px-2.5 text-[0.7rem] font-semibold text-zinc-600">
              Awaiting review
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-800">
            We cut the weekly review from 90 minutes to 35. Not by running it better. By deleting the part where eight people watched one person read a slide.
          </p>
        </div>
      </div>

      <p className="border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500">
        Qalam shapes the language from what you saved. You verify the facts and decide what leaves the workspace.
      </p>
    </div>
  )
}
