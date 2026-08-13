/*
  No fallback ID on purpose. A hardcoded default means an unset or misspelled env
  var silently ships every visitor to whatever property was baked into the bundle,
  which is exactly how one site ends up reporting into another site's analytics.
  Unset means no tag at all.

  Note this is a NEXT_PUBLIC_ var, so it is inlined at build time: changing it on
  the host requires a redeploy, not just an env edit.
*/
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || ""

// Guards against a stray quote or placeholder text reaching the tag URL.
const isValidMeasurementId = (id: string) => /^G-[A-Z0-9]{6,}$/.test(id)

/**
 * GA4 tag, rendered server-side into <head> so it is parser-inserted and can
 * carry the per-request CSP nonce (same pattern as the JSON-LD block).
 * Skipped outside production so local and preview traffic stays out of the
 * property.
 */
export function GoogleAnalytics({ nonce }: { nonce?: string }) {
  if (process.env.NODE_ENV !== "production" || !isValidMeasurementId(GA_MEASUREMENT_ID)) return null

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        nonce={nonce}
      />
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
        }}
      />
    </>
  )
}
