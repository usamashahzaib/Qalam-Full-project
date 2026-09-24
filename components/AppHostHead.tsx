import { headers } from "next/headers"
import { isPwaHost } from "@/lib/app-host"

/**
 * Web app manifest and iOS install tags for pages served on the app host.
 * Reading the request host makes the calling route dynamic, so this belongs
 * only in layouts that are already per-request (the app group, auth screens
 * and client token pages), never in the root layout, which must stay static
 * for the marketing site. React hoists these tags into <head>.
 */
export async function AppHostHead() {
  const headersList = await headers()
  if (!isPwaHost(headersList.get("x-forwarded-host") || headersList.get("host"))) return null

  return (
    <>
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Qalam" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    </>
  )
}
