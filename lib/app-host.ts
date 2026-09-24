// The product runs on app.byqalam.com; the marketing site never registers the
// service worker or advertises the web app manifest. Local development serves
// every route on one origin, so localhost counts as the app host too.
const PWA_HOSTS = new Set(["app.byqalam.com", "localhost", "127.0.0.1"])

export function isPwaHost(host: string | null | undefined): boolean {
  const hostname = String(host || "").split(":")[0].trim().toLowerCase()
  return PWA_HOSTS.has(hostname)
}
