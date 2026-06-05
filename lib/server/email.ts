import { env, supportEnv } from "@/lib/server/env"

type EmailInput = {
  to: string
  subject: string
  text: string
}

export const sendTransactionalEmail = async ({ to, subject, text }: EmailInput) => {
  const recipient = to.trim().toLowerCase()
  if (!recipient) return

  if (!env.resendApiKey) {
    console.info("email_skipped", { to: recipient, subject })
    return
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
    const message = await res.text().catch(() => "")
    console.error("email_send_failed", { to: recipient, subject, message })
  }
}
