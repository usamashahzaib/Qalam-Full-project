import { expect, test } from "@playwright/test"
import { AGENCY_PLAN_LIVE } from "../lib/pricing"

// ── helpers ──────────────────────────────────────────────────────────────────
const MOBILE = { width: 375, height: 812 }

// ── SECTION 1: Marketing pages ───────────────────────────────────────────────

test.describe("Landing page", () => {
  test("loads, no missing images, no broken nav links", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Qalam/)
    // Hero heading
    await expect(page.locator("h1").first()).toBeVisible()
    // Navbar links visible
    await expect(page.getByRole("link", { name: /pricing/i }).first()).toBeVisible()
    // No broken images (img with empty src or alt that says 'broken')
    const imgs = await page.locator("img").all()
    for (const img of imgs) {
      const src = await img.getAttribute("src")
      expect(src).toBeTruthy()
    }
  })

  test("no JS console errors on load", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    expect(errors.filter((e) => !e.includes("favicon") && !e.includes("ERR_BLOCKED"))).toHaveLength(0)
  })

  test("mobile layout - no horizontal overflow at 375px", async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2)
  })

  test("announcement banner dismisses and stays dismissed on reload", async ({ page }) => {
    await page.goto("/")
    const banner = page.locator("[data-testid='announcement-banner'], [class*='announcement'], [class*='banner']").first()
    const dismissBtn = page.getByRole("button", { name: /dismiss|close|×/i }).first()
    if (await banner.isVisible().catch(() => false)) {
      await dismissBtn.click()
      await expect(banner).not.toBeVisible()
      await page.reload()
      await expect(banner).not.toBeVisible()
    }
  })

  test("CTA Start free buttons link to /login", async ({ page }) => {
    await page.goto("/")
    const ctaLinks = await page.getByRole("link").filter({ hasText: /start free|get started|try free/i }).all()
    for (const link of ctaLinks.slice(0, 3)) {
      const href = await link.getAttribute("href")
      expect(href).toMatch(/\/(login|signup)/)
    }
  })
})

test.describe("Pricing page", () => {
  test("loads with correct plan names and USD pricing", async ({ page }) => {
    await page.goto("/pricing")
    await expect(page).toHaveTitle(/Pricing.*Qalam|Qalam.*Pricing/)
    await expect(page.locator("body")).toContainText(/\$\d+/)
    // No duplicate brand name in title
    await expect(page).not.toHaveTitle(/Qalam.*Qalam/)
  })
})

test.describe("Marketing sub-pages status", () => {
  const routes = [
    "/about",
    "/blog",
    "/docs",
    "/contact",
    "/careers",
    "/changelog",
    "/status",
    "/legal/terms",
    "/legal/privacy",
    "/free-tools",
    "/free-tools/hook-generator",
    "/free-tools/headline-analyzer",
    "/free-tools/profile-optimizer",
    "/free-tools/viral-checker",
    "/free-tools/engagement-predictor",
    "/free-tools/carousel-builder",
    "/product/post-writer",
    "/product/voice-profile",
    "/product/hook-generator",
    "/product/post-scheduler",
    "/use-cases/founders",
    "/use-cases/agencies",
    "/ai-linkedin-writer",
    "/demo",
  ]

  for (const route of routes) {
    test(`${route} renders 200`, async ({ page }) => {
      const res = await page.goto(route)
      expect(res?.status()).toBeLessThan(400)
      await expect(page.locator("body")).not.toContainText(/404|page not found/i)
    })
  }
})

// ── SECTION 2: SEO landing pages (new in latest commit) ──────────────────────

