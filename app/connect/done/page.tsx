import { ClientLinkMessage, ClientLinkShell } from "@/components/client-links/ClientLinkShell"

const REASONS: Record<string, string> = {
  cancelled: "LinkedIn access was not approved. You can open the same link again to try once more.",
  link_used: "This link was already used. If LinkedIn is still not connected, ask your agency contact for a new link.",
  link_expired: "This link has expired. Ask your agency contact for a new one.",
  not_found: "This link is not valid. Ask your agency contact for a fresh link.",
  rate_limited: "Too many attempts from this connection. Wait a minute and open the link again.",
  state_mismatch: "The secure session timed out. Open the original link again and continue within ten minutes.",
  not_configured: "LinkedIn connection is temporarily unavailable. Please try again later.",
  connect_failed: "LinkedIn did not complete the connection. Open the original link and try again.",
}

export default async function ConnectDonePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const success = params.status === "success"
  const reason = typeof params.reason === "string" ? params.reason : "connect_failed"

  return (
    <ClientLinkShell source="connect">
      {success ? (
        <ClientLinkMessage
          tone="success"
          title="LinkedIn is connected"
          body="Thank you. Your team has been notified, and approved posts will now publish on schedule. You can close this page."
        />
      ) : (
        <ClientLinkMessage tone="error" title="LinkedIn is not connected yet" body={REASONS[reason] || REASONS.connect_failed} />
      )}
    </ClientLinkShell>
  )
}
