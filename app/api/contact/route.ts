import { NextRequest, NextResponse } from "next/server"
import { supabaseInsert } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { getClientIp } from "@/lib/server/rate-limit"
import { supportEnv } from "@/lib/server/env"

/*
  Run once in Supabase SQL editor to persist submissions:

  create table if not exists contact_submissions (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    email       text not null,
    subject     text not null,
    message     text not null,
    ip          text,
    created_at  timestamptz not null default now()
  );
*/

const CONTACT_LIMITS = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = CONTACT_LIMITS.get(ip)
  if (bucket && bucket.resetAt > now) {
    bucket.count += 1
    return bucket.count > 5
  }
  CONTACT_LIMITS.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  return false
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before submitting again." },
      { status: 429 },
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
  const subject = String(body.subject ?? "").trim()
  const message = String(body.message ?? "").trim()

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 })
  }
  if (name.length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }
  if (subject.length < 3) {
    return NextResponse.json({ error: "Subject must be at least 3 characters." }, { status: 400 })
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "Message must be at least 10 characters." }, { status: 400 })
  }

  // Store in DB - silent if table not yet created
  try {
    await supabaseInsert(
      "contact_submissions",
      { id: crypto.randomUUID(), name, email, subject, message, ip, created_at: new Date().toISOString() },
      "return=minimal",
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg !== "schema_not_applied") {
      console.error("[contact] db insert failed:", msg)
    }
  }

  // Notify support inbox
  await sendTransactionalEmail({
    to: supportEnv.email,
    subject: `[Qalam Contact] ${subject}`,
    text: [
      `New contact form submission`,
      ``,
      `From:    ${name} <${email}>`,
      `Subject: ${subject}`,
      ``,
      `Message:`,
      message,
      ``,
      `---`,
      `IP: ${ip}`,
      `Time: ${new Date().toUTCString()}`,
    ].join("\n"),
  }).catch(() => undefined)

  return NextResponse.json({ success: true })
}
