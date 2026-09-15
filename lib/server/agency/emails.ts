import "server-only"

import { sendTransactionalEmail } from "@/lib/server/email"
import { log } from "@/lib/server/logging"
import type { ClientException } from "@/lib/agency/health"
import type { ClientHealth } from "@/lib/server/agency/portfolio"
import type { ProofSnapshot } from "@/lib/agency/proof"

type Email = { subject: string; text: string }

const greet = (name?: string | null) => `Hi ${name?.trim().split(" ")[0] || "there"},`

export function handoffEmail(input: { recipientName?: string | null; inviterName: string; workspaceName: string; url: string; expiresAt: Date; reason: "manual" | "guardian" }): Email {
  const expires = input.expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  const intro = input.reason === "guardian"
    ? `Your LinkedIn connection for ${input.workspaceName} is about to expire. LinkedIn asks for a fresh approval every few weeks, so scheduled posts keep publishing only after you reconnect.`
    : `${input.inviterName} has asked you to connect your LinkedIn account so your approved posts for ${input.workspaceName} can publish on schedule.`
  return {
    subject: input.reason === "guardian" ? `Reconnect LinkedIn for ${input.workspaceName}` : `Connect your LinkedIn for ${input.workspaceName}`,
    text: [
      greet(input.recipientName),
      "",
      intro,
      "",
      "It takes about thirty seconds:",
      "1. Open the secure link below.",
      "2. Approve access on LinkedIn's own page.",
      "3. That's it. You never share your password with anyone.",
      "",
      input.url,
      "",
      `The link works once and expires on ${expires}.`,
      "You can remove access at any time from LinkedIn's settings under Data privacy, Permitted services.",
    ].join("\n"),
  }
}

export function approvalHeadsUpEmail(input: { workspaceName: string; postTitle: string; approveAt: Date; reviewUrl: string }): Email {
  const when = input.approveAt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })
  return {
    subject: `Heads-up: "${input.postTitle}" will be treated as approved soon`,
    text: [
      greet(),
      "",
      `You asked your team to treat drafts as approved when there is no reply. "${input.postTitle}" for ${input.workspaceName} is still waiting for you.`,
      "",
      `If you do nothing, it will be marked approved at ${when}.`,
      "",
      `Review, comment, or request changes: ${input.reviewUrl}`,
    ].join("\n"),
  }
}

export function voiceDropEmail(input: { workspaceName: string; question: string; url: string; askerName: string }): Email {
  return {
    subject: `One question for your next LinkedIn post`,
    text: [
      greet(),
      "",
      `${input.askerName} is preparing upcoming posts for ${input.workspaceName} and has one question:`,
      "",
      `"${input.question}"`,
      "",
      "Reply in two minutes. Type a few lines or record a voice note on your phone:",
      input.url,
      "",
      "Your real answers are what make the posts sound like you.",
    ].join("\n"),
  }
}

export function monthlyProofEmail(input: { recipientName: string | null; senderName: string; workspaceName: string; monthLabel: string; url: string; snapshot: ProofSnapshot; expiresAt: Date }): Email {
  const { totals } = input.snapshot
  const plural = (count: number, word: string) => `${count.toLocaleString("en-US")} ${word}${count === 1 ? "" : "s"}`
  const metrics = totals.postsWithMetrics
    ? `Across the ${plural(totals.postsWithMetrics, "post")} with synced LinkedIn metrics: ${plural(totals.impressions, "impression")}, ${plural(totals.reactions, "reaction")}, ${plural(totals.comments, "comment")}, and ${plural(totals.reposts, "repost")}.`
    : "LinkedIn metrics have not synced for these posts yet, so the report lists them without numbers rather than estimating."
  const expires = input.expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })
  return {
    subject: `Your LinkedIn report for ${input.monthLabel}`,
    text: [
      greet(input.recipientName),
      "",
      `${input.senderName} published ${plural(totals.postsPublished, "LinkedIn post")} for ${input.workspaceName} in ${input.monthLabel}.`,
      "",
      metrics,
      "",
      "See every post and the full summary here:",
      input.url,
      "",
      `This private link works until ${expires}.`,
    ].join("\n"),
  }
}

export function fridayWrapEmail(input: { ownerName: string | null; clients: ClientHealth[]; exceptions: ClientException[]; appUrl: string }): Email {
  const shipped = input.clients.reduce((sum, client) => sum + client.cadence.publishedThisWeek, 0)
  const onTarget = input.clients.filter((client) => client.cadence.publishedThisWeek >= client.cadence.target).length
  const waiting = input.clients.reduce((sum, client) => sum + client.pendingApprovals, 0)
  const lines = input.clients
    .slice()
    .sort((a, b) => b.cadence.streakWeeks - a.cadence.streakWeeks || a.name.localeCompare(b.name))
    .map((client) => {
      const streak = client.cadence.streakWeeks ? `, ${client.cadence.streakWeeks}-week streak` : ""
      return `- ${client.name}: ${client.cadence.publishedThisWeek} of ${client.cadence.target} posts shipped${streak}`
    })
  const attention = input.exceptions.filter((item) => item.severity !== "info").slice(0, 8)
  return {
    subject: `Friday Wrap: ${shipped} post${shipped === 1 ? "" : "s"} shipped across ${input.clients.length} client${input.clients.length === 1 ? "" : "s"}`,
    text: [
      greet(input.ownerName),
      "",
      `This week your team shipped ${shipped} post${shipped === 1 ? "" : "s"}. ${onTarget} of ${input.clients.length} client${input.clients.length === 1 ? "" : "s"} hit their weekly target, and ${waiting} draft${waiting === 1 ? " is" : "s are"} waiting on client approval.`,
      "",
      "By client:",
      ...lines,
      "",
      attention.length ? "Needs attention before Monday:" : "Nothing needs your attention. Every client is on track.",
      ...attention.map((item) => `- ${item.clientName}: ${item.message}`),
      "",
      `Open the Control Room: ${input.appUrl}/agency`,
    ].join("\n"),
  }
}

export async function sendAgencyEmail(to: string | null | undefined, email: Email, scope: string): Promise<boolean> {
  if (!to) return false
  try {
    const result = await sendTransactionalEmail({ to, subject: email.subject, text: email.text })
    if (!result.ok) log.warn(`${scope}.email_not_sent`, { error: result.error })
    return result.ok
  } catch (error) {
    log.error(`${scope}.email_failed`, { error: (error as Error).message })
    return false
  }
}
