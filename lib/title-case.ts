const MINOR_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "per", "the", "to", "vs", "via"])

/**
 * Headline-style capitalisation for UI headings: every word capitalised except
 * short connecting words in the middle. Acronyms and mixed-case terms such as
 * "ATS" or "LinkedIn" are left exactly as written.
 */
export function titleCase(value: string): string {
  const parts = value.split(/(\s+|-)/)
  const wordIndexes = parts.map((part, index) => (/^\s+$|^-$/.test(part) || !part ? -1 : index)).filter((index) => index >= 0)
  const first = wordIndexes[0]
  const last = wordIndexes[wordIndexes.length - 1]
  return parts
    .map((part, index) => {
      if (!part || /^\s+$|^-$/.test(part)) return part
      if (/[A-Z]/.test(part)) return part
      if (index !== first && index !== last && MINOR_WORDS.has(part.toLowerCase())) return part.toLowerCase()
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join("")
}
