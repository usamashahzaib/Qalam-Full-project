import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { buildMatchProfileDraft } from "@/lib/match-profile-prefill"

const publishingContext = {
  primaryRole: "Head of People",
  seniority: "Director",
  industry: "Financial services",
  expertise: ["People analytics", "Hiring"],
  audience: ["Founders", "HR leaders"],
  contentPillars: ["Leadership", "People analytics"],
  proofPoints: ["Built a regional hiring program"],
  careerHighlights: ["Led people operations"],
  avoidedTopics: [],
  contentGoals: ["Peer learning", "Useful collaborations"],
  confidence: 0.9,
  source: "linkedin_pdf" as const,
}

describe("Signal Match private prefill", () => {
  it("builds an editable draft from all grounded first-party sources", () => {
    const result = buildMatchProfileDraft({
      careerVault: {
        target_role: "VP People",
        target_industry: "Technology",
        location: "Lahore, Pakistan",
        skills: ["Workforce planning", "Hiring"],
        career_goals: "Meet trusted peers; Learn from operators",
      },
      profile: {
        name: "Ayesha Khan",
        title: "People leader",
        industry: "Fintech",
        linkedin_url: "https://www.linkedin.com/in/ayesha-khan",
        goals: "Build authority, Find collaborators",
        characteristics: { professionalContext: publishingContext },
      },
    })

    expect(result.draft).toMatchObject({
      opted_in: false,
      display_name: "Ayesha Khan",
      headline: "People leader",
      industry: "Fintech",
      seniority: "Director",
      location: "Lahore, Pakistan",
      audience: ["Founders", "HR leaders"],
      contact_email: null,
      linkedin_url: "https://www.linkedin.com/in/ayesha-khan",
    })
    expect(result.draft.expertise).toEqual([
      "Leadership",
      "People analytics",
      "Hiring",
      "Workforce planning",
    ])
    expect(result.sources).toEqual(["career_vault", "profile", "publishing_context"])
  })

  it("never overwrites fields the member already saved", () => {
    const result = buildMatchProfileDraft({
      saved: {
        opted_in: true,
        display_name: "Saved name",
        headline: "Saved headline",
        industry: "Saved industry",
        seniority: "Saved seniority",
        location: "Saved location",
        expertise: ["Saved topic"],
        audience: ["Saved audience"],
        goals: ["Saved goal"],
        contact_email: "saved@example.com",
        linkedin_url: "https://www.linkedin.com/in/saved",
      },
      careerVault: { target_role: "Different role", skills: ["Different topic"] },
      profile: { name: "Different name", characteristics: { professionalContext: publishingContext } },
    })

    expect(result.draft).toEqual({
      opted_in: true,
      display_name: "Saved name",
      headline: "Saved headline",
      industry: "Saved industry",
      seniority: "Saved seniority",
      location: "Saved location",
      expertise: ["Saved topic"],
      audience: ["Saved audience"],
      goals: ["Saved goal"],
      contact_email: "saved@example.com",
      linkedin_url: "https://www.linkedin.com/in/saved",
    })
    expect(result.sources).toEqual([])
  })

  it("returns a private empty draft when no saved context exists", () => {
    expect(buildMatchProfileDraft({})).toEqual({
      draft: {
        opted_in: false,
        display_name: "",
        headline: "",
        industry: "",
        seniority: "",
        location: "",
        expertise: [],
        audience: [],
        goals: [],
        contact_email: null,
        linkedin_url: null,
      },
      sources: [],
    })
  })

  it("keeps derivation separate from publication and saves consent atomically", () => {
    const route = readFileSync(resolve(process.cwd(), "app/api/match/profile/route.ts"), "utf8")
    const page = readFileSync(resolve(process.cwd(), "app/(app)/career/match/page.tsx"), "utf8")
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260827090000_signal_match_consent_atomic.sql"), "utf8")
    const matching = readFileSync(resolve(process.cwd(), "lib/server/matching.ts"), "utf8")

    const getBlock = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function PUT"))
    expect(getBlock).toContain("buildMatchProfileDraft")
    expect(getBlock).not.toContain("upsert(")
    expect(route).toContain('rpc("save_match_profile_v1"')
    expect(migration).toContain("insert into public.match_profiles")
    expect(migration).toContain("insert into public.career_consents")
    expect(matching).toContain("hasActiveMatchConsent")
    expect(matching).toContain("loadConsentedUserIds")
    expect(matching).toContain('.eq("opted_in", true)')
    expect(page).toContain("Nothing enters the matching pool until you turn matching on and save.")
    expect(page).toContain("No saved context was available for a draft.")
    expect(page).toContain("<MatchField")
  })
})
