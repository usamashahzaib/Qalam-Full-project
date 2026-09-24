import "server-only"

import { env } from "@/lib/server/env"
import { supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"
import { createNotification } from "@/lib/server/notifications"
import { log } from "@/lib/server/logging"
import { HEADS_UP_LEAD_MS } from "@/lib/agency/approval-timing"
import { TOKEN_WARNING_DAYS, sortExceptions } from "@/lib/agency/health"
import { pickWeeklyQuestion, weekKey } from "@/lib/agency/voice-drop-questions"
import { processAutoApprove } from "@/lib/server/agency/approval-decision"
import { WORKSPACE_COLUMNS, inList, isUuid, listMemberWorkspaces, type AgencyWorkspace } from "@/lib/server/agency/access"
import { effectiveExpiry } from "@/lib/server/agency/linkedin-status"
import { createHandoffLink } from "@/lib/server/agency/handoff"
import { createVoiceDrop } from "@/lib/server/agency/voice-drops"
import { buildClientHealth } from "@/lib/server/agency/portfolio"
import { fridayWrapEmail, monthlyProofEmail, sendAgencyEmail } from "@/lib/server/agency/emails"
import { collectProofSnapshot, storeProofReport } from "@/lib/server/agency/proof"
import { previousMonthPeriod } from "@/lib/agency/proof"

const DAY_MS = 24 * 60 * 60 * 1000

/** Insert-as-lock. A duplicate key means another run already did this job. */
async function claimJob(jobKey: string): Promise<boolean> {
  try {
    await supabaseInsert("agency_job_claims", { job_key: jobKey.slice(0, 200) }, "return=minimal")
    return true
  } catch (error) {
    const message = (error as Error).message || ""
    if (/duplicate|23505|already exists|409/i.test(message)) return false
    throw error
  }
}

export type JobScope = { workspaceIds?: string[] }

const scopeFilter = (column: string, scope: JobScope) =>
  scope.workspaceIds ? `&${column}=in.${inList(scope.workspaceIds)}` : ""

export async function runAutoApproveSweep(now = new Date(), scope: JobScope = {}) {
  const horizon = new Date(now.getTime() + HEADS_UP_LEAD_MS + 5 * 60_000).toISOString()
  const due = await supabaseSelect<{ id: string }>(
    "approvals",
    `status=eq.pending&auto_approve_at=not.is.null&auto_approve_at=lte.${encodeURIComponent(horizon)}${scopeFilter("workspace_id", scope)}&select=id&order=auto_approve_at.asc&limit=200`
  )
  const outcomes = { headsUp: 0, approved: 0 }
  for (const row of due || []) {
    const outcome = await processAutoApprove(row.id, now).catch((error) => {
      log.error("agency.auto_approve_sweep_item_failed", { approvalId: row.id, error: (error as Error).message })
      return "skipped" as const
    })
    if (outcome === "heads_up") outcomes.headsUp++
    if (outcome === "approved") outcomes.approved++
  }
  return { checked: due?.length ?? 0, ...outcomes }
}

type AccountRow = { id: string; workspace_id: string; expires_at: string | null; refresh_token: string | null; refresh_token_expires_at: string | null }

async function managersOf(workspaceId: string) {
  const rows = await supabaseSelect<{ user_id: string }>("workspace_members", `workspace_id=eq.${workspaceId}&role=in.(owner,admin)&select=user_id`).catch(() => [])
  return (rows || []).map((row) => row.user_id).filter(isUuid)
}

/**
 * Seven days before a client's LinkedIn access lapses, the client gets a
 * fresh connect link (when a contact email exists) and managers get an alert.
 * Warned once per connection: storing a new token clears the marker.
 */
export async function runTokenGuardian(now = new Date(), scope: JobScope = {}) {
  const accounts = await supabaseSelect<AccountRow & { expiry_warning_sent_at: string | null }>(
    "publishing_accounts",
    `provider=eq.linkedin&expiry_warning_sent_at=is.null${scopeFilter("workspace_id", scope)}&select=id,workspace_id,expires_at,refresh_token,refresh_token_expires_at,expiry_warning_sent_at&limit=1000`
  )
  const threshold = now.getTime() + TOKEN_WARNING_DAYS * DAY_MS
  const expiring = (accounts || []).filter((account) => {
    const expiry = effectiveExpiry(account, now.getTime())
    return expiry !== null && Date.parse(expiry) <= threshold
  })
  if (!expiring.length) return { warned: 0, linksSent: 0 }

  const workspaces = await supabaseSelect<AgencyWorkspace>(
    "workspaces",
    `id=in.${inList(expiring.map((account) => account.workspace_id))}&workspace_type=eq.client&archived_at=is.null&select=${WORKSPACE_COLUMNS}`
  )
  const byId = new Map((workspaces || []).map((workspace) => [workspace.id, workspace]))
  let warned = 0
  let linksSent = 0

  for (const account of expiring) {
    const workspace = byId.get(account.workspace_id)
    if (!workspace) continue
    const claimed = await supabasePatch("publishing_accounts", `id=eq.${account.id}&expiry_warning_sent_at=is.null`, { expiry_warning_sent_at: now.toISOString() })
    if (!claimed?.length) continue
    warned++

    const expiry = Date.parse(effectiveExpiry(account, now.getTime()) as string)
    const expired = expiry <= now.getTime()
    const days = Math.max(0, Math.floor((expiry - now.getTime()) / DAY_MS))
    const owners = await supabaseSelect<{ full_name: string | null }>("users", `id=eq.${workspace.owner_id}&select=full_name&limit=1`).catch(() => [])

    let emailed = false
    if (workspace.client_contact_email) {
      const result = await createHandoffLink({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        createdBy: null,
        inviterName: owners?.[0]?.full_name || "Your agency team",
        recipientName: workspace.client_contact_name,
        recipientEmail: workspace.client_contact_email,
        source: "guardian",
        sendEmail: true,
      }).catch((error) => {
        log.error("agency.guardian_link_failed", { workspaceId: workspace.id, error: (error as Error).message })
        return null
      })
      emailed = Boolean(result?.emailed)
      if (emailed) linksSent++
    }

    const managers = await managersOf(workspace.id)
    await Promise.all(managers.map((userId) => createNotification({
      userId,
      workspaceId: workspace.id,
      type: "agency_alert",
      title: expired ? `LinkedIn access expired for ${workspace.name}` : `LinkedIn access for ${workspace.name} expires in ${days} day${days === 1 ? "" : "s"}`,
      body: emailed
        ? `We emailed ${workspace.client_contact_name || "the client"} a reconnect link.`
        : "Add a client contact email or send a connect link from the Agency Hub.",
      link: `/agency?client=${workspace.id}`,
    })))
  }
  return { warned, linksSent }
}

export async function runWeeklyVoiceDrops(now = new Date(), scope: JobScope = {}) {
  if (now.getUTCDay() !== 1) return { skipped: "not_monday" as const, sent: 0, created: 0 }
  const workspaces = await supabaseSelect<AgencyWorkspace>(
    "workspaces",
    `workspace_type=eq.client&archived_at=is.null&voice_drop_enabled=eq.true&client_contact_email=not.is.null${scopeFilter("id", scope)}&select=${WORKSPACE_COLUMNS}&limit=500`
  )
  const week = weekKey(now)
  let sent = 0
  let created = 0
  for (const workspace of workspaces || []) {
    if (!workspace.client_contact_email || !(await claimJob(`voice-drop:${workspace.id}:${week}`))) continue
    try {
      const [previous, owners] = await Promise.all([
        supabaseSelect<{ question: string }>("client_voice_drops", `workspace_id=eq.${workspace.id}&select=question&order=created_at.desc&limit=24`),
        supabaseSelect<{ full_name: string | null }>("users", `id=eq.${workspace.owner_id}&select=full_name&limit=1`).catch(() => []),
      ])
      const seed = Number.parseInt(workspace.id.replace(/-/g, "").slice(0, 8), 16) + Math.floor(now.getTime() / (7 * DAY_MS))
      const result = await createVoiceDrop({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        question: pickWeeklyQuestion((previous || []).map((row) => row.question), seed),
        recipientEmail: workspace.client_contact_email,
        createdBy: null,
        askerName: owners?.[0]?.full_name || "Your agency team",
        source: "weekly",
      })
      created++
      if (result.emailed) sent++
    } catch (error) {
      log.error("agency.weekly_voice_drop_failed", { workspaceId: workspace.id, error: (error as Error).message })
    }
  }
  return { sent, created }
}

/**
 * On the 1st of each month, clients whose agency opted in receive a proof
 * report for the previous calendar month. Months with nothing published send
 * no client email; managers are told instead.
 */
export async function runMonthlyProofReports(now = new Date(), scope: JobScope = {}) {
  if (now.getUTCDate() !== 1) return { skipped: "not_first_of_month" as const, sent: 0, empty: 0 }
  const period = previousMonthPeriod(now)
  const days = Math.round((period.end.getTime() - period.start.getTime()) / DAY_MS)
  const workspaces = await supabaseSelect<AgencyWorkspace>(
    "workspaces",
    `workspace_type=eq.client&archived_at=is.null&monthly_proof_enabled=eq.true&client_contact_email=not.is.null${scopeFilter("id", scope)}&select=${WORKSPACE_COLUMNS}&limit=500`
  )
  let sent = 0
  let empty = 0
  for (const workspace of workspaces || []) {
    if (!workspace.client_contact_email || !(await claimJob(`monthly-proof:${workspace.id}:${period.key}`))) continue
    try {
      const snapshot = await collectProofSnapshot(workspace, days, period.end)
      const managers = await managersOf(workspace.id)
      if (!snapshot.totals.postsPublished) {
        empty++
        await Promise.all(managers.map((userId) => createNotification({
          userId,
          workspaceId: workspace.id,
          type: "agency_alert",
          title: `No ${period.label} report sent to ${workspace.name}`,
          body: `Nothing was published for this client in ${period.label}, so the monthly proof report was skipped.`,
          link: `/agency?client=${workspace.id}`,
        })))
        continue
      }
      const owners = await supabaseSelect<{ full_name: string | null }>("users", `id=eq.${workspace.owner_id}&select=full_name&limit=1`).catch(() => [])
      const { report, url } = await storeProofReport(workspace, snapshot, null)
      const emailed = await sendAgencyEmail(workspace.client_contact_email, monthlyProofEmail({
        recipientName: workspace.client_contact_name,
        senderName: owners?.[0]?.full_name || "Your agency team",
        workspaceName: workspace.name,
        monthLabel: period.label,
        url,
        snapshot,
        expiresAt: new Date(report.expires_at),
      }), "agency.monthly_proof")
      if (emailed) sent++
      await Promise.all(managers.map((userId) => createNotification({
        userId,
        workspaceId: workspace.id,
        type: "agency_alert",
        title: emailed ? `${period.label} report sent to ${workspace.name}` : `${period.label} report for ${workspace.name} was not emailed`,
        body: emailed
          ? `${workspace.client_contact_name || "The client"} received a private link covering ${snapshot.totals.postsPublished} published post${snapshot.totals.postsPublished === 1 ? "" : "s"}.`
          : "The report was created but the email failed. Share it from the Agency Hub proof tab.",
        link: `/agency?client=${workspace.id}`,
      })))
    } catch (error) {
      log.error("agency.monthly_proof_failed", { workspaceId: workspace.id, error: (error as Error).message })
    }
  }
  return { sent, empty }
}

export async function runFridayWrap(now = new Date(), scope: JobScope = {}) {
  if (now.getUTCDay() !== 5) return { skipped: "not_friday" as const, sent: 0 }
  const workspaces = await supabaseSelect<{ owner_id: string | null }>(
    "workspaces",
    `workspace_type=eq.client&archived_at=is.null${scopeFilter("id", scope)}&select=owner_id&limit=5000`
  )
  const owners = [...new Set((workspaces || []).map((row) => row.owner_id).filter(isUuid))]
  const week = weekKey(now)
  let sent = 0
  for (const ownerId of owners) {
    if (!(await claimJob(`friday-wrap:${ownerId}:${week}`))) continue
    try {
      const [users, memberships] = await Promise.all([
        supabaseSelect<{ email: string | null; full_name: string | null }>("users", `id=eq.${ownerId}&select=email,full_name&limit=1`),
        listMemberWorkspaces(ownerId),
      ])
      const owner = users?.[0]
      if (!owner?.email) continue
      const clients = await buildClientHealth(memberships.filter((workspace) => workspace.owner_id === ownerId), now)
      if (!clients.length) continue
      const ok = await sendAgencyEmail(owner.email, fridayWrapEmail({
        ownerName: owner.full_name,
        clients,
        exceptions: sortExceptions(clients.flatMap((client) => client.exceptions)),
        appUrl: env.frontendOrigin,
      }), "agency.friday_wrap")
      if (ok) sent++
    } catch (error) {
      log.error("agency.friday_wrap_failed", { ownerId, error: (error as Error).message })
    }
  }
  return { sent }
}
