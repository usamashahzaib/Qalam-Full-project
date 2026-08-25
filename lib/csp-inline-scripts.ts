// Shared between proxy.ts (edge) and components/GoogleAnalytics.tsx (node) so
// both sides derive the exact same bytes for the one inline script the app
// ships (GA's dataLayer bootstrap). Content is fully deterministic at build
// time, so CSP can allow it by hash instead of by per-request nonce - the
// hash then works identically on statically rendered pages, where no nonce
// exists at request time.

/**
 * Deployment environment for analytics routing.
 *
 * On Vercel every `next build` sets NODE_ENV=production, including preview
 * deployments. Gating analytics on NODE_ENV alone therefore has two possible
 * failure modes: (a) always fire to the production property, contaminating the
 * baseline with preview traffic, or (b) never fire outside true production,
 * making the funnel un-validatable until a real user experiences it.
 *
 * The fix is an explicit environment tier. NEXT_PUBLIC_VERCEL_ENV is set by
 * Vercel to "production", "preview", or "development". NEXT_PUBLIC_QALAM_ENV
 * overrides it for local production-mode builds or off-Vercel hosts. Anything
 * unrecognized falls back to "development" so accidental production tagging is
 * impossible from an environment we do not understand.
 */
export type DeploymentEnv = "production" | "preview" | "development"

export const deploymentEnv: DeploymentEnv = ((): DeploymentEnv => {
  const raw = (process.env.NEXT_PUBLIC_QALAM_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || "").toLowerCase().trim()
  if (raw === "production") return "production"
  if (raw === "preview") return "preview"
  return "development"
})()

const PRODUCTION_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || ""
const PREVIEW_ID = process.env.NEXT_PUBLIC_GA_PREVIEW_MEASUREMENT_ID?.trim() || ""

export const isValidGaMeasurementId = (id: string) => /^G-[A-Z0-9]{6,}$/.test(id)

/**
 * Selects the measurement ID for the current environment. Preview uses its own
 * dedicated ID or nothing - never the production ID - so a preview deploy can
 * be validated end to end without polluting the production property. Anything
 * not clearly production or preview never gets an ID.
 */
export const GA_MEASUREMENT_ID: string = ((): string => {
  if (deploymentEnv === "production" && isValidGaMeasurementId(PRODUCTION_ID)) return PRODUCTION_ID
  if (deploymentEnv === "preview" && isValidGaMeasurementId(PREVIEW_ID)) return PREVIEW_ID
  // A preview deploy without a preview ID configured is deliberately silent.
  // Better a measurement gap than production data poisoned by preview traffic.
  return ""
}) ()

export const gaInlineScript = (measurementId: string): string =>
  `window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', '${measurementId}');`

export const isGaActive = GA_MEASUREMENT_ID !== ""

/**
 * Guards accidental sharing of one measurement ID across environments. The
 * release-check script uses this so a preview build that inherited the
 * production ID fails loudly rather than silently mixing data.
 */
export const gaEnvironmentReport = () => ({
  deploymentEnv,
  productionIdSet: isValidGaMeasurementId(PRODUCTION_ID),
  previewIdSet: isValidGaMeasurementId(PREVIEW_ID),
  sharesIdAcrossEnvs: Boolean(PRODUCTION_ID) && PRODUCTION_ID === PREVIEW_ID,
  activeIdFingerprint: GA_MEASUREMENT_ID ? `${GA_MEASUREMENT_ID.slice(0, 4)}...${GA_MEASUREMENT_ID.slice(-3)}` : "",
})

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
