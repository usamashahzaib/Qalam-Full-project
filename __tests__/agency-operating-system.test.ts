import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  clientExceptions,
  healthLevel,
  linkedInStatus,
  sortExceptions,
  summarizeCadence,
  weekStartUtc,
} from "@/lib/agency/health"
import { autoApproveAt, describeAutoApproveHours, isValidAutoApproveHours, nextAutoApproveAction } from "@/lib/agency/approval-timing"
import { parseStoredInlineComments, sanitizeInlineComments } from "@/lib/agency/red-pen"
import { buildProofSnapshot, linkedInPostUrl, median, weeklyTargetStats } from "@/lib/agency/proof"
import { VOICE_DROP_QUESTIONS, pickWeeklyQuestion, weekKey } from "@/lib/agency/voice-drop-questions"
import { voiceGuidance, voicePassportGuidance } from "@/lib/prompts/writing-policy"

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

describe("cadence and streaks", () => {
  // Wednesday 2026-09-16 12:00 UTC. Week starts Monday 2026-09-14.
  const now = new Date("2026-09-16T12:00:00Z")

  it("starts weeks on Monday UTC", () => {
    expect(weekStartUtc(now).toISOString()).toBe("2026-09-14T00:00:00.000Z")
    expect(weekStartUtc(new Date("2026-09-20T23:59:59Z")).toISOString()).toBe("2026-09-14T00:00:00.000Z")
    expect(weekStartUtc(new Date("2026-09-21T00:00:00Z")).toISOString()).toBe("2026-09-21T00:00:00.000Z")
  })

  it("counts consecutive completed weeks and lets the current week extend but never break the streak", () => {
    const published = [
      "2026-09-08T10:00:00Z", "2026-09-10T10:00:00Z", // last week: 2
      "2026-09-01T10:00:00Z", "2026-09-03T10:00:00Z", // two weeks ago: 2
      "2026-08-25T10:00:00Z", // three weeks ago: 1 (breaks)
      "2026-08-18T10:00:00Z", "2026-08-19T10:00:00Z",
    ]
    const inProgress = summarizeCadence({ publishedAt: published, scheduledFor: [], target: 2, now })
    expect(inProgress.streakWeeks).toBe(2)
    expect(inProgress.publishedThisWeek).toBe(0)
    expect(inProgress.onTrack).toBe(false)

    const shipped = summarizeCadence({ publishedAt: [...published, "2026-09-14T09:00:00Z", "2026-09-15T09:00:00Z"], scheduledFor: [], target: 2, now })
    expect(shipped.streakWeeks).toBe(3)
    expect(shipped.onTrack).toBe(true)
  })

  it("treats scheduled posts later this week as on track, but not next week's", () => {
    const summary = summarizeCadence({
      publishedAt: ["2026-09-14T09:00:00Z"],
      scheduledFor: ["2026-09-18T09:00:00Z", "2026-09-22T09:00:00Z", "2026-09-15T09:00:00Z"],
      target: 2,
      now,
    })
    expect(summary.scheduledThisWeek).toBe(1)
    expect(summary.onTrack).toBe(true)
  })

  it("ignores future and invalid published dates", () => {
    const summary = summarizeCadence({ publishedAt: ["not a date", "2026-09-17T09:00:00Z"], scheduledFor: [], target: 1, now })
    expect(summary.publishedThisWeek).toBe(0)
  })
})

