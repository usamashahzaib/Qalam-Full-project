import { expect, test } from "@playwright/test"
import { encode } from "next-auth/jwt"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, StandardFonts } from "pdf-lib"
import argon2 from "argon2"

test("local email and password login succeeds", async ({ page }) => {
  test.skip(process.env.RUN_AUTHENTICATED_AUDIT !== "1", "Requires live Supabase")
  test.setTimeout(90_000)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are required")
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  await supabase.from("users").delete().like("email", "password-audit-%@example.invalid")
  const auditId = crypto.randomUUID()
  const email = `password-audit-${auditId}@example.invalid`
  const password = `Qalam!${auditId}`
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  })
  const { data: user, error } = await supabase
    .from("users")
    .insert({
      email,
      full_name: "Password Audit",
      password_hash: passwordHash,
      email_verified: true,
      auth_provider: "credentials",
    })
    .select("id")
    .single()
  if (error || !user) throw error || new Error("Could not create password audit user")

  try {
    await page.goto("/login")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    const authResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/auth/callback/credentials"),
    )
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    const authResponse = await authResponsePromise
    const authBody = await authResponse.text()
    expect(authResponse.ok(), `Credentials callback failed: ${authResponse.status()} ${authBody}`).toBe(true)
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
    const sessionResponse = await page.request.get("/api/auth/session")
    expect(sessionResponse.status()).toBe(200)
    const session = await sessionResponse.json()
    expect(session.user).toMatchObject({ email, name: "Password Audit", provider: "credentials" })
  } finally {
    await page.close()
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    const { data: cleanupUser, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (cleanupUser?.id) {
      const { error: cleanupError } = await supabase.rpc("delete_user_data", {
        target_user_id: cleanupUser.id,
      })
      if (cleanupError) throw cleanupError
    }
  }
})

