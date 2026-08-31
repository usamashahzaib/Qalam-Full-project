type QalamEvidenceFieldVariant = "hero" | "quiet" | "cta"

interface QalamEvidenceFieldProps {
  variant?: QalamEvidenceFieldVariant
  className?: string
}

export function QalamEvidenceField({
  variant = "quiet",
  className = "",
}: QalamEvidenceFieldProps) {
  return (
    <div
      aria-hidden="true"
      className={`qalam-evidence-field qalam-evidence-field--${variant} ${className}`.trim()}
    >
      <div className="qalam-evidence-field__grid" />
      <div className="qalam-evidence-field__glow" />
    </div>
  )
}
