import { getIndexNowKey } from "@/lib/server/indexnow"

export function GET() {
  const key = getIndexNowKey()
  return key
    ? new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" } })
    : new Response("Not configured", { status: 404 })
}