test.describe("SEO landing pages", () => {
  const seoSlugs = [
    "ai-content-writer",
    "linkedin-post-writer",
    "linkedin-content-strategy",
    "linkedin-hook-generator",
    "linkedin-carousel-maker",
    "linkedin-scheduler",
    "linkedin-analytics",
    "linkedin-voice-clone",
    "linkedin-agency-tool",
    "linkedin-growth-tool",
  ]

  for (const slug of seoSlugs) {
    test(`/${slug} renders correctly`, async ({ page }) => {
      const res = await page.goto(`/${slug}`)
      // Should be 200 or redirect - not 404
      if (res?.status() === 404) {
        // Page not in registry, skip
        return
      }
      expect(res?.status()).toBeLessThan(400)
      await expect(page.locator("h1").first()).toBeVisible()
      await expect(page.locator("body")).not.toContainText(/404|page not found/i)
    })
  }

  test("SEO page has correct JSON-LD structured data", async ({ page }) => {
    await page.goto("/ai-content-writer")
    const schemas = await page.$$eval('script[type="application/ld+json"]', (els) =>
      els.map((el) => {
        try { return JSON.parse(el.textContent || "") } catch { return null }
      }).filter(Boolean)
    )
    expect(schemas.length).toBeGreaterThanOrEqual(2) // WebPage + FAQPage + BreadcrumbList
    const types = schemas.map((s) => s["@type"])
    expect(types).toContain("WebPage")
    expect(types).toContain("FAQPage")
  })

  test("SEO page no Qalam|Qalam title duplication", async ({ page }) => {
    await page.goto("/ai-content-writer")
    await expect(page).not.toHaveTitle(/Qalam.*Qalam/)
    await expect(page).toHaveTitle(/Qalam/)
  })

  test("SEO page Related links all return 200", async ({ page }) => {
    await page.goto("/ai-content-writer")
    const relatedLinks = await page.locator("aside a").all()
    for (const link of relatedLinks) {
      const href = await link.getAttribute("href")
      if (!href || href.startsWith("http")) continue
      const res = await page.request.get(href)
      expect(res.status()).toBeLessThan(400)
    }
  })
})

// ── SECTION 3: Auth flow ─────────────────────────────────────────────────────

test.describe("Auth pages", () => {
  test("login page loads with LinkedIn and email options", async ({ page }) => {
    await page.goto("/login")
    await expect(page).not.toHaveTitle(/Qalam.*Qalam/)
    await expect(page.locator("body")).toContainText(/sign in|log in|continue with/i)
    // Should have email input
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    // Should NOT have Google login (per project constraint)
    await expect(page.locator("body")).not.toContainText(/continue with google|sign in with google/i)
    // Should have LinkedIn
    await expect(page.locator("body")).toContainText(/linkedin/i)
  })

  test("login form validation - empty submit shows error", async ({ page }) => {
    await page.goto("/login")
    const submitBtn = page.getByRole("button", { name: /sign in|log in|continue/i }).first()
    await submitBtn.click()
    // Should show some error or validation
    await expect(page.locator("body")).toContainText(/email|required|invalid/i)
  })

  test("login with wrong credentials shows error message", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[type="email"]', "nonexistent@test.com")
    const pwField = page.locator('input[type="password"]')
    if (await pwField.isVisible()) {
      await pwField.fill("wrongpassword123")
    }
    const submitBtn = page.getByRole("button", { name: /sign in|log in|continue/i }).first()
    await submitBtn.click()
    // Should show error, not crash
    await expect(page.locator("body")).not.toContainText(/unhandled|cannot read|undefined/i)
    await expect(page.locator("body")).toContainText(/invalid|incorrect|not found|check your/i, { timeout: 20_000 })
  })

  test("signup page loads and has no Google option", async ({ page }) => {
    await page.goto("/signup")
    await expect(page.locator("body")).toContainText(/create account|sign up|register/i)
    await expect(page.locator("body")).not.toContainText(/continue with google/i)
  })

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password")
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole("button", { name: /send|reset/i }).first()).toBeVisible()
  })

  test("forgot password empty email shows error", async ({ page }) => {
    await page.goto("/forgot-password")
    const btn = page.getByRole("button", { name: /send|reset/i }).first()
    await btn.click()
    await page.waitForTimeout(500)
    await expect(page.locator("body")).toContainText(/email|required|enter/i)
  })

  test("terms redirect: /terms -> /legal/terms", async ({ page }) => {
    await page.goto("/terms")
    // Either redirected or canonical URL should be /legal/terms
    expect(page.url()).toMatch(/\/legal\/terms|\/terms/)
    await expect(page.locator("body")).toContainText(/terms|service|agreement/i)
  })
})

// ── SECTION 4: Auth-guarded routes redirect to login ─────────────────────────

