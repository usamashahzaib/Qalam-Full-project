export const toHundredPointScore = (value: unknown): number => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  const scaled = numeric > 0 && numeric <= 1
    ? numeric * 100
    : numeric > 1 && numeric <= 10
      ? numeric * 10
      : numeric
  return Math.max(0, Math.min(100, Math.round(scaled)))
}

export const normalizeScoreBreakdown = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, score]) => Number.isFinite(Number(score)))
      .map(([key, score]) => [key, toHundredPointScore(score)])
  )
}

export const normalizeScoredFreeToolResult = (
  value: unknown,
  scoreKey: string,
  breakdownKey: string,
): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const result = { ...(value as Record<string, unknown>) }
  result[scoreKey] = toHundredPointScore(result[scoreKey])
  result[breakdownKey] = normalizeScoreBreakdown(result[breakdownKey])
  return result
}

export const formatScoreLabel = (key: string): string =>
  key
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
