import type { Metadata } from "next"
import { CareerAnswerPage, type CareerAnswerPageData } from "@/components/career/CareerAnswerPage"
import { buildPageMetadata } from "@/lib/seo"

const page: CareerAnswerPageData = {
  path: "/job-description-match",
  eyebrow: "ATS career engine",
  title: "Match your resume to one job without keyword stuffing",
  summary: "Compare a target job description with verified career evidence, find the real gaps, and create a dedicated resume version.",
  directAnswer: "Job-description matching compares a specific role with the evidence in your resume. A useful match identifies requirements, checks whether your experience supports them, and separates wording problems from genuine experience gaps.",
  status: "Available through ATS Resume Studio",
  statusDetail: "Each targeted version uses the career facts saved in your Career Vault. Allowances and add-on credits depend on the active plan.",
  problemTitle: "Matching words is not matching evidence",
  problem: "A resume can repeat the language of a job description and still lack the scope, outcomes, or seniority the employer expects. Qalam separates a missing phrase from a missing qualification so you know what can be rewritten and what requires real experience.",
  steps: [
    { number: "01", title: "Parse the role", body: "Separate responsibilities, required qualifications, preferred criteria, tools, domain knowledge, and seniority signals." },
    { number: "02", title: "Map your evidence", body: "Connect each material requirement to a verified resume statement or mark it unclear or unsupported." },
    { number: "03", title: "Prioritize honest changes", body: "Distinguish wording improvements from real gaps so optimization never becomes fabrication." },
    { number: "04", title: "Create one dedicated version", body: "Generate a resume version for that job while keeping dates, employers, qualifications, and achievements traceable." },
  ],
  includes: ["Required and preferred criteria", "Evidence-backed coverage", "Keyword and terminology gaps", "Seniority and scope alignment", "Priority rewrites with reasons"],
  limits: ["Not an employer's private ATS score", "No guaranteed interview", "No invented experience", "No automatic insertion of unsupported keywords"],
  primaryCta: { label: "Match a target role", href: "/login?callbackUrl=/career/resumes" },
  secondaryCta: { label: "Explore the ATS builder", href: "/ats-resume-builder" },
  faqs: [
    { question: "Can I match one resume against several jobs?", answer: "Yes, but each job should create a separate target and resume version so one generic score does not hide important differences." },
    { question: "Will Qalam add every missing keyword?", answer: "Only when your verified career evidence supports it. Unsupported requirements remain visible as gaps." },
    { question: "Does a high match guarantee an interview?", answer: "No. A match improves preparation and relevance. Employers use different systems and human hiring decisions." },
  ],
}

export const metadata: Metadata = buildPageMetadata({ title: page.title, description: page.summary, path: page.path, tag: "Job description match" })

export default function JobDescriptionMatchPage() {
  return <CareerAnswerPage page={page} />
}
