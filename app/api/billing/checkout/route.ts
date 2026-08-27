import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/server/env"
import { getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"

const variants = { Growth: env.lemonSqueezyGrowthVariantId, Pro: env.lemonSqueezyProVariantId } as const

export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get("plan") as keyof typeof variants | null
  if (!plan || !variants[plan] || !env.lemonSqueezyStoreUrl) {
    return NextResponse.json({ error: "checkout_not_configured" }, { status: 503 })
  }
  try {
    const context = await getWorkspaceSessionContext()
    const workspaceId = await resolveWorkspaceId(request)
    const base = `${env.lemonSqueezyStoreUrl.replace(/\/$/, "")}/checkout/buy/${variants[plan]}`
    const query = new URLSearchParams({
      "checkout[custom][user_id]": context.supabaseUserId,
      "checkout[custom][workspace_id]": workspaceId,
      "checkout[custom][plan]": plan,
      "checkout[custom][billing_cycle]": "quarterly",
      "checkout[success_url]": `${env.frontendOrigin}/dashboard?billing=success`,
    })
    return NextResponse.redirect(`${base}?${query.toString()}`)
  } catch {
    const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url))
  }
}