describe("LinkedIn status and client exceptions", () => {
  const now = new Date("2026-09-16T12:00:00Z")

  it("classifies connection state", () => {
    expect(linkedInStatus(null, false, now)).toEqual({ state: "missing" })
    expect(linkedInStatus(null, true, now)).toEqual({ state: "connected", daysLeft: null })
    expect(linkedInStatus("2026-09-15T00:00:00Z", true, now)).toEqual({ state: "expired" })
    expect(linkedInStatus(new Date(now.getTime() + 3 * DAY + HOUR).toISOString(), true, now)).toEqual({ state: "expiring", daysLeft: 3 })
    expect(linkedInStatus(new Date(now.getTime() + 30 * DAY).toISOString(), true, now)).toEqual({ state: "connected", daysLeft: 30 })
  })

  const cadence = { target: 3, publishedThisWeek: 3, scheduledThisWeek: 0, onTrack: true, streakWeeks: 4 }
  const healthy = {
    workspaceId: "w1",
    name: "Acme",
    cadence,
    linkedIn: { state: "connected" as const, daysLeft: 40 },
    pendingApprovals: 0,
    oldestPendingHours: null,
    failedPosts: 0,
    scheduledAtRisk: 0,
    unusedVoiceDrops: 0,
  }

  it("reports nothing for a healthy client", () => {
    expect(clientExceptions(healthy)).toEqual([])
    expect(healthLevel([])).toBe("healthy")
  })

  it("escalates a missing connection to critical only when scheduled posts depend on it", () => {
    expect(clientExceptions({ ...healthy, linkedIn: { state: "missing" } })[0].severity).toBe("warning")
    const blocked = clientExceptions({ ...healthy, linkedIn: { state: "missing" }, scheduledAtRisk: 2 })
    expect(blocked.map((item) => item.code)).toEqual(["linkedin_missing"])
    expect(blocked[0].severity).toBe("critical")
  })

  it("orders critical before warning before info across clients", () => {
    const many = [
      ...clientExceptions({ ...healthy, name: "Zeta", workspaceId: "z", unusedVoiceDrops: 2 }),
      ...clientExceptions({ ...healthy, name: "Beta", workspaceId: "b", oldestPendingHours: 80 }),
      ...clientExceptions({ ...healthy, name: "Alpha", workspaceId: "a", failedPosts: 1, cadence: { ...cadence, publishedThisWeek: 1, onTrack: false } }),
    ]
    expect(sortExceptions(many).map((item) => `${item.severity}:${item.code}`)).toEqual([
      "critical:posts_failed",
      "warning:cadence_behind",
      "warning:approval_stale",
      "info:voice_drops_waiting",
    ])
    expect(clientExceptions({ ...healthy, cadence: { ...cadence, publishedThisWeek: 1, onTrack: false } })[0].message).toBe("2 posts short of this week's target of 3.")
  })
})

describe("silence as consent", () => {
  const created = new Date("2026-09-14T10:00:00Z")

  it("accepts only the offered windows", () => {
    expect(isValidAutoApproveHours(48)).toBe(true)
    expect(isValidAutoApproveHours(12)).toBe(false)
    expect(isValidAutoApproveHours(200)).toBe(false)
    expect(autoApproveAt(created, null)).toBeNull()
    expect(autoApproveAt(created, 48)?.toISOString()).toBe("2026-09-16T10:00:00.000Z")
    expect(describeAutoApproveHours(24)).toBe("1 day")
    expect(describeAutoApproveHours(144)).toBe("6 days")
  })

  const pending = { status: "pending", auto_approve_at: "2026-09-16T10:00:00.000Z", heads_up_sent_at: null }

  it("waits until two hours before the deadline, then sends the heads-up", () => {
    expect(nextAutoApproveAction(pending, new Date("2026-09-16T07:59:00Z")).kind).toBe("none")
    const action = nextAutoApproveAction(pending, new Date("2026-09-16T08:00:00Z"))
    expect(action).toEqual({ kind: "heads_up", approveAt: new Date("2026-09-16T10:00:00.000Z") })
  })

  it("never approves without a heads-up, even when the sweep is late", () => {
    const late = nextAutoApproveAction(pending, new Date("2026-09-17T09:00:00Z"))
    expect(late).toEqual({ kind: "heads_up", approveAt: new Date("2026-09-17T11:00:00.000Z") })
  })

  it("approves once the deadline passes and two hours have elapsed since the heads-up", () => {
    const warned = { ...pending, heads_up_sent_at: "2026-09-16T08:00:00.000Z" }
    expect(nextAutoApproveAction(warned, new Date("2026-09-16T09:59:00Z")).kind).toBe("none")
    expect(nextAutoApproveAction(warned, new Date("2026-09-16T10:00:30Z")).kind).toBe("approve")
    const tooSoon = { status: "pending", auto_approve_at: "2026-09-16T10:00:00.000Z", heads_up_sent_at: "2026-09-16T09:30:00.000Z" }
    expect(nextAutoApproveAction(tooSoon, new Date("2026-09-16T10:30:00Z")).kind).toBe("none")
  })

  it("does nothing for decided or opted-out approvals", () => {
    expect(nextAutoApproveAction({ ...pending, status: "approved" }, new Date("2026-09-20T00:00:00Z")).kind).toBe("none")
    expect(nextAutoApproveAction({ ...pending, auto_approve_at: null }, new Date("2026-09-20T00:00:00Z")).kind).toBe("none")
  })
})

