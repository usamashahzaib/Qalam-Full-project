import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { hashPassword, generateToken, hashToken } from "@/lib/server/password"
import { sendTransactionalEmail } from "@/lib/server/email"
import { getClientIp } from "@/lib/server/rate-limit"
import { checkAuthRateLimit } from "@/lib/server/queue"
import { log } from "@/lib/server/logging"

const VALID_ROLES = [
  "HR Professional",
  "Marketing Professional",
  "Founder / Entrepreneur",
  "Consultant",
  "Content Creator",
  "Other",
]

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rateLimit = await checkAuthRateLimit(ip, "signup")
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please wait 15 minutes before trying again." },
      { status: 429 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const name = String(body.name ?? "").trim()
  const email = String(body.email ?? "").trim().toLowerCase()
  const password = String(body.password ?? "")
  const role = String(body.role ?? "").trim()

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 })
  }
  if (name.length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }
  if (password.length > 1000) {
    return NextResponse.json({ error: "Password is too long." }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Select a valid role." }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check duplicate email
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in." },
      { status: 409 }
    )
  }

  const userId = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const verificationToken = generateToken()
  const verificationTokenHash = hashToken(verificationToken)

  // Create user
  const { error: insertErr } = await supabase.from("users").insert({
    id: userId,
    email,
    full_name: name,
    password_hash: passwordHash,
    auth_provider: "email",
    email_verified: false,
    role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (insertErr) {
    return NextResponse.json({ error: "Could not create account. Please try again." }, { status: 500 })
  }

  // Bootstrap plan_usage, workspace, membership - fail silently (schema may vary)
  try {
    await supabase
      .from("plan_usage")
      .insert({ user_id: userId, plan: "free", ai_drafts_used: 0, carousels_used: 0, hooks_used: 0, analyses_used: 0 })
  } catch { /* ignore - table may not exist yet */ }

  const workspaceId = crypto.randomUUID()
  try {
    await supabase.from("workspaces").insert({
      id: workspaceId,
      name: `${name}'s Workspace`,
      owner_id: userId,
      owner_email: email,
      slug: `workspace-${userId.slice(0, 8)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  } catch { /* ignore */ }

  try {
    await supabase.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: "owner",
    })
  } catch { /* ignore */ }

  // Redeem non-expired pending workspace invites for this email
  try {
    const { data: invites } = await supabase
      .from("workspace_invites")
      .select("workspace_id, role, expires_at")
      .eq("email", email)
    if (invites && invites.length > 0) {
      const now = new Date()
      const validInvites = invites.filter(
        (inv: { workspace_id: string; role: string; expires_at?: string | null }) =>
          !inv.expires_at || new Date(inv.expires_at) > now
      )
      if (validInvites.length > 0) {
        await supabase
          .from("workspace_members")
          .insert(validInvites.map((inv: { workspace_id: string; role: string }) => ({
            workspace_id: inv.workspace_id,
            user_id: userId,
            role: inv.role,
          })))
      }
      await supabase.from("workspace_invites").delete().eq("email", email)
    }
  } catch { /* ignore - workspace_invites table may not exist yet */ }

  // Save email verification token — required for the user to verify their address.
  const { error: verificationErr } = await supabase.from("email_verifications").insert({
    user_id: userId,
    token_hash: verificationTokenHash,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })
  if (verificationErr && verificationErr.code !== "42P01") {
    log.error("signup.verification_token_failed", { error: verificationErr.message })
    await supabase.from("users").delete().eq("id", userId).then(undefined, () => undefined)
    return NextResponse.json({ error: "Could not create account. Please try again." }, { status: 500 })
  }

  // Send verification email (fire-and-forget)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://byqalam.com"
  sendTransactionalEmail({
    to: email,
    subject: "Verify your Qalam account",
    text: [
      `Welcome to Qalam, ${name}!`,
      "",
      "Verify your email address to activate your account:",
      `${siteUrl}/verify-email?token=${verificationToken}`,
      "",
      "This link expires in 24 hours.",
      "If you did not create an account, ignore this email.",
    ].join("\n"),
  }).catch(() => undefined)

  return NextResponse.json({
    success: true,
    message: "Account created. Check your email to verify your address before signing in.",
  })
}
