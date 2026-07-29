import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260729063254_gdpr_close_deletion_gaps.sql"),
  "utf8"
)

describe("delete_user_data GDPR erasure coverage", () => {
  it("deletes voice_training_logs by legacy text-keyed user_id", () => {
    expect(sql).toContain("delete from public.voice_training_logs where user_id = target_user_id::text")
  })

  it("deletes engagement_ledger by uuid user_id", () => {
    expect(sql).toContain("delete from public.engagement_ledger where user_id = target_user_id")
  })

  it("clears payment_subscriptions.user_id instead of leaving a dangling reference", () => {
    expect(sql).toContain(
      "update public.payment_subscriptions set user_id = null where user_id = target_user_id"
    )
    expect(sql).not.toContain("delete from public.payment_subscriptions")
  })

  it("never deletes payments or payment_subscriptions rows outright", () => {
    expect(sql).not.toMatch(/delete from public\.payments\b/)
  })

  it("still deletes every previously covered table", () => {
    for (const table of [
      "public.ai_usage",
      "public.scheduling_notifications",
      "public.analytics_snapshots",
      "public.posts",
      "public.carousels",
      "public.voice_profiles",
      "public.voice_examples",
      "public.competitor_analyses",
      "public.conversations",
      "public.linkedin_credentials",
      "public.referrals",
      "public.plan_usage",
      "public.user_overrides",
      "public.workspace_members",
      "public.workspaces",
      "public.users",
    ]) {
      expect(sql).toContain(table)
    }
  })

  it("locks the function down to service_role only", () => {
    expect(sql).toContain("revoke all on function public.delete_user_data(uuid) from public, anon, authenticated")
    expect(sql).toContain("grant execute on function public.delete_user_data(uuid) to service_role")
  })
})
