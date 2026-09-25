import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/server/supabase-rest", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/server/agency/voice-passport", () => ({ getPromptPassport: vi.fn() }))

import { applyVoiceMechanics, measureVoice, wordTargetFor } from "@/lib/voice-measure"
import { toPromptVoiceProfile, voiceTrainingAllowed } from "@/lib/server/voice-profile"
import { checkSampleEcho } from "@/lib/prompts/output-checks"
import { buildPostFromHookPrompt } from "@/lib/prompts/role-aware-system"
import { authorContext } from "@/lib/prompts/writing-policy"

// A real, distinctive author from the live test: short posts, British spelling,
// a fixed sign-off, no hashtags, never a closing question.
const SAMPLES = [
  "Our pick accuracy went up when we took a scanner away.\n\nEveryone assumed the fix was more checks. More checks meant more steps, and more steps meant more places to go wrong.\n\nThe boring answer is usually the right one. Fewer touches, fewer errors.\n\nThat's the post.",
  "Three things I've learnt running night shifts for nine years:\n\n1. Nobody reads the SOP. They copy whoever was there before them.\n2. The best trainer on the floor is rarely the manager.\n3. If a process needs a laminated sign, the process is wrong.\n\nOrganise around that and half your problems go.\n\nThat's the post.",
  "We spent £40k on a WMS module last year. Used it for six weeks.\n\nNot because it was bad. Because nobody on the floor was asked what they actually needed.\n\nThe boring answer: walk the floor before you sign the PO.\n\nThat's the post.",
  "Honestly, most \"culture\" problems in a warehouse are rota problems.\n\nFix the rota. People stop leaving. Funny how that works.\n\nThat's the post.",
].join("\n\n---\n\n")

describe("measureVoice", () => {
  const measured = measureVoice(SAMPLES)!

  it("finds what the live drafts missed", () => {
    expect(measured.postCount).toBe(4)
    expect(measured.signOff).toBe("That's the post.")
    expect(measured.spelling).toBe("British")
    expect(measured.hashtags).toBe("never")
    expect(measured.emoji).toBe("never")
    expect(measured.closesWithQuestion).toBe("never")
    expect(measured.wordsPerPost).toBeGreaterThan(25)
    expect(measured.wordsPerPost).toBeLessThan(60)
  })

  it("needs at least two posts and ignores a sign-off used once", () => {
    expect(measureVoice(SAMPLES.split("---")[0])).toBeUndefined()
    const mixed = "First post about one thing entirely.\n\nSee you Monday.\n\n---\n\nSecond post about another thing entirely.\n\nBack to work."
    expect(measureVoice(mixed)?.signOff).toBeUndefined()
  })

  it("does not call -ise words that are spelled that way everywhere British", () => {
    const text = "We will advertise the prize.\n\nA surprise, likewise.\n\n---\n\nThe enterprise raised its price.\n\nOtherwise fine."
    expect(measureVoice(text)?.spelling).toBeUndefined()
  })
})

describe("wordTargetFor", () => {
  it("anchors length to the author and still honours the format", () => {
    const measured = measureVoice(SAMPLES)!
    const medium = wordTargetFor("medium", measured)!
    const long = wordTargetFor("long", measured)!
    expect(medium.max).toBeLessThan(100)
    expect(long.min).toBeGreaterThan(medium.min)
    expect(wordTargetFor("medium")).toBeUndefined()
  })
})

describe("applyVoiceMechanics", () => {
  const measured = measureVoice(SAMPLES)!

  it("adds the sign-off and removes hashtags for an author who never uses them", () => {
    const draft = "Walk the pick path yourself.\n\nMost fixes are removals.\n\n#Warehouse #Ops"
    expect(applyVoiceMechanics(draft, measured)).toBe("Walk the pick path yourself.\n\nMost fixes are removals.\n\nThat's the post.")
  })

  it("leaves a post that already signs off alone", () => {
    const draft = "Walk the pick path yourself.\n\nThat's the post."
    expect(applyVoiceMechanics(draft, measured)).toBe(draft)
  })

  it("keeps hashtags after the sign-off for an author who uses them", () => {
    const draft = "Point made.\n\n#Ops"
    expect(applyVoiceMechanics(draft, { ...measured, hashtags: "usually" })).toBe("Point made.\n\nThat's the post.\n\n#Ops")
  })
})

