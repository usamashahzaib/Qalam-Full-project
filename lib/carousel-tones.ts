// Shared source of truth for carousel content tones. The generator UI shows
// this structure as the deck preview, and the API sends the same structure to
// the AI - so what the user sees promised is what the model is asked to build.

export type CarouselTone = {
  tagline: string
  structure: string[]
}

export const CAROUSEL_TONES: Record<string, CarouselTone> = {
  "Authority Playbook": {
    tagline: "Position as the definitive expert",
    structure: ["Hook: The tension only experts see", "Framework: Your core model", "Case: Proof it works", "Counterpoint: What others get wrong", "Principle: The key insight", "Tool: Practical application", "CTA: Where to go deeper"],
  },
  "Executive Brief": {
    tagline: "Crisp, data-backed leadership voice",
    structure: ["Problem: Business-critical tension", "Data: The number that changes things", "Analysis: What it means", "Decision: What leaders should do", "Risk: What you're trading off", "Upside: Why it's worth it", "Signal: Watch for this outcome"],
  },
  "Contrarian Breakdown": {
    tagline: "Challenge the conventional wisdom",
    structure: ["Provocation: The popular belief", "Reveal: Why it's wrong", "Evidence: The actual data", "Mechanism: How it really works", "Example: A case study", "Nuance: When it does apply", "Conclusion: The harder truth"],
  },
  "People Strategy": {
    tagline: "Org design, talent, and leadership",
    structure: ["Challenge: The team problem", "Pattern: What high performers do", "Signal: How to spot it early", "Structure: The system that works", "Mistake: What managers get wrong", "Build: The practical step", "CTA: Share with your team"],
  },
  "Growth Memo": {
    tagline: "Metrics, loops, and distribution",
    structure: ["Metric: The number to care about", "Benchmark: How you stack up", "Driver: What moves it", "Lever: The high-impact action", "Test: What to validate first", "Scale: How to compound it", "Outcome: What good looks like"],
  },
  "Hiring Deep Dive": {
    tagline: "Attract, assess, and close top talent",
    structure: ["Gap: The role you actually need", "Signal: How great candidates think", "Screen: What to look for first", "Interview: The question that reveals it", "Red flag: What to walk away from", "Offer: How to close them", "Onboard: The first-week setup"],
  },
}

export const CAROUSEL_TONE_NAMES = Object.keys(CAROUSEL_TONES)
