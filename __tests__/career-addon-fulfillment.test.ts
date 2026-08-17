import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { CAREER_ADD_ONS, CAREER_PRODUCTS, type CareerProductKey } from "@/lib/career-pricing"

const variantIds: Record<CareerProductKey, string> = {
  extra_resume: "101",
  cover_letter: "102",
  interview_pack: "103",
  recruiter_review: "104",
  linkedin_rewrite: "105",
  career_blueprint: "106",
  application_pack: "107",
  job_win_pack: "108",
  career_reset_pack: "109",
  executive_career_reset: "110",
}
let currentAddonKey: CareerProductKey = "extra_resume"
const updates: { table: string; payload: Record<string, unknown> }[] = []
const rpcCalls: { name: string; args: Record<string, unknown> }[] = []
const createNotification = vi.fn()

vi.mock("@/lib/server/env", () => ({
  env: {
    lemonSqueezyWebhookSecret: "secret",
    lemonSqueezyCareerAddonVariantIds: variantIds,
  },
}))
vi.mock("@/lib/server/payments", () => ({ verifyLemonSqueezy: () => true }))
vi.mock("@/lib/server/checkout-token", () => ({
  verifyAddonCheckoutToken: () => ({ userId: "user-1", orderId: "order-1" }),
}))
vi.mock("@/lib/server/notifications", () => ({ createNotification }))
vi.mock("@/lib/server/logging", () => ({ log: { error: vi.fn() } }))
vi.mock("@/lib/server/supabase-rest", () => ({
  supabaseSelect: () => [{
    id: "order-1",
    user_id: "user-1",
    workspace_id: "workspace-1",
    addon_key: currentAddonKey,
    quantity: 1,
    amount_pkr: CAREER_PRODUCTS.find(({ key }) => key === currentAddonKey)!.price,
    status: "pending",
  }],
  createServiceClient: () => ({
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args })
      return Promise.resolve({ data: name === "claim_payment_webhook_v2" ? "claimed" : true, error: null })
    },
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => {
        updates.push({ table, payload })
        let filters = 0
        const query = {
          eq: () => ++filters === 2 ? Promise.resolve({ error: null }) : query,
        }
        return query
      },
    }),
  }),
}))

let handleCareerAddonWebhook: typeof import("@/lib/server/career-addon-payments").handleCareerAddonWebhook

beforeAll(async () => {
  ;({ handleCareerAddonWebhook } = await import("@/lib/server/career-addon-payments"))
})

beforeEach(() => {
  updates.length = 0
  rpcCalls.length = 0
  createNotification.mockClear()
})

const payload = (variantId: string, id: string) => JSON.stringify({
  meta: { custom_data: { kind: "career_addon", token: "trusted" } },
  data: {
    id,
    attributes: {
      status: "paid",
      currency: "PKR",
      subtotal: CAREER_PRODUCTS.find(({ key }) => key === currentAddonKey)!.price * 100,
      discount_total: 0,
      first_order_item: { variant_id: variantId, quantity: 1 },
    },
  },
})

describe("career add-on webhook fulfillment", () => {
  it.each(CAREER_ADD_ONS)("grants only $key access and links to its software", async (addon) => {
    currentAddonKey = addon.key
    const result = await handleCareerAddonWebhook(payload(variantIds[addon.key], `ls-${addon.key}`), "signature")

    expect(result).toMatchObject({ status: 200, body: { ok: true, orderId: "order-1" } })
    expect(rpcCalls).toContainEqual({
      name: "fulfill_career_purchase",
      args: expect.objectContaining({ p_order_id: "order-1", p_credit_keys: [] }),
    })
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ link: addon.route }))
  })

  it("grants every Job-Win Pack tool through one atomic fulfillment", async () => {
    currentAddonKey = "job_win_pack"
    const result = await handleCareerAddonWebhook(payload(variantIds.job_win_pack, "ls-job-win"), "signature")

    expect(result).toMatchObject({ status: 200, body: { ok: true, orderId: "order-1" } })
    expect(rpcCalls).toContainEqual({
      name: "fulfill_career_purchase",
      args: expect.objectContaining({
        p_credit_keys: ["recruiter_review", "extra_resume", "cover_letter", "interview_pack"],
      }),
    })
  })

  it("rejects a paid variant that does not match the pending software order", async () => {
    currentAddonKey = "extra_resume"
    const result = await handleCareerAddonWebhook(payload(variantIds.cover_letter, "ls-mismatch"), "signature")

    expect(result).toMatchObject({ status: 422, body: { ok: false, error: "addon_variant_mismatch" } })
    expect(updates.some(({ table, payload }) => table === "career_addon_orders" && payload.status === "paid")).toBe(false)
    expect(createNotification).not.toHaveBeenCalled()
  })
})
