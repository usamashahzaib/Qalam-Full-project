import type { Metadata } from "next"
import { CareerAnswerPage, type CareerAnswerPageData } from "@/components/career/CareerAnswerPage"
import { buildPageMetadata } from "@/lib/seo"

const page: CareerAnswerPageData = {
  path: "/linkedin-optimization",
  eyebrow: "LinkedIn positioning",
  title: "LinkedIn optimization that ends with specific changes",
  summary: "Audit how clearly your profile explains your value, how well your evidence supports it, and what to improve in each section.",
  directAnswer: "LinkedIn optimization makes a profile easier to understand, easier to find, and more credible to the people you want to reach. Qalam reviews the information you provide, explains the gaps, and turns findings into section-specific actions.",
  status: "Available in Career Visibility",
  statusDetail: "Profile audits use information you provide in your Qalam workspace. Qalam does not claim access to private LinkedIn analytics or recruiter activity.",
  problemTitle: "A polished profile can still be unclear",
  problem: "Recruiters, buyers, and peers do not judge the headline, About section, experience, skills, and content separately. They look for one coherent story: what you do, who it helps, what you have achieved, and why they should trust you.",
  steps: [
    { number: "01", title: "Collect the evidence", body: "Add your profile text, goals, target roles, achievements, and relevant career facts." },
    { number: "02", title: "Diagnose the gaps", body: "Review positioning clarity, search relevance, proof, completeness, and story alignment as separate dimensions." },
    { number: "03", title: "Fix priority sections", body: "See what is weak, why it matters, and the most useful change to make next." },
    { number: "04", title: "Connect content and career", body: "Carry the same positioning into LinkedIn content, ATS resumes, and target job applications." },
  ],
  includes: ["Headline relevance and search terms", "About-section clarity and proof", "Experience progression and outcomes", "Skills and profile completeness", "Alignment with content and target roles"],
  limits: ["Not an official LinkedIn score", "No guaranteed views, leads, or interviews", "No private recruiter data", "No invented achievements or keyword stuffing"],
  primaryCta: { label: "Start your profile audit", href: "/login?callbackUrl=/career" },
  secondaryCta: { label: "Try the free profile tool", href: "/free-tools/profile-optimizer" },
  faqs: [
    { question: "Does Qalam scrape my LinkedIn profile?", answer: "The current workflow uses information you provide or explicitly import. It does not claim access to private LinkedIn data." },
    { question: "Can optimization guarantee more profile views?", answer: "No. Qalam can improve clarity, evidence, and search relevance. Distribution and hiring decisions remain outside Qalam's control." },
    { question: "What should I improve first?", answer: "Start with positioning clarity and proof. More keywords cannot rescue a profile that does not explain the role, audience, value, and evidence." },
  ],
}

export const metadata: Metadata = buildPageMetadata({ title: page.title, description: page.summary, path: page.path, tag: "LinkedIn optimization" })

export default function LinkedInOptimizationPage() {
  return <CareerAnswerPage page={page} />
}
