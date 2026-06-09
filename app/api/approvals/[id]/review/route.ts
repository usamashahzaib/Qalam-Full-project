import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = createServiceClient()

  const { data: approval } = await supabase
    .from("approvals")
    .select("id, post_title, post_content, status, message, comment, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (!approval) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ approval })
}
