import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { resolvePricingCurrency } from "@/lib/geo-pricing"

export async function GET() {
  const pricingCurrency = resolvePricingCurrency(await headers())

  return NextResponse.json(pricingCurrency, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  })
}
