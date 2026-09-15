"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ClientLinkMessage, ClientLinkShell, ClientLinkSkeleton } from "@/components/client-links/ClientLinkShell"
import { LinkedInIcon } from "@/components/ui/qalam-icons"

type Handoff = {
  status: "ready" | "used" | "expired" | "revoked"
  workspaceName: string
  inviterName: string | null
  recipientName: string | null
  reason: "manual" | "guardian"
  expiresAt: string
}

const PROMISES = [
  ["You approve on LinkedIn's own page", "Your password never passes through anyone else, including us."],
  ["Only publishing access", "Posts go out after they are approved. Nobody gets your inbox or connections."],
  ["You can remove it any time", "LinkedIn settings, Data privacy, Permitted services."],
]

export default function ConnectLinkedInPage() {
  const params = useParams()
  const token = String(params.token || "")
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [failed, setFailed] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/share/handoff/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("not_found")
        return res.json() as Promise<Handoff>
      })
      .then((data) => { if (active) setHandoff(data) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [token])

  return (
    <ClientLinkShell>
      {!handoff && !failed ? <ClientLinkSkeleton /> : null}
      {failed ? (
        <ClientLinkMessage tone="error" title="This link is not valid" body="It may have been copied incompletely or withdrawn. Ask your agency contact for a fresh link." />
      ) : null}
      {handoff && handoff.status !== "ready" ? (
        <ClientLinkMessage
          tone={handoff.status === "used" ? "success" : "error"}
          title={handoff.status === "used" ? "LinkedIn is already connected" : "This link has expired"}
          body={handoff.status === "used"
            ? `This link was already used to connect LinkedIn for ${handoff.workspaceName}. Nothing else is needed.`
            : "For your security, connect links work once and only for seven days. Ask your agency contact for a new one."}
        />
      ) : null}
      {handoff?.status === "ready" ? (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">{handoff.workspaceName}</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl">
              {handoff.reason === "guardian" ? "Reconnect your LinkedIn" : "Connect your LinkedIn"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {handoff.reason === "guardian"
                ? "LinkedIn asks for a fresh approval every few weeks. Reconnect now so your scheduled posts keep publishing."
                : `${handoff.inviterName || "Your agency team"} prepares and schedules your posts. Connect once, and approved posts publish on time without anyone asking for your password.`}
            </p>
          </div>

          <ul className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
            {PROMISES.map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                </span>
                <span>
                  <span className="block text-sm font-semibold text-zinc-900">{title}</span>
                  <span className="block text-xs leading-5 text-zinc-500">{body}</span>
                </span>
              </li>
            ))}
          </ul>

          <a
            href={`/api/share/handoff/${encodeURIComponent(token)}/start`}
            onClick={() => setStarting(true)}
            aria-disabled={starting}
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#084e96] ${starting ? "pointer-events-none opacity-70" : ""}`}
          >
            <LinkedInIcon className="h-4 w-4" />
            {starting ? "Opening LinkedIn..." : "Continue with LinkedIn"}
          </a>
          <p className="text-center text-xs text-zinc-500">
            Link valid until {new Date(handoff.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Works once.
          </p>
        </div>
      ) : null}
    </ClientLinkShell>
  )
}
