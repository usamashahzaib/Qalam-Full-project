import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { getPlanLimits } from "@/lib/entitlements"

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

describe("voice entitlement wiring", () => {
  it("trains voice on every plan", () => {
    for (const plan of ["Free", "Solo", "Pro", "Agency"] as const) expect(getPlanLimits(plan).voiceTraining).toBe(true)
  })

  it("keeps the basic Voice Profile page open in desktop navigation", () => {
    const appShell = source("components/AppShell.tsx")
    expect(appShell).toContain('{ href: "/voice", label: "Voice Profile", icon: VoiceIcon }')
    expect(appShell).not.toContain('{ href: "/voice", label: "Voice Profile", icon: VoiceIcon, requiredPlan:')
  })

  it("does not lock the voice page or its routes behind Pro", () => {
    expect(source("app/(app)/voice/page.tsx")).not.toContain("LockedFeature")
    for (const route of ["app/api/voice/save/route.ts", "app/api/voice/analyze/route.ts", "app/api/voice-profile/route.ts"]) {
      expect(source(route)).not.toContain('requirePlan(request, "Pro")')
      expect(source(route)).not.toContain('requirePlan(req, "Pro")')
    }
  })
})
