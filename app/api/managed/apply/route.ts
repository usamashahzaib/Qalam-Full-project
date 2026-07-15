import { NextRequest, NextResponse } from "next/server"
import { supabaseInsert } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { getClientIp, TokenBucket } from "@/lib/server/rate-limit"
import { UPGRADES_EMAIL } from "@/lib/contact"
import { MANAGED_PLANS } from "@/lib/pricing"

const MANAGED_PACKAGE_NAMES = new Set(MANAGED_PLANS.map((p) => p.name))

// Same shape as contact_submissions - 5 submissions per 15 minutes per IP.
const applyLimiter = new TokenBucket(5, 5, 15 * 60 * 1000)

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const allowed = await applyLimiter.tryConsume(`managed-apply:${ip}`)
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait before submitting again." }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const name = String(body.name ?? "").trim()
  const email = String(body.email ?? "").trim().toLowerCase()
  const company = String(body.company ?? "").trim()
  const linkedinUrl = String(body.linkedinUrl ?? "").trim()
  const pkg = String(body.package ?? "").trim()
  const message = String(body.message ?? "").trim()

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }
  if (!MANAGED_PACKAGE_NAMES.has(pkg)) {
    return NextResponse.json({ error: "Choose a managed package." }, { status: 400 })
  }
  if (linkedinUrl && !/^https?:\/\/(www\.)?linkedin\.com\//i.test(linkedinUrl)) {
    return NextResponse.json({ error: "LinkedIn URL must be a linkedin.com link." }, { status: 400 })
  }

  try {
    await supabaseInsert(
      "managed_leads",
      { name, email, company: company || null, linkedin_url: linkedinUrl || null, package: pkg, message: message || null, ip, created_at: new Date().toISOString() },
      "return=minimal",
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg !== "schema_not_applied") {
      console.error("[managed/apply] db insert failed:", msg)
    }
  }

  await sendTransactionalEmail({
    to: UPGRADES_EMAIL,
    subject: `[Managed Services] ${pkg} - ${name}`,
    text: [
      `New Managed Services application`,
      ``,
      `Name:     ${name}`,
      `Email:    ${email}`,
      `Company:  ${company || "-"}`,
      `LinkedIn: ${linkedinUrl || "-"}`,
      `Package:  ${pkg}`,
      ``,
      `Message:`,
      message || "-",
      ``,
      `---`,
      `IP: ${ip}`,
      `Time: ${new Date().toUTCString()}`,
    ].join("\n"),
  }).catch(() => undefined)

  return NextResponse.json({ success: true })
}
