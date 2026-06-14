export function isValidLinkedInUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    const url = new URL(value.trim())
    const host = url.hostname.replace(/^www\./, "")
    return host === "linkedin.com" && /^\/(in|company)\/[A-Za-z0-9-_%]+\/?$/.test(url.pathname)
  } catch {
    return false
  }
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
