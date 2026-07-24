import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { supabaseSelect } from "@/lib/server/supabase-rest"

type PaymentRow = {
  id: string
  plan_name: string
  billing_cycle: "monthly" | "annual"
  amount: number
  currency: string
  status: "paid" | "failed" | "cancelled" | "partially_refunded" | "refunded"
  processed_at: string
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const rows = await supabaseSelect<PaymentRow>(
      "payments",
      `user_id=eq.${encodeURIComponent(user.id)}&select=id,plan_name,billing_cycle,amount,currency,status,processed_at&order=processed_at.desc&limit=50`
    )

    return NextResponse.json({
      payments: rows.map((row) => ({
        id: row.id,
        planName: row.plan_name,
        billingCycle: row.billing_cycle,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        processedAt: row.processed_at,
      })),
    })
  })(request)
}
