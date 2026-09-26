"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ClientLinkMessage, ClientLinkShell, ClientLinkSkeleton } from "@/components/client-links/ClientLinkShell"

type Pitch = { agencyName: string; prospectName: string; prospectRole: string | null; samples: { angle: string; content: string }[]; createdAt: string; expiresAt: string }

export default function PitchPreviewPage() {
  const params = useParams()
  const token = String(params.token || "")
  const [pitch, setPitch] = useState<Pitch | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(0)

  useEffect(() => {
    let active = true
    fetch(`/api/share/pitch/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("not_found")
        return res.json() as Promise<{ pitch: Pitch }>
      })
      .then((data) => { if (active) setPitch(data.pitch) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [token])

  const firstName = pitch?.prospectName.split(" ")[0] || ""

  return (
    <ClientLinkShell source="pitch">
      {!pitch && !failed ? <ClientLinkSkeleton /> : null}
      {failed ? <ClientLinkMessage tone="error" title="This preview is no longer available" body="Preview links expire after 30 days. Ask the team who sent it for a fresh one." /> : null}

      {pitch ? (
        <div className="space-y-6">
          <header>
            <p className="t-eyebrow text-teal-700">Prepared by {pitch.agencyName}</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl">{firstName}, this is what your LinkedIn could sound like</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">Three sample posts written in your voice, based on how you already write. They are drafts to react to, not finished posts. Nothing here has been published.</p>
          </header>

          <div className="space-y-3">
            {pitch.samples.map((sample, index) => {
              const expanded = open === index
              return (
                <article key={index} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <button onClick={() => setOpen(expanded ? -1 : index)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                    <span>
                      <span className="block t-eyebrow text-zinc-400">Sample {index + 1}</span>
                      <span className="mt-0.5 block text-base font-bold text-zinc-900">{sample.angle}</span>
                    </span>
                    <svg className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {expanded ? (
                    <div className="border-t border-zinc-100 px-5 py-5">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-sm font-bold uppercase text-teal-800">{pitch.prospectName.charAt(0)}</span>
                        <span>
                          <span className="block text-sm font-bold text-zinc-900">{pitch.prospectName}</span>
                          {pitch.prospectRole ? <span className="block text-xs text-zinc-500">{pitch.prospectRole}</span> : null}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">{sample.content}</p>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-sm font-bold text-zinc-900">What happens if you work with {pitch.agencyName}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
              <li>You answer one short question a week, by text or voice note.</li>
              <li>You approve each draft from your phone, and can comment on any line.</li>
              <li>You connect LinkedIn once through LinkedIn&apos;s own page. No password is ever shared.</li>
            </ul>
            <p className="mt-4 text-sm text-zinc-600">Reply to the message this link came in to continue the conversation.</p>
          </div>
        </div>
      ) : null}
    </ClientLinkShell>
  )
}