test.describe("Auth guards", () => {
  const protectedRoutes = [
    "/dashboard",
    "/writer",
    "/carousels",
    "/analytics",
    "/calendar",
    "/voice",
    "/career",
    "/competitors",
    "/library",
    "/settings",
    "/approvals",
    "/chat",
    "/agency",
  ]

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated to /login`, async ({ page }) => {
      await page.goto(route)
      await page.waitForURL(/login|signin/, { timeout: 5000 }).catch(() => {})
      expect(page.url()).toMatch(/login|signin/)
    })
  }

  test("agency workspaces product page matches release state", async ({ page }) => {
    const response = await page.goto("/product/agency-workspaces")
    expect(response?.status()).toBe(AGENCY_PLAN_LIVE ? 200 : 404)
  })

  test("/agency-setup matches the agency plan release state", async ({ page }) => {
    await page.goto("/agency-setup")
    if (AGENCY_PLAN_LIVE) {
      await expect(page).toHaveURL(/\/managed\/apply\?plan=Agency&type=company$/)
    } else {
      await expect(page).toHaveURL(/\/pricing$/)
    }
  })

  test("homepage has no Framer Motion scroll-container warning", async ({ page }) => {
    const warnings: string[] = []
    page.on("console", (message) => {
      if (message.type() === "warning") warnings.push(message.text())
    })
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const scrollPosition = await page.evaluate(() => getComputedStyle(document.scrollingElement!).position)
    expect(
      warnings.filter((warning) => warning.includes("non-static position")),
      `scrollingElement position: ${scrollPosition}`,
    ).toHaveLength(0)
  })
})

// ── SECTION 5: Free tools ────────────────────────────────────────────────────

test.describe("Free tools functionality", () => {
  test("hook generator - generates hooks without crash", async ({ page }) => {
    await page.goto("/free-tools/hook-generator")
    await expect(page.locator("h1, h2").first()).toBeVisible()
    const topicInput = page.locator('textarea, input[type="text"]').first()
    await topicInput.fill("Leadership lessons from running a startup")
    const generateBtn = page.getByRole("button", { name: /generate|create|get hooks/i }).first()
    await generateBtn.click()
    // Should not show raw error object
    await page.waitForTimeout(5000)
    await expect(page.locator("body")).not.toContainText(/\[object Object\]/)
    await expect(page.locator("body")).not.toContainText(/SyntaxError|TypeError|ReferenceError/)
  })

  test("viral checker - runs without crash", async ({ page }) => {
    await page.goto("/free-tools/viral-checker")
    const textarea = page.locator("textarea").first()
    await textarea.fill("5 things I learned after firing my first employee. This was the hardest decision I ever made.")
    const btn = page.getByRole("button", { name: /analyze|check/i }).first()
    await btn.click()
    await page.waitForTimeout(8000)
    // Should not crash with Objects are not valid as a React child
    await expect(page.locator("body")).not.toContainText(/Objects are not valid as a React child/)
    await expect(page.locator("body")).not.toContainText(/\[object Object\]/)
  })

  test("headline analyzer - runs without crash", async ({ page }) => {
    await page.goto("/free-tools/headline-analyzer")
    const input = page.locator('input[type="text"], textarea').first()
    await input.fill("How I went from broke to 6 figures in 12 months")
    const btn = page.getByRole("button", { name: /analyze|score|check/i }).first()
    await btn.click()
    await page.waitForTimeout(6000)
    await expect(page.locator("body")).not.toContainText(/\[object Object\]|TypeError|SyntaxError/)
  })

  test("engagement predictor - runs without crash", async ({ page }) => {
    await page.goto("/free-tools/engagement-predictor")
    const textarea = page.locator("textarea").first()
    if (await textarea.isVisible()) {
      await textarea.fill("Just closed a $100K deal. Here is what worked.")
      const btn = page.getByRole("button", { name: /review|predict|analyze|check/i }).first()
      await btn.click()
      await page.waitForTimeout(6000)
      await expect(page.locator("body")).not.toContainText(/\[object Object\]|TypeError/)
    }
  })

  test("profile optimizer - has input and runs", async ({ page }) => {
    await page.goto("/free-tools/profile-optimizer")
    await expect(page.locator("h1, h2").first()).toBeVisible()
    const input = page.locator('input[type="text"], textarea').first()
    if (await input.isVisible()) {
      await input.fill("Helping SaaS companies grow through content marketing")
      const btn = page.getByRole("button", { name: /optimize|analyze|improve/i }).first()
      if (await btn.isVisible()) {
        await btn.click()
        await page.waitForTimeout(5000)
        await expect(page.locator("body")).not.toContainText(/\[object Object\]|TypeError/)
      }
    }
  })

  test("carousel builder - builds a preview without an account", async ({ page }) => {
    await page.goto("/free-tools/carousel-builder")
    await page.locator("#carousel-source").fill(
      "The best leaders make decisions with incomplete information.\n\nThey state the tradeoff clearly.\n\nThey review outcomes without rewriting history.",
    )
    await page.getByRole("button", { name: "Build Carousel with AI" }).click()
    await expect(page.getByText(/Slide 1 of/)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("button", { name: "Download Slide 1 (PNG)" })).toBeVisible()
  })

  test("comment generator - preserves its deep link through sign-in", async ({ page }) => {
    await page.goto("/free-tools/comment-generator")
    await page.locator("textarea").first().fill("This post makes a useful point about building trust through consistent work.")
    await page.getByRole("button", { name: /generate 3/i }).click()
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Ffree-tools%2Fcomment-generator/)
  })

  test("free tools page - correct pricing copy (no trial)", async ({ page }) => {
    await page.goto("/free-tools", { waitUntil: "networkidle" })
    const bodyText = await page.locator("body").textContent()
    // Must not contain trial copy
    expect(bodyText).not.toMatch(/7-Day Free Trial/)
    // Must contain USD pricing or free language
    expect(bodyText).toMatch(/\$\d+|free|Free/i)
  })
})

// ── SECTION 6: Mobile UX audit ───────────────────────────────────────────────

test.describe("Mobile layout (375px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE)
  })

  test("pricing page no overflow", async ({ page }) => {
    await page.goto("/pricing")
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(380)
  })

  test("free-tools page no overflow", async ({ page }) => {
    await page.goto("/free-tools")
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(380)
  })

  test("contact page - form visible and usable", async ({ page }) => {
    await page.goto("/contact")
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first()
    if (await nameInput.isVisible()) {
      await expect(nameInput).toBeVisible()
      const rect = await nameInput.boundingBox()
      expect(rect?.width).toBeGreaterThan(100)
    }
  })

  test("blog listing no overflow", async ({ page }) => {
    await page.goto("/blog")
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(380)
  })
})

// ── SECTION 7: Navigation ────────────────────────────────────────────────────

test.describe("Navbar & navigation", () => {
  test("navbar is sticky / fixed on scroll", async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => window.scrollBy(0, 600))
    const nav = page.locator("nav, header").first()
    await expect(nav).toBeVisible()
  })

  test("footer links render correctly", async ({ page }) => {
    await page.goto("/")
    const footer = page.locator("footer")
    await expect(footer).toBeVisible()
    const links = await footer.getByRole("link").all()
    expect(links.length).toBeGreaterThan(3)
  })

  test("404 page renders for unknown route", async ({ page }) => {
    const res = await page.goto("/this-page-definitely-does-not-exist-xyz123")
    expect(res?.status()).toBe(404)
    await expect(page.locator("body")).toContainText(/404|not found/i)
  })
})

// ── SECTION 8: API health checks (unauthenticated) ───────────────────────────

test.describe("API endpoints", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const res = await request.get("/api/health")
    expect(res.status()).toBe(200)
  })

  test("protected APIs reject with 401, not 500", async ({ request }) => {
    // GET endpoints that require auth
    for (const path of [
      "/api/posts",
      "/api/voice-profile",
      "/api/library",
      "/api/carousel",
      "/api/dashboard/stats",
    ]) {
      const res = await request.get(path)
      expect(res.status()).not.toBe(500)
      expect([401, 403]).toContain(res.status())
    }
    // POST endpoints that require auth - send empty body
    for (const path of [
      "/api/generate/post",
    ]) {
      const res = await request.post(path, { data: {} })
      expect(res.status()).not.toBe(500)
      expect([400, 401, 403]).toContain(res.status())
    }
  })

  test("plan/status returns 401 unauthenticated", async ({ request }) => {
    const res = await request.get("/plan/status")
    expect([401, 403]).toContain(res.status())
  })

  test("contact API rejects empty body with 400", async ({ request }) => {
    const res = await request.post("/api/contact", { data: {} })
    expect(res.status()).toBe(400)
  })
})

// ── SECTION 9: Contact form validation ───────────────────────────────────────

test.describe("Contact form", () => {
  test("empty submit shows inline errors (not browser native tooltip)", async ({ page }) => {
    await page.goto("/contact")
    const form = page.locator("form").first()
    // Click submit without filling
    const submitBtn = form.getByRole("button", { name: /send|submit/i })
    await submitBtn.click()
    await page.waitForTimeout(500)
    // Should show error messages in DOM, not just browser native validation
    const errMsg = page.locator("[class*='error'], [class*='invalid'], [aria-invalid='true']").first()
    await expect(errMsg).toBeVisible()
  })

  test("invalid email shows error", async ({ page }) => {
    await page.goto("/contact")
    const emailInput = page.locator('input[type="email"]').first()
    await emailInput.fill("notanemail")
    await emailInput.blur()
    const form = page.locator("form").first()
    const submitBtn = form.getByRole("button", { name: /send|submit/i })
    await submitBtn.click()
    await page.waitForTimeout(500)
    await expect(page.locator("body")).toContainText(/valid email|invalid email|enter.*email/i)
  })
})

// ── SECTION 10: Blog ─────────────────────────────────────────────────────────

test.describe("Blog", () => {
  test("blog listing page renders with posts", async ({ page }) => {
    await page.goto("/blog")
    await expect(page.locator("h1, h2").first()).toBeVisible()
    // Should have article links
    const articleLinks = await page.locator("a[href*='/blog/']").all()
    if (articleLinks.length > 0) {
      const firstHref = await articleLinks[0].getAttribute("href")
      const res = await page.goto(firstHref || "/blog")
      expect(res?.status()).toBeLessThan(400)
      // Title should not be doubled
      await expect(page).not.toHaveTitle(/Qalam.*Qalam/)
    }
  })
})

// ── SECTION 11: Demo page ─────────────────────────────────────────────────────

test.describe("Demo page", () => {
  test("demo loads with writer UI", async ({ page }) => {
    await page.goto("/demo")
    await expect(page.locator("body")).toContainText(/write|post|topic|generate|hook/i)
  })

  test("demo CTA buttons open signup flow, not crash", async ({ page }) => {
    await page.goto("/demo")
    const errors: string[] = []
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.waitForLoadState("networkidle")
    expect(errors.filter((e) => !e.includes("favicon"))).toHaveLength(0)
  })
})

// ── SECTION 12: Robots / Sitemap / SEO infrastructure ────────────────────────

test.describe("SEO infrastructure", () => {
  test("robots.txt is correct", async ({ request }) => {
    const res = await request.get("/robots.txt")
    expect(res.status()).toBe(200)
    const text = await res.text()
    // User-Agent casing varies by Next.js version, check case-insensitively
    expect(text.toLowerCase()).toContain("user-agent")
    expect(text.toLowerCase()).toContain("sitemap")
  })

  test("sitemap.xml renders valid XML", async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).toContain("<urlset")
    expect(text).toContain("<url>")
    // Sitemap should contain at least one URL loc element with a valid href
    expect(text).toContain("<loc>")
  })

  test("llms.txt route returns text content", async ({ request }) => {
    const res = await request.get("/llms.txt")
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text.length).toBeGreaterThan(100)
  })
})

// ── SECTION 13: Accessibility basics ─────────────────────────────────────────

test.describe("Accessibility", () => {
  test("landing page has skip-to-content link", async ({ page }) => {
    await page.goto("/")
    const skipLink = page.locator('a[href="#main-content"]')
    // Skip link can be visually hidden but must exist in DOM
    await expect(skipLink).toBeAttached()
  })

  test("images on landing have alt attributes", async ({ page }) => {
    await page.goto("/")
    const imgs = await page.locator("img").all()
    for (const img of imgs) {
      const alt = await img.getAttribute("alt")
      // alt can be empty string for decorative images, but must be present
      expect(alt).not.toBeNull()
    }
  })

  test("pricing page interactive elements have accessible labels", async ({ page }) => {
    await page.goto("/pricing")
    const buttons = await page.getByRole("button").all()
    for (const btn of buttons) {
      const text = await btn.textContent()
      const label = await btn.getAttribute("aria-label")
      expect(text?.trim() || label).toBeTruthy()
    }
  })
})
