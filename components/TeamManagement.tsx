"use client"

import { useCallback, useEffect, useState } from "react"

type Member = {
  userId: string
  role: string
  joinedAt: string
  email: string | null
  fullName: string | null
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  client_reviewer: "Client reviewer",
  viewer: "Viewer",
}

const INVITE_ROLES: { value: string; label: string; hint: string }[] = [
  { value: "editor", label: "Editor", hint: "Drafts, schedules, and publishes for this client." },
  { value: "client_reviewer", label: "Client reviewer", hint: "Approves or rejects drafts. Can't publish or edit." },
  { value: "viewer", label: "Viewer", hint: "Read-only access to this workspace." },
]

export function TeamManagement({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("editor")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const loadMembers = useCallback(() => {
    setIsLoading(true)
    setError(null)
    fetch(`/api/workspaces/${workspaceId}/members`)
      .then((res) => res.json())
      .then((data) => {
        if (data.members) setMembers(data.members)
        else setError(data.error || "Could not load team members.")
      })
      .catch(() => setError("Could not load team members."))
      .finally(() => setIsLoading(false))
  }, [workspaceId])

  useEffect(() => { loadMembers() }, [loadMembers])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setIsInviting(true)
    setInviteMsg(null)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "invite_failed")
      setInviteMsg({ text: data.status === "email_sent_no_account" ? `Invite sent to ${inviteEmail}. They'll join once they sign up.` : `${inviteEmail} added to ${workspaceName}.`, ok: true })
      setInviteEmail("")
      loadMembers()
    } catch (e) {
      const code = (e as Error).message
      const friendly: Record<string, string> = {
        forbidden: "Your role can't invite members here.",
        cannot_invite_yourself: "You can't invite yourself.",
        already_a_member: "That person is already on this workspace.",
        seat_limit_reached: "You've hit your plan's seat limit. Upgrade to add more.",
      }
      setInviteMsg({ text: friendly[code] || "Could not send invite. Try again.", ok: false })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    setBusyUserId(userId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error()
      loadMembers()
    } catch {
      setError("Could not update that member's role.")
    } finally {
      setBusyUserId(null)
    }
  }

  const handleRemove = async (userId: string) => {
    setBusyUserId(userId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      loadMembers()
    } catch {
      setError("Could not remove that member.")
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Team - {workspaceName}</p>

      {isLoading ? (
        <div className="py-4 text-center text-xs text-zinc-400">Loading team...</div>
      ) : error ? (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      ) : (
        <div className="mb-4 space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-zinc-900">{m.fullName || m.email || "Pending member"}</p>
                {m.email ? <p className="text-xs text-zinc-500">{m.email}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                {m.role === "owner" ? (
                  <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-teal-800">Owner</span>
                ) : (
                  <select
                    value={m.role}
                    disabled={busyUserId === m.userId}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 outline-none focus:border-teal/50 disabled:opacity-50"
                  >
                    {INVITE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                    {!INVITE_ROLES.some((r) => r.value === m.role) ? <option value={m.role}>{ROLE_LABELS[m.role] || m.role}</option> : null}
                  </select>
                )}
                {m.role !== "owner" ? (
                  <button
                    onClick={() => handleRemove(m.userId)}
                    disabled={busyUserId === m.userId}
                    className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {!members.length ? <p className="text-xs text-zinc-400">No team members yet.</p> : null}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:items-center">
        <input
          type="email"
          placeholder="teammate@email.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-teal/50"
          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:border-teal/50"
        >
          {INVITE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button
          onClick={handleInvite}
          disabled={isInviting || !inviteEmail.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-50"
        >
          {isInviting ? "Sending..." : "Invite"}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-400">
        {INVITE_ROLES.find((r) => r.value === inviteRole)?.hint}
      </p>
      {inviteMsg ? (
        <p className={`mt-2 text-xs font-medium ${inviteMsg.ok ? "text-emerald-700" : "text-red-600"}`}>{inviteMsg.text}</p>
      ) : null}
    </div>
  )
}
