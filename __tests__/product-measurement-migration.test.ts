import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260825183000_product_measurement_events.sql"),
  "utf8",
)

describe("product measurement migration", () => {
  it("stores activation once with a user-scoped idempotency key", () => {
    expect(migration).toContain("UNIQUE (user_id, event_name, idempotency_key)")
    expect(migration).toContain("ON CONFLICT (user_id, event_name, idempotency_key) DO NOTHING")
    expect(migration).toContain("activated_at = COALESCE(activated_at")
  })

  it("allows only server and backfill writers", () => {
    expect(migration).toContain("source IN ('server', 'backfill')")
    expect(migration).toContain("REVOKE ALL ON TABLE public.product_events FROM PUBLIC, anon, authenticated")
    expect(migration).toContain("GRANT SELECT, INSERT ON TABLE public.product_events TO service_role")
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.record_product_event_v1")
  })

  it("rejects loose event payloads at the database boundary", () => {
    expect(migration).toContain("CONSTRAINT product_events_shape_check")
    expect(migration).toContain("AND plan_name IS NULL")
    expect(migration).toContain("AND plan_name IN ('Solo', 'Pro', 'Agency', 'Agency Starter', 'Agency Growth')")
    expect(migration).toContain("AND payment_transaction_id IS NOT NULL")
  })

  it("backs activation with existing posts and authoritative payment rows", () => {
    expect(migration).toContain("'backfill:post:' || p.id::text")
    expect(migration).toContain("CREATE OR REPLACE VIEW public.product_retention_cohorts")
    expect(migration).toContain("CREATE OR REPLACE VIEW public.payment_conversion_facts")
    expect(migration).toMatch(/FROM public\.payments p\s+LEFT JOIN public\.users u/)
  })

  it("checks workspace membership with the hardened UUID identity", () => {
    expect(migration).toContain("wm.user_id = p_user_id")
    expect(migration).not.toContain("wm.user_id = p_user_id::text")
  })
})
