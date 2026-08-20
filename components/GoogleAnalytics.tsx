import { GA_MEASUREMENT_ID, isGaActive, gaInlineScript } from "@/lib/csp-inline-scripts"

/**
 * GA4 tag, rendered server-side into <head> so it is parser-inserted.
 * Allowed by CSP via an explicit googletagmanager.com host entry (external
 * tag) plus a build-time content hash (inline bootstrap) instead of a nonce -
 * see proxy.ts buildCsp - so this renders identically on statically
 * generated marketing pages, where no per-request nonce exists.
 * Skipped outside production so local and preview traffic stays out of the
 * property.
 */
export function GoogleAnalytics() {
  if (!isGaActive) return null

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: gaInlineScript(GA_MEASUREMENT_ID) }} />
    </>
  )
}
