import type { Metadata } from "next"
import { CareerAnswerPage, type CareerAnswerPageData } from "@/components/career/CareerAnswerPage"
import { buildPageMetadata } from "@/lib/seo"

const page: CareerAnswerPageData = {
  path: "/methodology/linkedin-authority-score",
  eyebrow: "Explainable scoring",
  title: "How Qalam evaluates LinkedIn authority",
  summary: "An evidence-led method for separating profile clarity, search relevance, proof, completeness, and professional-story alignment.",
  directAnswer: "The Qalam LinkedIn Authority Score is an independent profile diagnostic. It summarizes visible strengths and gaps in information you provide. It is not an official LinkedIn score and does not estimate private recruiter behavior.",
  status: "Methodology version 1.0",
  statusDetail: "The methodology is designed to stay explainable. Each dimension should show its evidence, findings, limitations, and next action.",
  problemTitle: "One unexplained number hides the real problem",
  problem: "A profile can look complete while its positioning is unclear, or use relevant keywords while offering little proof. Qalam keeps these dimensions separate so the total score cannot hide the section that needs work.",
  steps: [
    { number: "01", title: "Positioning clarity", body: "Can the intended audience understand the role, focus, audience, and value quickly?" },
    { number: "02", title: "Search relevance", body: "Does the profile use accurate language connected to the target role, industry, and capabilities?" },
    { number: "03", title: "Credibility and proof", body: "Are claims supported by responsibilities, outcomes, scope, work samples, or supplied evidence?" },
    { number: "04", title: "Completeness and alignment", body: "Do the sections, content, and target roles support one coherent professional story?" },
  ],
  includes: ["Dimension-level findings", "Evidence source labels", "Missing-information flags", "Priority actions", "Clear limits and confidence"],
  limits: ["Not an official LinkedIn rating", "Not a prediction of reach or hiring", "Not a substitute for recruiter judgment", "Not based on private profile analytics"],
  primaryCta: { label: "Run a profile audit", href: "/login?callbackUrl=/career" },
  secondaryCta: { label: "Read LinkedIn optimization", href: "/linkedin-optimization" },
  faqs: [
    { question: "Is the score based on LinkedIn's algorithm?", answer: "No. LinkedIn does not provide Qalam with a public authority-scoring algorithm. This is an independent diagnostic." },
    { question: "Can two people with the same score need different changes?", answer: "Yes. The dimension breakdown and evidence matter more than the total because different gaps can produce the same score." },
    { question: "Will adding more keywords increase the score?", answer: "Only relevant, accurate terms help search relevance. Keyword stuffing weakens clarity and is not rewarded." },
  ],
}

export const metadata: Metadata = buildPageMetadata({ title: page.title, description: page.summary, path: page.path, tag: "Authority score methodology" })

export default function AuthorityScoreMethodologyPage() {
  return <CareerAnswerPage page={page} />
}
