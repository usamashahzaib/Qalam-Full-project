import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { supabaseDelete, supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"

type LedgerRow = { id: string; name: string; engaged_date: string; reciprocate_by: string; created_at: string }

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const rows = await supabaseSelect<LedgerRow>(
      "engagement_ledger",
      `user_id=eq.${encodeURIComponent(user.id)}&select=id,name,engaged_date,reciprocate_by,created_at&order=created_at.desc&limit=200`
    ).catch(() => [])
    return NextResponse.json({ entries: rows })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const name = String(body.name || "").trim()
    const engagedDate = String(body.date || "").trim()
    const reciprocateBy = String(body.reciprocateBy || "").trim()
    const dateRe = /^\d{4}-\d{2}-\d{2}$/
    if (!name || name.length > 200) {
      return NextResponse.json({ error: "name is required (max 200 characters)" }, { status: 400 })
    }
    if (!dateRe.test(engagedDate) || !dateRe.test(reciprocateBy)) {
      return NextResponse.json({ error: "date and reciprocateBy must be YYYY-MM-DD" }, { status: 400 })
    }

    const inserted = await supabaseInsert<LedgerRow>("engagement_ledger", {
      user_id: user.id,
      name,
      engaged_date: engagedDate,
      reciprocate_by: reciprocateBy,
    }).catch((err: Error) => {
      log.error("silent_growth.ledger.insert_failed", { userId: user.id, error: err.message })
      return null
    })

    if (!inserted) {
      return NextResponse.json({ error: "Failed to save entry" }, { status: 500 })
    }

    return NextResponse.json({ entry: inserted[0] })
  })(request)
}

export async function DELETE(request: NextRequest) {
  return withAuth(async (req, user) => {
    const id = new URL(req.url).searchParams.get("id") || ""
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    await supabaseDelete("engagement_ledger", `id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}`)
    return NextResponse.json({ deleted: true })
  })(request)
}
