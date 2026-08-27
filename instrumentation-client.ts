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
const monitoredRoutePrefixes = [
  "/agency",
  "/analytics",
  "/approvals",
  "/billing",
  "/calendar",
  "/career",
  "/carousels",
  "/chat",
  "/comment-generator",
  "/competitors",
  "/dashboard",
  "/library",
  "/settings",
  "/silent-growth",
  "/upgrade",
  "/voice",
  "/writer",
]

const isMonitoredRoute = (url: string) => {
  const pathname = new URL(url, window.location.origin).pathname
  return monitoredRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

const shouldLoad = process.env.NODE_ENV === "production" && !!dsn && isMonitoredRoute(window.location.href)

let sentryModule: typeof SentryTypes | null = null
let sentryReady: Promise<typeof SentryTypes | null> | null = null

const loadSentry = () => {
  if (!sentryReady) {
    sentryReady = import("@sentry/nextjs").then((mod) => {
      mod.init({ dsn, tracesSampleRate: 0.1 })
      sentryModule = mod
      return mod
    })
  }
  return sentryReady
}

if (shouldLoad) void loadSentry()

// Next calls this on every client navigation. It has to exist synchronously,
// so it forwards to the SDK once loaded and is a no-op until then.
export const onRouterTransitionStart: typeof SentryTypes.captureRouterTransitionStart = (
  ...args
) => {
  if (process.env.NODE_ENV !== "production" || !dsn || !isMonitoredRoute(args[0])) return
  if (sentryModule) {
    sentryModule.captureRouterTransitionStart(...args)
    return
  }
  void loadSentry().then((mod) => mod?.captureRouterTransitionStart(...args))
}
