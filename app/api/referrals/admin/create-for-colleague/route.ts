import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession, isAdminEmail } from "@/lib/server/workspace"
import { generateReferralCode } from "@/lib/server/referrals"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

// Session + isAdminEmail only (no x-admin-key) - this route is called from the
// authenticated app/admin/referrals browser UI, which can never hold the
// ADMIN_SECRET_KEY used to gate the header-only app/api/admin/* ops routes.
const requireAdmin = async () => {
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  if (!isAdminEmail(session.user.email)) throw new Error("Forbidden")
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return notFound()
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const colleagueName = String(body.colleagueName ?? "").trim()
  const colleagueEmail = String(body.colleagueEmail ?? "").trim().toLowerCase()
  const department = typeof body.department === "string" ? body.department.trim() : undefined
  const discountPercent = typeof body.discountPercent === "number" ? Math.min(100, Math.max(0, body.discountPercent)) : 20
  const maxUses = typeof body.maxUses === "number" && body.maxUses > 0 ? Math.floor(body.maxUses) : null

  if (!colleagueName || !colleagueEmail) {
    return NextResponse.json({ error: "colleagueName and colleagueEmail are required." }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(colleagueEmail)) {
    return NextResponse.json({ error: "Enter a valid colleague email address." }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", colleagueEmail)
    .maybeSingle()

  try {
    const result = await generateReferralCode({
      referrerUserId: existingUser?.id || null,
      referrerName: colleagueName,
      referrerEmail: colleagueEmail,
      department,
      discountPercent,
      maxUses,
    })
    log.info("referrals.admin_created_for_colleague", { colleagueEmail })
    return NextResponse.json({ code: result.code, discountPercent }, { status: 201 })
  } catch (err) {
    log.error("referrals.admin_create_failed", { error: (err as Error).message })
    return NextResponse.json({ error: "Could not generate referral code. Please try again." }, { status: 500 })
  }
}