describe("red-pen comments", () => {
  const post = "We shipped the new onboarding flow.\n\nIt cut setup time   in half for new teams."

  it("keeps comments whose quote appears in the post, normalising whitespace", () => {
    expect(sanitizeInlineComments([
      { quote: "cut setup time in half", note: "Say 40 percent, that is the real number" },
      { quote: "a sentence the client never saw", note: "injected" },
      { quote: "We shipped", note: "" },
      { quote: "cut setup time in half", note: "Say 40 percent, that is the real number" },
      "junk",
    ], post)).toEqual([{ quote: "cut setup time in half", note: "Say 40 percent, that is the real number" }])
  })

  it("caps the number of comments and tolerates bad stored data", () => {
    const many = Array.from({ length: 40 }, (_, index) => ({ quote: "We shipped", note: `note ${index}` }))
    expect(sanitizeInlineComments(many, post)).toHaveLength(20)
    expect(sanitizeInlineComments("nope", post)).toEqual([])
    expect(parseStoredInlineComments([{ quote: "a", note: "b" }, { quote: 1 }, null])).toEqual([{ quote: "a", note: "b" }])
  })
})

describe("proof snapshot", () => {
  it("builds LinkedIn links only from real post URNs", () => {
    expect(linkedInPostUrl("urn:li:share:7123456789")).toBe("https://www.linkedin.com/feed/update/urn:li:share:7123456789/")
    expect(linkedInPostUrl("javascript:alert(1)")).toBeNull()
    expect(linkedInPostUrl(null)).toBeNull()
  })

  it("computes medians", () => {
    expect(median([])).toBeNull()
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it("counts only complete weeks inside the period", () => {
    const stats = weeklyTargetStats(
      ["2026-08-24T10:00:00Z", "2026-08-25T10:00:00Z", "2026-08-31T10:00:00Z", "2026-09-07T10:00:00Z", "2026-09-08T10:00:00Z"],
      2,
      new Date("2026-08-20T00:00:00Z"),
      new Date("2026-09-16T00:00:00Z"),
    )
    expect(stats).toEqual({ weeksInPeriod: 3, weeksOnTarget: 2 })
  })

  it("only sums metrics that exist and never invents numbers for unmeasured posts", () => {
    const snapshot = buildProofSnapshot({
      workspaceName: "Acme",
      brandingColor: null,
      cadenceTarget: 2,
      streakWeeks: 3,
      periodStart: new Date("2026-08-17T00:00:00Z"),
      periodEnd: new Date("2026-09-16T00:00:00Z"),
      posts: [
        { title: "One", content: "First post body", published_at: "2026-09-01T10:00:00Z", linkedin_post_id: "urn:li:share:1" },
        { title: null, content: "Second post body with more words", published_at: "2026-09-02T10:00:00Z", linkedin_post_id: null },
        { title: "Three", content: "Third", published_at: "2026-09-03T10:00:00Z", linkedin_post_id: "urn:li:share:3" },
      ],
      metricsByPostIndex: [
        { impressions: 1000, reactions: 20, comments: 5, reposts: 1 },
        null,
        { impressions: 400, reactions: 40, comments: 1, reposts: 0 },
      ],
      approvals: [
        { created_at: "2026-09-01T00:00:00Z", decided_at: "2026-09-01T10:00:00Z", auto_approved: false, status: "approved" },
        { created_at: "2026-09-02T00:00:00Z", decided_at: "2026-09-04T00:00:00Z", auto_approved: true, status: "approved" },
        { created_at: "2026-09-03T00:00:00Z", decided_at: null, auto_approved: false, status: "pending" },
      ],
    }, new Date("2026-09-16T00:00:00Z"))

    expect(snapshot.totals).toEqual({ postsPublished: 3, postsWithMetrics: 2, impressions: 1400, reactions: 60, comments: 6, reposts: 1 })
    expect(snapshot.posts[1].metrics).toBeNull()
    expect(snapshot.posts[1].title).toBe("Second post body with more words")
    expect(snapshot.topPost?.title).toBe("Three")
    expect(snapshot.approvals).toEqual({ decided: 2, autoApproved: 1, medianHoursToDecision: 29 })
  })
})

describe("voice drop questions", () => {
  it("rotates through unasked questions and restarts when the bank is exhausted", () => {
    const first = pickWeeklyQuestion([], 0)
    expect(VOICE_DROP_QUESTIONS).toContain(first)
    expect(pickWeeklyQuestion([first], 0)).not.toBe(first)
    expect(VOICE_DROP_QUESTIONS).toContain(pickWeeklyQuestion([...VOICE_DROP_QUESTIONS], 5))
    expect(weekKey(new Date("2026-09-16T12:00:00Z"))).toBe("2026-09-14")
  })
})

describe("voice passport prompt", () => {
  const passport = {
    summary: "Operator who hates hype",
    do: ["Use British spelling"],
    dont: ["Mention competitors by name"],
    bannedPhrases: ["game-changer"],
    corrections: ["Said 'we doubled revenue' (the real figure was 40 percent)"],
  }

  it("renders every rule category as hard constraints", () => {
    const block = voicePassportGuidance(passport)
    expect(block).toContain("VOICE PASSPORT")
    expect(block).toContain("- Use British spelling")
    expect(block).toContain("- Mention competitors by name")
    expect(block).toContain('"game-changer"')
    expect(block).toContain("real figure was 40 percent")
  })

  it("flows through voiceGuidance even when no style profile exists", () => {
    expect(voiceGuidance({ passport })).toContain("VOICE PASSPORT")
    expect(voiceGuidance({ tone: "Direct", passport }).indexOf("VOICE PASSPORT")).toBeLessThan(voiceGuidance({ tone: "Direct", passport }).indexOf("THE AUTHOR'S VOICE:"))
    expect(voiceGuidance({ tone: "Direct" })).not.toContain("VOICE PASSPORT")
    expect(voicePassportGuidance({ do: [], dont: [], bannedPhrases: [], corrections: [] })).toBe("")
  })
})

describe("agency operating system contracts", () => {
  it("keeps every new table service-role only behind RLS", () => {
    const migration = source("supabase/migrations/20260915090000_agency_operating_system.sql")
    for (const table of ["workspace_handoff_links", "voice_passport_entries", "client_voice_drops", "client_proof_reports", "pitch_previews", "agency_job_claims"]) {
      expect(migration).toContain(`'${table}'`)
    }
    expect(migration).toContain("enable row level security")
    expect(migration).toContain("revoke all on public.%I from anon, authenticated")
    expect(migration).toContain("'career_momentum_reminder'")
  })

  it("lets a client connect LinkedIn only through a single-use claimed handoff", () => {
    const callback = source("app/api/linkedin/callback/route.ts")
    const handoff = source("lib/server/agency/handoff.ts")
    expect(callback).toContain('statePayload?.kind === "handoff"')
    expect(callback).toContain("state !== expectedState")
    expect(handoff).toContain("used_at=is.null&revoked_at=is.null&expires_at=gt.")
  })

  it("registers public token routes and pages on the app host", () => {
    const proxy = source("proxy.ts")
    expect(proxy).toContain('"/api/share"')
    for (const path of ["/connect", "/drop", "/proof", "/pitch"]) expect(proxy).toContain(`"${path}"`)
    expect(proxy).toContain("microphone=(self)")
    expect(source("lib/protected-routes.ts")).toContain('"/desk"')
  })

  it("routes manual and automatic decisions through one decision engine", () => {
    expect(source("app/api/approvals/[id]/approve/route.ts")).toContain("handleReviewDecision")
    expect(source("app/api/approvals/[id]/reject/route.ts")).toContain("handleReviewDecision")
    expect(source("lib/server/agency/approval-decision.ts")).toContain("heads_up_sent_at=is.null")
    expect(source("vercel.json")).toContain("/api/cron/agency")
  })

  it("does not store pitch source posts", () => {
    expect(source("supabase/migrations/20260915090000_agency_operating_system.sql")).not.toMatch(/pitch_previews[\s\S]*source_posts/)
    expect(source("lib/server/agency/pitch.ts")).not.toContain("source_posts")
  })
})
