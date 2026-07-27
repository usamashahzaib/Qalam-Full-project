import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { getPlanLimits } from "@/lib/entitlements"

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

describe("voice entitlement wiring", () => {
  it("keeps trained voice Pro-only", () => {
    expect(getPlanLimits("Free").voiceTraining).toBe(false)
    expect(getPlanLimits("Solo").voiceTraining).toBe(false)
    expect(getPlanLimits("Pro").voiceTraining).toBe(true)
  })

  it("keeps the basic Voice Profile page open in desktop navigation", () => {
    const appShell = source("components/AppShell.tsx")
    expect(appShell).toContain('{ href: "/voice", label: "Voice Profile", icon: VoiceIcon }')
    expect(appShell).not.toContain('{ href: "/voice", label: "Voice Profile", icon: VoiceIcon, requiredPlan:')
  })

  it("locks only voice training controls to Pro", () => {
    const page = source("app/(app)/voice/page.tsx")
    expect(page).toContain('<LockedFeature requiredPlan="Pro" feature="Voice Training">')
  })
})