test("authenticated writer, dashboard, settings, and account deletion", async ({ page, context }) => {
  test.skip(process.env.RUN_AUTHENTICATED_AUDIT !== "1", "Requires live Supabase and AI providers")
  test.setTimeout(180_000)
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is required for authenticated audit")
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are required")
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const loginResponse = await page.goto("/login")
  expect(loginResponse?.status()).toBe(200)
  await expect(page.locator("body")).not.toContainText(/Internal server error|Application error/)

  const auditId = crypto.randomUUID()
  const email = `audit-${auditId}@example.invalid`
  const session = {
    sub: auditId,
    id: auditId,
    email,
    name: "Audit Runtime",
    provider: "linkedin",
  }
  const cookieNames = ["authjs.session-token", "__Secure-authjs.session-token"] as const
  const cookies = await Promise.all(cookieNames.map(async (name) => ({
    name,
    value: await encode({ secret, salt: name, maxAge: 60 * 60, token: session }),
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: name.startsWith("__Secure-"),
    sameSite: "Lax" as const,
  })))

  await context.addCookies(cookies)

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
    const careerLink = page.getByRole("link", { name: "Career Hub" }).first()
    await expect(careerLink).toBeVisible()
    expect(await careerLink.getAttribute("href")).toContain("/career")
    const userMenu = page.getByRole("button", { name: "User menu" })
    await expect(userMenu).toContainText("Audit Runtime")

    const freeGates = [
      ["/calendar", "Upgrade to Solo"],
      ["/analytics", "Upgrade to Solo"],
      ["/library", "Upgrade to Solo"],
      ["/chat", "Upgrade to Pro"],
      ["/approvals", "Upgrade to Pro"],
      ["/competitors", "Upgrade to Pro"],
      ["/career/network", "Upgrade to Pro"],
      ["/agency", "Upgrade to Agency"],
    ] as const
    for (const [path, upgradeLabel] of freeGates) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBeLessThan(400)
      await expect(page.locator("#main-content").getByRole("button", { name: upgradeLabel }).last(), path).toBeVisible()
    }

    const careerResponse = await page.goto("/career")
    expect(careerResponse?.status()).toBeLessThan(400)
    await expect(page.getByRole("heading", { name: /Build a career profile/ })).toBeVisible()
    expect((await page.request.get("/api/career-vault")).status()).toBe(200)

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
        idempotencyKey: crypto.randomUUID(),
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

    const carouselResponse = await page.request.post("/api/carousel", {
      data: {
        topic,
        role: "Founder",
        slideCount: 5,
        tone: "Authority Playbook",
        sourceContent: post.content.slice(0, 3000),
      },
    })
    expect(carouselResponse.status()).toBe(200)
    const carousel = await carouselResponse.json()
    expect(carousel.id).toBeTruthy()
    expect(carousel.slides).toHaveLength(5)

    const carouselDetail = await page.request.get(`/api/carousel/${carousel.id}`)
    expect(carouselDetail.status()).toBe(200)
    const detail = await carouselDetail.json()
    expect(detail.slides).toHaveLength(5)

    const firstSlide = detail.slides[0]
    const slideUpdate = await page.request.patch(`/api/carousel/${carousel.id}/slides/${firstSlide.id}`, {
      data: { title: `${firstSlide.title} audited`, content: firstSlide.content },
    })
    expect(slideUpdate.status()).toBe(200)

    const overLimitCarousel = await page.request.post("/api/carousel", {
      data: {
        topic,
        role: "Founder",
        slideCount: 6,
        tone: "Authority Playbook",
        sourceContent: post.content.slice(0, 3000),
      },
    })
    expect(overLimitCarousel.status()).toBe(403)
    await expect(overLimitCarousel.json()).resolves.toMatchObject({
      error: "upgrade_required",
      availableSlides: 5,
    })

    const { data: auditUser, error: auditUserError } = await supabase
      .from("users")
      .select("id")
      .eq("external_user_id", auditId)
      .single()
    if (auditUserError || !auditUser?.id) throw auditUserError || new Error("Audit user missing")
    const { error: planError } = await supabase
      .from("users")
      .update({ plan: "Pro", plan_expires_at: new Date(Date.now() + 86_400_000).toISOString() })
      .eq("id", auditUser.id)
    if (planError) throw planError

    const proRoutes = [
      "/career",
      "/career/resumes",
      "/career/content",
      "/career/network",
      "/career/cohorts",
      "/career/add-ons",
      "/voice",
      "/carousels",
      "/comment-generator",
      "/silent-growth",
      "/calendar",
      "/analytics",
      "/library",
      "/chat",
      "/approvals",
      "/competitors",
      "/settings",
    ]
    for (const path of proRoutes) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBeLessThan(400)
      await expect(page.locator("body"), path).not.toContainText(/Could not load|Internal server error|Application error/)
    }

    for (const path of [
      "/api/career-vault",
      "/api/career/resumes",
      "/api/career/content-intelligence",
      "/api/career/visibility",
      "/api/career/recruiter-search",
      "/api/career/cohorts",
      "/api/career/add-ons",
      "/api/chat/conversations",
      "/api/approvals",
      "/api/analytics",
      "/api/library",
    ]) {
      const response = await page.request.get(path)
      expect(response.status(), path).toBeLessThan(500)
    }

    const resume = await PDFDocument.create()
    const resumeFont = await resume.embedFont(StandardFonts.Helvetica)
    const resumePage = resume.addPage([612, 792])
    const resumeLines = [
      "Audit Runtime. Head of People at a B2B technology company.",
      "Led talent acquisition and scaled the team from forty to one hundred eighty.",
      "Built leadership systems, improved candidate experience, and advised founders.",
      "Writes about hiring, workplace culture, management, and people strategy.",
    ]
    resumeLines.forEach((line, index) => {
      resumePage.drawText(line, { x: 40, y: 720 - index * 24, size: 12, font: resumeFont })
    })
    const importResponse = await page.request.post("/api/voice/import-document", {
      multipart: {
        source: "resume_pdf",
        document: {
          name: "audit-resume.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from(await resume.save()),
        },
      },
    })
    expect(importResponse.status()).toBe(200)
    const imported = await importResponse.json()
    expect(imported.sourceDeleted).toBe(true)
    expect(imported.rawTextStored).toBe(false)
    expect(imported.professionalContext.primaryRole).toBeTruthy()

    const voiceSave = await page.request.post("/api/voice/save", {
      data: {
        name: imported.suggestions.name,
        title: imported.suggestions.title,
        industry: imported.suggestions.industry,
        linkedinUrl: "",
        brandTone: "Professional",
        goals: imported.suggestions.goals,
        characteristics: { professionalContext: imported.professionalContext },
      },
    })
    expect(voiceSave.status()).toBe(200)

    const voiceProfile = await page.request.get("/api/voice/me")
    expect(voiceProfile.status()).toBe(200)
    const savedVoice = await voiceProfile.json()
    expect(savedVoice.profile.characteristics.professionalContext.primaryRole).toBeTruthy()
    expect(savedVoice.profile.example_posts).toBeFalsy()

    await page.evaluate(() => sessionStorage.clear())
    const voiceResponse = await page.goto("/voice")
    expect(voiceResponse?.status()).toBeLessThan(400)
    await expect(page.getByRole("heading", { name: "Your Profile" })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("heading", { name: /Professional context/ })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Source deleted", { exact: true })).toBeVisible({ timeout: 30_000 })

    const pricingResponse = await page.goto("/pricing")
    expect(pricingResponse?.status()).toBeLessThan(400)
    await expect(page.locator("body")).toContainText("$10")
    await expect(page.locator("body")).toContainText("$18")
    await expect(page.locator("body")).toContainText("Managed Plans")
  } finally {
    let deletionStatus: number | null = null
    if (provisioned) {
      const deletion = await page.request.delete("/api/user/delete")
      deletionStatus = deletion.status()
    }
    const { data: residue } = await supabase
      .from("users")
      .select("id")
      .eq("external_user_id", auditId)
      .maybeSingle()
    if (residue?.id) {
      const { error } = await supabase.rpc("delete_user_data", { target_user_id: residue.id })
      if (error) throw error
    }
    if (deletionStatus !== null) expect(deletionStatus).toBe(200)
  }
})
