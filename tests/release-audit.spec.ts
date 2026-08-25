import { test, expect, type Page } from "@playwright/test"

/**
 * Release-gate audit. Every assertion here is evidence for a claim in
 * docs/FINAL-QUALITY-AUDIT.md, so failures must be fixed in source rather
 * than relaxed here.
 */

const VIEWPORTS = [
  { name: "360x800", width: 360, height: 800 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
]

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/free-tools",
  "/free-tools/ats-resume-checker",
  "/login",
  "/signup",
  "/forgot-password",
  "/blog",
  "/ai-linkedin-writer",
  "/demo",
]

const settle = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await page.waitForLoadState("networkidle").catch(() => undefined)
}

/**
 * `offsetParent !== null` is the tempting visibility test and it is wrong:
 * it reports null for every `position: fixed` element, which silently excludes
 * sticky headers and mobile navigation - exactly the controls these checks
 * exist to police. Rect plus computed style covers fixed elements correctly.
 */
const VISIBLE_FN = `(el) => {
  const style = getComputedStyle(el)
  if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}`

/**
 * Freezes reveal animations so a measured box is the resting box. Without this
 * a scroll-reveal transform in flight reports a scaled-down size, and reaching
 * for `offsetHeight` to dodge that would round 43.6 pixels up to a passing 44.
 */
const freezeMotion = async (page: Page) => {
  await page.addStyleTag({
    content: `*, *::before, *::after { animation: none !important; transition: none !important; transform: none !important; }`,
  })
}

test.describe("horizontal overflow matrix", () => {
  for (const viewport of VIEWPORTS) {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} has no horizontal overflow at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await settle(page, route)
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        // One pixel of tolerance for subpixel rounding of centered layouts.
        expect(overflow.scrollWidth, `${route} @ ${viewport.name}`).toBeLessThanOrEqual(overflow.clientWidth + 1)
      })
    }
  }
})

