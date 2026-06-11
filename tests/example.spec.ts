import { expect, test } from "@playwright/test"

test("public pages render without copy regressions", async ({ page }) => {
  for (const path of ["/", "/pricing", "/about", "/blog"]) {
    await page.goto(path)
    await expect(page.locator("body")).not.toContainText(/voice \?|system,someone|needauthority|publishing,authority/)
  }
})

test("protected APIs reject unauthenticated users cleanly", async ({ request }) => {
  for (const path of ["/plan/status", "/api/posts", "/api/voice-profile"]) {
    const response = await request.get(path)
    expect(response.status()).toBe(401)
  }
})
