import { defineConfig, devices } from "@playwright/test"

const productionServer = process.env.PLAYWRIGHT_PRODUCTION === "1"
const selectedBrowser = process.env.PLAYWRIGHT_BROWSER
const browserProjects = selectedBrowser === "firefox"
  ? [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }]
  : selectedBrowser === "webkit"
    ? [{ name: "webkit", use: { ...devices["Desktop Safari"] } }]
    : [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: browserProjects,
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER ? undefined : {
    command: productionServer ? "npm run start -- --port 3000" : "npm run dev -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
