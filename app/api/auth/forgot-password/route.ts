import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { generateToken, hashToken } from "@/lib/server/password"
import { sendTransactionalEmail } from "@/lib/server/email"
import { getClientIp } from "@/lib/server/rate-limit"
import { checkAuthRateLimit } from "@/lib/server/queue"

// Generic success message - never reveal whether an email exists
const OK = { success: true, message: "If that email is registered, a password reset link is on its way." }

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rateLimit = await checkAuthRateLimit(ip, "forgot-password")
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait 1 hour and try again." },
      { status: 429 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const email = String(body.email ?? "").trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from("users")
    .select("id, email, full_name, auth_provider")
    .eq("email", email)
    .maybeSingle()

  // Only send reset link for email-auth users (OAuth users can't set a password here)
  if (user && user.auth_provider === "email") {
    const token = generateToken()
    const tokenHash = hashToken(token)

    try {
      await supabase.from("password_resets").insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    } catch { /* ignore */ }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://byqalam.com"
    sendTransactionalEmail({
      to: user.email,
      subject: "Reset your Qalam password",
      text: [
        `Hi ${user.full_name || "there"},`,
        "",
        "You requested a password reset for your Qalam account.",
        "",
        `Reset your password: ${siteUrl}/reset-password?token=${token}`,
        "",
        "This link expires in 1 hour.",
        "If you did not request this, you can safely ignore this email.",
      ].join("\n"),
    }).catch(() => undefined)
  }

  // Always return the same response to prevent email enumeration
  return NextResponse.json(OK)
}
