import type { CSSProperties } from "react"

const outputs = [
  {
    index: "01",
    label: "LinkedIn authority",
    title: "A specific point of view",
    copy: "Better communication is not more talking. It is making the next decision obvious.",
  },
  {
    index: "02",
    label: "ATS resume",
    title: "An evidence-led bullet",
    copy: "Reduced weekly project reviews from 90 to 35 minutes by replacing status decks with decision prompts.",
  },
  {
    index: "03",
    label: "Recruiter position",
    title: "A credible signal",
    copy: "Operations leader who shortens decision cycles and creates clear ownership across teams.",
  },
]

export function CareerSignalMap() {
  return (
    <div className="relative rounded-[1.75rem] border border-teal/15 bg-white/88 p-4 shadow-[0_28px_70px_rgba(13,74,69,0.14)] backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-[0.67rem] font-bold uppercase tracking-[0.2em] text-gold-700">Career signal map</p>
          <p className="mt-1 text-xs text-zinc-500">Illustrative workflow using supplied facts</p>
        </div>
        <span className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-teal/15 bg-teal/5 px-3 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-teal">
          Human approved
        </span>
      </div>

      <div className="relative py-5">
        <div className="sig-in rounded-2xl border border-gold/30 bg-[#fffaf0] p-5" style={{ "--sig-delay": "0.15s" } as CSSProperties}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-extrabold text-teal-900">F</span>
            <div>
              <p className="text-[0.66rem] font-bold uppercase tracking-[0.17em] text-gold-700">Supplied career fact</p>
              <p className="mt-1 text-sm font-bold leading-6 text-zinc-900">Cut a weekly project review from 90 to 35 minutes.</p>
            </div>
          </div>
        </div>

        <div className="sig-line ml-9 h-7 w-px bg-gradient-to-b from-gold to-teal/30" style={{ "--sig-delay": "0.45s" } as CSSProperties} aria-hidden />

        <div className="space-y-3">
          {outputs.map((output, index) => (
            <div key={output.index} className="sig-in group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-teal/30 sm:p-5" style={{ "--sig-delay": `${0.6 + index * 0.22}s` } as CSSProperties}>
              <div className="absolute inset-y-0 left-0 w-1 bg-teal opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              <div className="flex gap-4">
                <span className="font-cormorant text-2xl font-semibold italic text-gold-700">{output.index}</span>
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-teal">{output.label}</p>
                  <h2 className="mt-1 text-sm font-bold text-zinc-900">{output.title}</h2>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">{output.copy}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500">
        Qalam shapes the language. You verify the facts and decide what leaves the workspace.
      </p>
    </div>
  )
}
