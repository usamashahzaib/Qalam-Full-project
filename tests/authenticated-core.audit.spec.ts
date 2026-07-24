import { expect, test } from "@playwright/test"
import { encode } from "next-auth/jwt"

test("authenticated writer, dashboard, settings, and account deletion", async ({ page, context }) => {
  test.skip(process.env.RUN_AUTHENTICATED_AUDIT !== "1", "Requires live Supabase and AI providers")
  test.setTimeout(180_000)
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is required for authenticated audit")

  const loginResponse = await page.goto("/login")
  expect(loginResponse?.status()).toBe(200)
  await expect(page.locator("body")).not.toContainText(/Internal server error|Application error/)

  const auditId = crypto.randomUUID()
  const email = `audit-${auditId}@example.invalid`
  const cookieName = "authjs.session-token"
  const token = await encode({
    secret,
    salt: cookieName,
    maxAge: 60 * 60,
    token: {
      sub: auditId,
      id: auditId,
      email,
      name: "Audit Runtime",
      provider: "linkedin",
    },
  })

  await context.addCookies([{
    name: cookieName,
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  }])

  let provisioned = false
  try {
    const dashboardResponse = await page.goto("/dashboard")
    expect(dashboardResponse?.status()).toBeLessThan(400)
    await expect(page.locator("body")).not.toContainText("Could not load")

    const dashboardApi = await page.request.get("/api/dashboard/stats")
    expect(dashboardApi.status()).toBe(200)
    provisioned = true
    const dashboard = await dashboardApi.json()
    expect(dashboard.plan).toBe("Free")
    expect(dashboard.draftsTotal).toBe(5)

    const settingsLink = page.getByRole("link", { name: "Settings" }).first()
    await expect(settingsLink).toBeVisible()
    expect(await settingsLink.getAttribute("href")).toContain("/settings")
    const userMenu = page.getByRole("button", { name: "User menu" })
    await expect(userMenu).toContainText("Audit Runtime")

    const settingsResponse = await page.goto("/settings")
    expect(settingsResponse?.status()).toBeLessThan(400)
    await expect(page.locator("body")).not.toContainText(/Could not load|Internal server error/)

    const writerResponse = await page.goto("/writer")
    expect(writerResponse?.status()).toBeLessThan(400)
    await expect(page.locator("body")).not.toContainText(/Could not load|Internal server error/)

    const topic = `Building durable writing systems ${auditId.slice(0, 8)}`
    const hooksResponse = await page.request.post("/api/generate/hooks", {
      data: { topic, role: "Founder", goal: "Build authority" },
    })
    expect(hooksResponse.status()).toBe(200)
    const hooks = await hooksResponse.json()
    expect(hooks.hooks).toHaveLength(5)

    const postResponse = await page.request.post("/api/generate/post", {
      data: {
        topic,
        hook: hooks.hooks[0].text,
        role: "Founder",
        format: "Medium",
        goal: "Build authority",
      },
    })
    expect(postResponse.status()).toBe(200)
    const post = await postResponse.json()
    expect(post.content.length).toBeGreaterThan(100)

    const scoreResponse = await page.request.post("/api/generate/score", {
      data: { content: post.content, role: "Founder" },
    })
    expect(scoreResponse.status()).toBe(200)
    const score = await scoreResponse.json()
    expect(score.overall).toBeGreaterThan(0)

    const pricingResponse = await page.goto("/pricing")
    expect(pricingResponse?.status()).toBeLessThan(400)
    await expect(page.locator("body")).toContainText("PKR 499")
    await expect(page.locator("body")).toContainText("PKR 1,490")
    await expect(page.locator("body")).toContainText("Coming Soon")
  } finally {
    if (provisioned) {
      const deletion = await page.request.delete("/api/user/delete")
      expect(deletion.status()).toBe(200)
    }
  }
})
