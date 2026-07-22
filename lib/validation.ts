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

/**
 * Narrows an attacker-supplied post-login redirect to a same-origin path.
 *
 * A bare `startsWith("/")` check is not enough: `//evil.com` and a slash followed
 * by a backslash both begin with a slash and are treated by browsers as
 * protocol-relative absolute URLs, so pushing one navigates the user straight off
 * the site. Anything that is not a plain same-origin path falls back to the default.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  const raw = (value || "").trim()
  if (!raw.startsWith("/")) return fallback
  // Second character decides: another slash or a backslash makes this an absolute,
  // off-origin URL rather than a path on this site.
  const second = raw.charCodeAt(1)
  if (second === 47 || second === 92) return fallback
  // Browsers strip control characters and whitespace before resolving a URL, so a
  // tab or newline could otherwise smuggle a protocol-relative target past the
  // check above. Reject anything at or below the space character.
  for (let i = 0; i < raw.length; i += 1) {
    if (raw.charCodeAt(i) <= 32) return fallback
  }
  return raw
}