describe("checkSampleEcho", () => {
  const samples = SAMPLES.split("\n\n---\n\n")

  it("flags sample content lifted into an unrelated post", () => {
    const post = "Hiring before product fit is expensive.\n\nPeople stop leaving when the product solves a real pain."
    const [defect] = checkSampleEcho(post, samples)
    expect(defect.code).toBe("sample_echo")
    expect(defect.items).toEqual(["People stop leaving when the product solves a real pain."])
  })

  it("allows the author's signature phrases and the brief's own words", () => {
    const post = "The boring answer is to wait for ten paying customers.\n\nThat's the post."
    expect(checkSampleEcho(post, samples, ["That's the post.", "the boring answer"])).toEqual([])
    expect(checkSampleEcho("Warehouse pick accuracy went up.", samples, ["pick accuracy went up"])).toEqual([])
  })

  it("does not flag ordinary shared words", () => {
    expect(checkSampleEcho("Most problems start with the process, not the people.", samples)).toEqual([])
  })
})

describe("voice profile by plan", () => {
  const row = {
    brand_tone: "Dry",
    title: "Head of Operations",
    industry: "Logistics",
    goals: "Get hired as COO",
    example_posts: SAMPLES,
    characteristics: { tone: "Dry", vocabulary: "simple", ctaStyle: "direct", commonPhrases: ["the boring answer"] },
  }

  it("gives every plan the basic profile it can save", () => {
    const basic = toPromptVoiceProfile(row, { training: false })!
    expect(basic.identity).toEqual({ title: "Head of Operations", industry: "Logistics", goals: "Get hired as COO" })
    expect(basic.tone).toBe("Dry")
    expect(basic.measured).toBeUndefined()
    expect(basic.vocabulary).toEqual([])
    expect(authorContext(basic)).toContain("Title: Head of Operations")
  })

  it("adds training data, analysis fields and measurements for Pro", () => {
    const full = toPromptVoiceProfile(row)!
    expect(full.vocabularyLevel).toBe("simple")
    expect(full.closingStyle).toBe("direct")
    expect(full.measured?.signOff).toBe("That's the post.")
    const context = authorContext(full)
    expect(context).toContain("\"That's the post.\"")
    expect(context).toContain("British spelling")
    expect(context).toContain("never use hashtags")
  })

  it("gates training on plan", () => {
    expect(voiceTrainingAllowed("Free")).toBe(false)
    expect(voiceTrainingAllowed("solo")).toBe(false)
    expect(voiceTrainingAllowed("Pro")).toBe(true)
    expect(voiceTrainingAllowed("agency")).toBe(true)
    expect(voiceTrainingAllowed(undefined)).toBe(true)
  })

  it("sets the post length from the author, not the format default", () => {
    const { system } = buildPostFromHookPrompt("Hook.", "topic", "Director", "medium", undefined, toPromptVoiceProfile(row))
    expect(system).not.toContain("250-350 words")
    expect(system).toMatch(/\d+-\d+ words\. That is how long this author's own posts run/)
  })
})

describe("paragraph spacing", () => {
  const measured = measureVoice(SAMPLES)!

  it("measures the blank-line habit", () => {
    expect(measured.blankLineParagraphs).toBe(true)
  })

  it("spaces out a post that came back as one block, keeping list items together", () => {
    const draft = "Most startups hire too early.\nThree signs:\n1. No repeat buyers.\n2. No pricing.\nThat's the post."
    expect(applyVoiceMechanics(draft, measured)).toBe("Most startups hire too early.\n\nThree signs:\n\n1. No repeat buyers.\n2. No pricing.\n\nThat's the post.")
  })
})
