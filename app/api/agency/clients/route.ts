import { NextRequest, NextResponse } from "next/server"
import { getAppSession } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest) {
  try {
    const session = getAppSession(request)
    if (!session?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 })

    const clients = await supabaseSelect(
      "agency_clients",
      `agency_email=eq.${encodeURIComponent(session.email)}&order=created_at.desc`
    )

    return NextResponse.json({ clients: clients || [] })
  } catch (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getAppSession(request)
    if (!session?.email) return NextResponse.json({ error: "auth_required" }, { status: 401 })

    const body = await request.json()
    if (!body.clientName) return NextResponse.json({ error: "missing_fields" }, { status: 400 })

    const result = await supabaseInsert(
      "agency_clients",
      {
        agency_email: session.email,
        client_name: body.clientName,
        client_email: body.clientEmail || null,
        status: "active",
        plan: body.plan || "Standard",
        updated_at: new Date().toISOString()
      },
      "return=representation"
    )

    return NextResponse.json({ client: result?.[0] || null })
  } catch (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