test.describe("accessibility structure", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} has exactly one h1 and no skipped heading levels`, async ({ page }) => {
      await settle(page, route)
      const headings = await page.evaluate((visibleSrc) => {
        const visible = eval(visibleSrc) as (el: Element) => boolean
        return [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
          .filter((el) => visible(el) || el.tagName === "H1")
          .map((el) => Number(el.tagName.slice(1)))
      }, VISIBLE_FN)
      const h1Count = headings.filter((level) => level === 1).length
      expect(h1Count, `${route} h1 count`).toBe(1)

      let previous = 1
      for (const level of headings) {
        expect(level - previous, `${route} heading jump to h${level}`).toBeLessThanOrEqual(1)
        previous = level
      }
    })

    test(`${route} labels every interactive control`, async ({ page }) => {
      await settle(page, route)
      const unnamed = await page.evaluate((visibleSrc) => {
        const visible = eval(visibleSrc) as (el: Element) => boolean
        const named = (el: Element) => {
          const label = (el.getAttribute("aria-label") || "").trim()
          const text = (el.textContent || "").trim()
          const title = (el.getAttribute("title") || "").trim()
          const labelledBy = el.getAttribute("aria-labelledby")
          const id = el.getAttribute("id")
          const hasFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null
          const wrapped = el.closest("label")
          const inputEl = el as HTMLInputElement
          const selfLabelled = inputEl.type === "submit" || inputEl.type === "button" ? (inputEl.value || "").trim() : ""
          return Boolean(label || text || title || labelledBy || hasFor || wrapped || selfLabelled)
        }
        return [...document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea")]
          .filter(visible)
          .filter((el) => !named(el))
          .map((el) => `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""}`)
      }, VISIBLE_FN)
      expect(unnamed, `${route} unnamed controls`).toEqual([])
    })

    test(`${route} keeps mobile tap targets at 44 pixels`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await settle(page, route)
      await freezeMotion(page)
      const small = await page.evaluate((visibleSrc) => {
        const visible = eval(visibleSrc) as (el: Element) => boolean
        return [...document.querySelectorAll("a[href],button,input[type=submit],input[type=button],[role=button]")]
          .filter(visible)
          .map((el) => ({ el, rect: el.getBoundingClientRect() }))
          // Links flowing inline inside prose are text, not standalone targets.
          .filter(({ el }) => !(el.tagName === "A" && getComputedStyle(el).display === "inline"))
          .filter(({ rect }) => rect.height < 44)
          .map(({ el, rect }) => `${el.tagName.toLowerCase()} "${(el.textContent || "").trim().slice(0, 30)}" h=${rect.height.toFixed(2)}`)
      }, VISIBLE_FN)
      expect(small, `${route} undersized targets`).toEqual([])
    })
  }
})

test.describe("keyboard and focus", () => {
  for (const route of ["/", "/pricing", "/login", "/signup", "/free-tools/ats-resume-checker"]) {
    test(`${route} exposes a visible focus indicator on the first control`, async ({ page }) => {
      await settle(page, route)
      await page.keyboard.press("Tab")
      const focus = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const style = getComputedStyle(el)
        return {
          tag: el.tagName,
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          boxShadow: style.boxShadow,
        }
      })
      if (!focus) throw new Error(`${route}: nothing was focusable on the first Tab press`)
      const visible =
        (focus.outlineStyle !== "none" && parseFloat(focus.outlineWidth) > 0) ||
        (focus.boxShadow !== "none" && focus.boxShadow !== "")
      expect(visible, `${route} focus indicator on ${focus.tag}`).toBe(true)
    })
  }

  test("homepage offers a skip link as the first tab stop", async ({ page }) => {
    await settle(page, "/")
    await page.keyboard.press("Tab")
    const first = await page.evaluate(() => ({
      text: (document.activeElement?.textContent || "").trim().toLowerCase(),
      href: document.activeElement?.getAttribute("href") || "",
    }))
    expect(first.text.includes("skip") || first.href.startsWith("#")).toBe(true)
  })
})

test.describe("runtime health", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} loads with no console errors and no failed requests`, async ({ page }) => {
      const consoleErrors: string[] = []
      const failed: string[] = []
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text())
      })
      page.on("response", (response) => {
        if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`)
      })
      await settle(page, route)
      expect(failed, `${route} failed requests`).toEqual([])
      expect(consoleErrors, `${route} console errors`).toEqual([])
    })
  }

  test("unknown route returns a real 404 page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-qalam")
    expect(response?.status()).toBe(404)
    await expect(page.locator("body")).toContainText(/404|not found/i)
  })
})

test.describe("reduced motion", () => {
  test("homepage renders its hero content with reduced motion requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await settle(page, "/")
    const h1 = page.locator("h1").first()
    await expect(h1).toBeVisible()
    const opacity = await h1.evaluate((el) => getComputedStyle(el).opacity)
    expect(Number(opacity)).toBeGreaterThan(0.9)
  })
})

test.describe("zoom", () => {
  test("pricing stays free of horizontal overflow at 200 percent zoom", async ({ page }) => {
    // 200 percent zoom on a 1280 pixel screen is equivalent to a 640 pixel viewport.
    await page.setViewportSize({ width: 640, height: 800 })
    await settle(page, "/pricing")
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  })
})

test.describe("mobile navigation open state", () => {
  // The closed mobile menu hides roughly 40 controls from every other check in
  // this file. Opening it is the only way those controls are audited at all.
  const openMenu = async (page: Page) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await settle(page, "/")
    const toggle = page.getByRole("button", { name: "Toggle menu" })
    await expect(toggle).toBeVisible()
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await freezeMotion(page)
  }

  test("toggle reports its expanded state to assistive technology", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await settle(page, "/")
    const toggle = page.getByRole("button", { name: "Toggle menu" })
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
  })

  test("every revealed control meets the 44 pixel target", async ({ page }) => {
    await openMenu(page)
    const small = await page.evaluate((visibleSrc) => {
      const visible = eval(visibleSrc) as (el: Element) => boolean
      return [...document.querySelectorAll("a[href],button,[role=button]")]
        .filter(visible)
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ el }) => !(el.tagName === "A" && getComputedStyle(el).display === "inline"))
        .filter(({ rect }) => rect.height < 44)
        .map(({ el, rect }) => `${el.tagName.toLowerCase()} "${(el.textContent || "").trim().slice(0, 30)}" h=${rect.height.toFixed(2)}`)
    }, VISIBLE_FN)
    expect(small, "undersized controls in the open mobile menu").toEqual([])
  })

  test("every revealed control has an accessible name", async ({ page }) => {
    await openMenu(page)
    const unnamed = await page.evaluate((visibleSrc) => {
      const visible = eval(visibleSrc) as (el: Element) => boolean
      return [...document.querySelectorAll("a[href],button,[role=button]")]
        .filter(visible)
        .filter((el) => !((el.getAttribute("aria-label") || "").trim() || (el.textContent || "").trim()))
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`)
    }, VISIBLE_FN)
    expect(unnamed, "unnamed controls in the open mobile menu").toEqual([])
  })

  test("the open menu is reachable and dismissable by keyboard alone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await settle(page, "/")
    const toggle = page.getByRole("button", { name: "Toggle menu" })
    await toggle.focus()
    await page.keyboard.press("Enter")
    await expect(toggle).toHaveAttribute("aria-expanded", "true")

    // Focus must be able to enter the revealed menu rather than falling past it.
    await page.keyboard.press("Tab")
    const insideMenu = await page.evaluate(() => {
      const active = document.activeElement
      if (!active) return false
      const nav = active.closest("nav,header,[role=dialog]")
      return Boolean(nav)
    })
    expect(insideMenu, "first Tab after opening did not land inside the navigation").toBe(true)

    await page.keyboard.press("Escape")
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
  })
})
