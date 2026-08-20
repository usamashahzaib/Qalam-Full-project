// Shared between proxy.ts (edge) and components/GoogleAnalytics.tsx (node) so
// both sides derive the exact same bytes for the one inline script the app
// ships (GA's dataLayer bootstrap). Content is fully deterministic at build
// time, so CSP can allow it by hash instead of by per-request nonce - the
// hash then works identically on statically rendered pages, where no nonce
// exists at request time.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || ""

export const isValidGaMeasurementId = (id: string) => /^G-[A-Z0-9]{6,}$/.test(id)

export const gaInlineScript = (measurementId: string): string =>
  `window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', '${measurementId}');`

export const isGaActive = process.env.NODE_ENV === "production" && isValidGaMeasurementId(GA_MEASUREMENT_ID)

async function sha256Base64(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest("SHA-256", data)
  let binary = ""
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// Computed once per runtime instance (edge or node) and reused - the input
// never changes without a redeploy, so there is no point re-hashing per request.
let cachedHash: Promise<string> | null = null

export const gaScriptHash = (): Promise<string> => {
  if (!isGaActive) return Promise.resolve("")
  if (!cachedHash) cachedHash = sha256Base64(gaInlineScript(GA_MEASUREMENT_ID))
  return cachedHash
}
