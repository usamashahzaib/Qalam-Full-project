import { describe, expect, it } from "vitest"

import { build7MetricScorePrompt, buildImprovePrompt } from "@/lib/prompts/role-aware-system"
import { capUnsupported, gateScores, sanitizeTips, verifiedUnsupportedClaims } from "@/lib/content-score-gate"
import { checkGrounding, defectWeight, removeInventedSentences } from "@/lib/prompts/output-checks"

const post = [
  "A 0.9 % mis-pick rate after six months, down from 4.1 % when we cut a scanner out of the line.",
  "",
  "The team owned the change, complaints fell, and turnover dipped because the job got simpler and faster.",
].join("\n")

describe("score prompt brief", () => {
  it("gives the scorer the brief and asks for unsupported claims first", () => {
    const { system } = build7MetricScorePrompt(post, "Director", undefined, "Topic: cut mis-picks from 4.1% to 0.9%")
    expect(system).toContain("cut mis-picks from 4.1% to 0.9%")
    expect(system.indexOf("\"unsupported\"")).toBeLessThan(system.indexOf("\"hook\": number"))
  })

  it("treats text without a brief as the author's own", () => {
    const { system } = build7MetricScorePrompt(post, "Director")
    expect(system).toContain("this is the author's own text")
    expect(system).not.toContain("\"unsupported\"")
  })

  it("tells Push to 90+ to take the flagged sentences out", () => {
    const { system } = buildImprovePrompt(post, { specificity: 40, unsupported: ["turnover dipped"] }, "Director", undefined, [], "Topic: x")
    expect(system).toContain("- \"turnover dipped\"")
    expect(system).toContain("The author's brief")
  })
})

describe("verifiedUnsupportedClaims", () => {
  it("keeps quotes that are in the post, even with changed punctuation", () => {
    expect(verifiedUnsupportedClaims(post, ["The team owned the change - complaints fell, and turnover dipped because the job got simpler and faster"]))
      .toHaveLength(1)
  })

  it("drops quotes the scorer made up", () => {
    expect(verifiedUnsupportedClaims(post, ["We hired three new pickers in March to cover nights."])).toEqual([])
    expect(verifiedUnsupportedClaims(post, "not an array")).toEqual([])
  })

  it("ignores questions, which claim nothing", () => {
    expect(verifiedUnsupportedClaims(`${post}\n\nWhat simple step have you removed?`, ["What simple step have you removed?"])).toEqual([])
  })
})

describe("capUnsupported", () => {
  it("caps specificity and human only when a claim is verified", () => {
    const scores = { specificity: 85, human: 80, hook: 90 }
    expect(capUnsupported(scores, ["x"])).toEqual({ specificity: 40, human: 50, hook: 90 })
    expect(capUnsupported(scores, [])).toBe(scores)
  })
})

describe("sanitizeTips", () => {
  it("drops tips that ask for invented facts or a closing question, keeps edits", () => {
    const tips = sanitizeTips({
      a: "Include a brief lesson learned or metric from your experience",
      b: "End with a clear invitation to share experiences or ask a question",
      c: "Reference a known framework or internal metric without inventing new data",
      d: "Briefly note your role or experience that gives weight to the advice.",
      e: "Replace the generic question with a brief concluding statement",
      f: "Add a line break before the final question to improve visual separation.",
      g: "Remove personal anecdotes that aren't verifiable",
      h: "Keep language consistently informal and avoid corporate buzzwords",
    })
    expect([tips.a, tips.b, tips.c, tips.d]).toEqual(Array(4).fill("Leave as is."))
    expect(tips.e).toContain("Replace")
    expect(tips.f).toContain("line break")
    expect(tips.g).toContain("Remove")
    expect(tips.h).toContain("informal")
  })

  it("runs inside gateScores", () => {
    const gated = gateScores(post, {
      hook: 70, readability: 70, authority: 70, specificity: 70, cta: 70, human: 70, voiceFit: 70, overall: 70,
      tips: { cta: "Pose a direct question that invites founders to share their hiring timing experiences." },
    })
    expect(gated.tips?.cta).toBe("Leave as is.")
  })
})

