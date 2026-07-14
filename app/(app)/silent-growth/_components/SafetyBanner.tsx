export function SafetyBanner() {
  return (
    <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <p className="text-xs font-semibold text-amber-900">
        All actions manual - copy suggestions, paste on LinkedIn yourself. Qalam does not post, comment, or interact with LinkedIn on your behalf here.
      </p>
    </div>
  )
}
