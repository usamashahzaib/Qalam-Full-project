import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { generateToken, hashToken } from "@/lib/server/password"
import { sendTransactionalEmail } from "@/lib/server/email"
import { getClientIp } from "@/lib/server/rate-limit"
import { checkAuthRateLimit } from "@/lib/server/queue"
import { log } from "@/lib/server/logging"
import { APP_URL } from "@/lib/seo"

// Generic success message - never reveal whether an email exists or is already verified.
const OK = {
  success: true,
  message: "If that email needs verifying, a new verification link is on its way.",
}

// Lets a user request a fresh verification email when the original never arrived
// (e.g. a transient email-delivery outage). Mirrors forgot-password: rate-limited,
// enumeration-safe, and only acts for unverified email-auth accounts.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rateLimit = await checkAuthRateLimit(ip, "resend-verification")
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
    .select("id, email, full_name, auth_provider, email_verified")
    .eq("email", email)
    .maybeSingle()

  // Only email-auth users who have not yet verified get a link. OAuth users are
  // verified on provision, and already-verified users need nothing.
  if (user && user.auth_provider === "email" && !user.email_verified) {
    const token = generateToken()
    const tokenHash = hashToken(token)

    // Only send if the token row persisted - otherwise the link would be dead.
    const { error: insertError } = await supabase.from("email_verifications").insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    if (insertError) {
      log.error("resend-verification.token_insert_failed", { userId: user.id, error: insertError.message })
    } else {
      sendTransactionalEmail({
        to: user.email,
        subject: "Verify your Qalam account",
        text: [
          `Hi ${user.full_name || "there"},`,
          "",
          "Verify your email address to activate your Qalam account:",
          `${APP_URL}/verify-email?token=${token}`,
          "",
          "This link expires in 24 hours.",
          "If you did not create an account, you can safely ignore this email.",
        ].join("\n"),
      }).then((result) => {
        if (!result.ok) {
          log.error("resend-verification.email_not_sent", { userId: user.id, error: result.error })
        }
      }).catch((err: unknown) => {
        log.error("resend-verification.email_failed", { userId: user.id, error: err instanceof Error ? err.message : String(err) })
      })
    }
  }

  // Always return the same response to prevent email enumeration.
  return NextResponse.json(OK)
}