describe("checkGrounding", () => {
  const startupBrief = "why most startups hire too early"
  const warehouseBrief = "We cut warehouse mis-picks from 4.1% to 0.9% in six months by removing a scanning step, not adding one"

  it("flags a first-person history the brief never gave", () => {
    const text = "I was wrong about the need for a full sales team before the first ten customers.\nWe had to let someone go before we had a clear roadmap.\nKeep the team small until the product works."
    const defects = checkGrounding(text, startupBrief)
    expect(defects.map((d) => d.code)).toEqual(["unsupported_experience"])
    expect(defects[0].items).toHaveLength(2)
  })

  it("flags invented figures and cited benchmarks", () => {
    const text = "Startups that add headcount before product-market fit burn about 30% faster, according to a recent SaaS benchmark.\nEach scan added a 30-second delay."
    const codes = checkGrounding(text, startupBrief).map((d) => d.code)
    expect(codes).toContain("unsupported_figure")
    expect(codes).toContain("unsupported_source")
  })

  it("accepts figures and first person that the brief supplied", () => {
    const text = "We had a 4.1 % mis-pick rate. When we removed that scan, the rate dropped to 0.9 % in six months."
    expect(checkGrounding(text, warehouseBrief)).toEqual([])
  })

  it("decides first person on the brief, not on an AI-written hook in the sources", () => {
    const text = "We had to let someone go."
    expect(checkGrounding(text, `${startupBrief}\nWhen I hired too early, it hurt.`, { brief: startupBrief })).toHaveLength(1)
  })

  it("leaves general reasoning and small counts alone", () => {
    const text = "Hiring before you know the problem is a shortcut to chaos.\n\nThree hires in, the roadmap still changes weekly. Say a team hires 2 engineers before launch: the runway shrinks.\n\n#startup #founder"
    expect(checkGrounding(text, startupBrief)).toEqual([])
  })

  it("catches the first-person events that leaked in the live run", () => {
    for (const sentence of [
      "The client asked for a feature. We declined.",
      "That loss felt like a punch to the gut and taught me that hiring should follow demand.",
      "I've seen it happen too many times.",
      "Revenue came in, we understood the true cost of acquisition.",
      "It would double our engineering hours.",
    ]) expect(checkGrounding(sentence, startupBrief)).toHaveLength(1)
  })

  it("does not flag opinions, needs or generic possessives", () => {
    for (const sentence of [
      "I think most founders hire to feel progress.",
      "We need to talk about runway before headcount.",
      "In our industry, hiring is treated as a milestone.",
      "My view: hire for the gap you can name.",
    ]) expect(checkGrounding(sentence, startupBrief)).toEqual([])
  })

  it("treats a sentence the author already wrote as theirs", () => {
    const draft = "We had to let someone go before we had a roadmap."
    expect(checkGrounding(draft, `${startupBrief}\n${draft}`, { brief: startupBrief })).toEqual([])
  })

  it("weights defects by flagged phrase so a partial repair counts", () => {
    const before = checkGrounding("I lost a client. We hired too early. I spent 40k.", startupBrief)
    const after = checkGrounding("We hired too early.", startupBrief)
    expect(defectWeight(after)).toBeLessThan(defectWeight(before))
  })
})

describe("removeInventedSentences", () => {
  it("cuts flagged sentences and tidies the spacing", () => {
    const text = "Keep the team lean.\nI was wrong about scaling the team before revenue.\n\n\nShip first."
    const defects = checkGrounding(text, "why most startups hire too early")
    expect(removeInventedSentences(text, defects)).toBe("Keep the team lean.\n\nShip first.")
  })
})
