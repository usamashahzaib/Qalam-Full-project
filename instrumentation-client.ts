import type * as SentryTypes from "@sentry/nextjs"

// Sentry is loaded dynamically rather than imported at module scope.
//
// `enabled` only gates whether events are sent; a static import still ships
// the entire browser SDK to every visitor, including on marketing pages where
// it does nothing. That JS competes for bandwidth with the font and hero
// image on the critical path, and has to be parsed and executed before the
// page becomes interactive.
//
// Loading it behind the same condition that enables it means builds without a
// DSN, and every development session, never download it at all.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const shouldLoad = process.env.NODE_ENV === "production" && !!dsn

let sentryModule: typeof SentryTypes | null = null
const sentryReady: Promise<typeof SentryTypes | null> = shouldLoad
  ? import("@sentry/nextjs").then((mod) => {
      mod.init({ dsn, tracesSampleRate: 0.1 })
      sentryModule = mod
      return mod
    })
  : Promise.resolve(null)

// Next calls this on every client navigation. It has to exist synchronously,
// so it forwards to the SDK once loaded and is a no-op until then.
export const onRouterTransitionStart: typeof SentryTypes.captureRouterTransitionStart = (
  ...args
) => {
  if (sentryModule) {
    sentryModule.captureRouterTransitionStart(...args)
    return
  }
  void sentryReady.then((mod) => mod?.captureRouterTransitionStart(...args))
}
