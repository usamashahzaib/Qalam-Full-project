export function normalizeLinkedInUrl(value: string): string | null {
  const raw = value.trim()
  if (!raw) return ""
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(candidate)
    const host = url.hostname.toLowerCase().replace(/^www\./, "")
    const match = url.pathname.match(/^\/(in|company)\/([A-Za-z0-9_%.-]+)\/?$/)
    if (url.protocol !== "https:" || host !== "linkedin.com" || url.port || url.username || url.password || !match) return null
    return `https://www.linkedin.com/${match[1]}/${match[2]}`
  } catch {
    return null
  }
}

export const isValidLinkedInUrl = (value: string): boolean => normalizeLinkedInUrl(value) !== null

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
