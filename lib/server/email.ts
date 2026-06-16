import { env, supportEnv } from "@/lib/server/env"

type EmailInput = {
  to: string
  subject: string
  text: string
}

export const sendTransactionalEmail = async ({ to, subject, text }: EmailInput): Promise<{ ok: boolean; error?: string }> => {
  const recipient = to.trim().toLowerCase()
  if (!recipient) return { ok: false, error: "no_recipient" }

  if (!env.resendApiKey) {
    console.info("email_skipped", { to: recipient, subject })
    return { ok: false, error: "no_api_key" }
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.transactionalEmailFrom || supportEnv.email,
      to: recipient,
      subject,
      text,
    }),
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "unknown" })) as { message?: string }
    const message = body.message || "send_failed"
    console.error("email_send_failed", { to: recipient, subject, message })
    return { ok: false, error: message }
  }

  return { ok: true }
}
