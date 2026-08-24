"use client"

type ResearchNotes = {
  hookPattern?: string
  hookType?: string
  framework?: string
  improvements?: string[]
} | null

interface WriterResearchNotesPanelProps {
  researchNotes: ResearchNotes
  setResearchNotes: (notes: ResearchNotes) => void
  researchNotesOpen: boolean
  setResearchNotesOpen: (updater: boolean | ((prev: boolean) => boolean)) => void
}

export function WriterResearchNotesPanel({
  researchNotes, setResearchNotes, researchNotesOpen, setResearchNotesOpen,
}: WriterResearchNotesPanelProps) {
  if (!researchNotes) return null
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
      <button
        onClick={() => setResearchNotesOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <h2 className="text-xs font-bold text-amber-800">Research Notes</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-amber-600">From Competitor Analyzer</span>
          <button
            onClick={(e) => { e.stopPropagation(); setResearchNotes(null) }}
            className="cursor-pointer text-[11px] font-bold text-amber-500 hover:text-amber-700"
          >
            Dismiss
          </button>
        </div>
      </button>
      {researchNotesOpen && (
        <div className="border-t border-amber-200 px-4 py-3 space-y-2">
          {researchNotes.hookPattern && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Hook pattern</p>
              <p className="text-xs text-amber-900">{researchNotes.hookPattern} · {researchNotes.hookType}</p>
            </div>
          )}
          {researchNotes.framework && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Framework</p>
              <p className="text-xs text-amber-900">{researchNotes.framework}</p>
            </div>
          )}
          {researchNotes.improvements?.length ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Improvements to apply</p>
              <ul className="mt-1 space-y-1">
                {researchNotes.improvements.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-amber-900">
                    <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
