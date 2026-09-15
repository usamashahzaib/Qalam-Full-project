import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { buildProofSnapshot, previousMonthPeriod } from "@/lib/agency/proof"
import { monthlyProofEmail } from "@/lib/server/agency/emails"

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

const snapshotWith = (metrics: boolean) => buildProofSnapshot({
  workspaceName: "Acme",
  brandingColor: null,
  cadenceTarget: 2,
  streakWeeks: 1,
  periodStart: new Date("2026-08-01T00:00:00Z"),
  periodEnd: new Date("2026-09-01T00:00:00Z"),
  posts: [
    { title: "One", content: "First post", published_at: "2026-08-05T10:00:00Z", linkedin_post_id: null },
    { title: "Two", content: "Second post", published_at: "2026-08-12T10:00:00Z", linkedin_post_id: null },
  ],
  metricsByPostIndex: metrics ? [{ impressions: 1200, reactions: 40, comments: 6, reposts: 1 }, null] : [null, null],
  approvals: [],
}, new Date("2026-09-01T09:00:00Z"))

const email = (metrics: boolean) => monthlyProofEmail({
  recipientName: "Sara Khan",
  senderName: "Northwind Studio",
  workspaceName: "Acme",
  monthLabel: "August 2026",
  url: "https://app.byqalam.com/proof/abc",
  snapshot: snapshotWith(metrics),
  expiresAt: new Date("2026-11-30T09:00:00Z"),
})

describe("monthly proof period", () => {
  it("covers exactly the previous calendar month in UTC", () => {
    const period = previousMonthPeriod(new Date("2026-09-01T09:00:00Z"))
    expect(period.start.toISOString()).toBe("2026-08-01T00:00:00.000Z")
    expect(period.end.toISOString()).toBe("2026-09-01T00:00:00.000Z")
    expect(period.key).toBe("2026-08")
    expect(period.label).toBe("August 2026")
  })

  it("rolls back across the year boundary", () => {
    const period = previousMonthPeriod(new Date("2027-01-01T09:00:00Z"))
    expect(period.key).toBe("2026-12")
    expect(period.start.toISOString()).toBe("2026-12-01T00:00:00.000Z")
  })
})

describe("monthly proof email", () => {
  it("reports only synced metrics and says how many posts they cover", () => {
    const { subject, text } = email(true)
    expect(subject).toBe("Your LinkedIn report for August 2026")
    expect(text).toContain("Hi Sara,")
    expect(text).toContain("Northwind Studio published 2 LinkedIn posts for Acme in August 2026.")
    expect(text).toContain("Across the 1 post with synced LinkedIn metrics: 1,200 impressions, 40 reactions, 6 comments, and 1 repost.")
    expect(text).toContain("https://app.byqalam.com/proof/abc")
  })

  it("never implies numbers when no metrics have synced", () => {
    const { text } = email(false)
    expect(text).toContain("without numbers rather than estimating")
    expect(text).not.toMatch(/impression/)
  })
})

describe("monthly proof wiring", () => {
  it("is opt-in, runs from the daily agency cron, and sends once per client per month", () => {
    expect(source("supabase/migrations/20260915120000_monthly_proof_reports.sql")).toContain("monthly_proof_enabled boolean not null default false")
    expect(source("app/api/cron/agency/route.ts")).toContain("runMonthlyProofReports(now)")
    const jobs = source("lib/server/agency/jobs.ts")
    expect(jobs).toContain("monthly_proof_enabled=eq.true")
    expect(jobs).toContain("claimJob(`monthly-proof:${workspace.id}:${period.key}`)")
    expect(jobs).toContain("if (!snapshot.totals.postsPublished)")
    expect(source("app/api/workspaces/[id]/client-settings/route.ts")).toContain("(input.voiceDropEnabled || input.monthlyProofEnabled) && !workspace.client_contact_email")
  })
})
