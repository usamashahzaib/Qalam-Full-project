import type { Metadata } from "next"
import Link from "next/link"
import { CAREER_ADD_ONS, CAREER_PACKS } from "@/lib/career-pricing"
import { formatPkr } from "@/lib/pricing"
import { APP_URL, SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Career Visibility OS for LinkedIn and ATS Resumes",
  description: "Build one credible career story across LinkedIn, content, ATS resumes, recruiter discovery, interview preparation, and career progression with Qalam.",
  alternates: { canonical: `${SITE_URL}/career-visibility` },
}

const modules = [
  ["Evidence Vault", "Keep roles, skills, achievements, credentials, goals, and proof in one permissioned source of truth."],
  ["LinkedIn Market Position", "Review searchability, credibility, clarity, conversion, and professional positioning."],
  ["Post Intelligence", "Use your content and supplied metrics to find patterns, gaps, and stronger publishing decisions."],
  ["ATS Resume Studio", "Create exact-JD resumes from verified experience with ATS-safe templates and version history."],
  ["Application Outcomes", "Link each opportunity to the submitted resume version, stage history, interviews, and offers."],
  ["Cover Letter Studio", "Generate role-specific cover letters from the job description and your verified experience."],
  ["Interview Practice", "Build likely questions, answer frameworks, evidence prompts, and a practice scorecard."],
  ["Deep Resume Review", "Run a recruiter-style review with ATS risks, keyword gaps, exact rewrites, and priorities."],
  ["LinkedIn Rewrite", "Rewrite the headline, About, experience, keywords, and Featured plan around one position."],
  ["Career Network", "Opt into discovery by verified recruiters without exposing private contact details in search results."],
  ["Career Strategy", "Generate a 90-day system for positioning, skills, employers, networking, applications, and content."],
  ["Learning Cohorts", "Give certification, university, and coaching learners one practical improvement workflow."],
] as const

export default function CareerVisibilityPage() {
  return (
    <main className="bg-white pt-24">
      <section className="border-b border-zinc-100 bg-[#073f3b] px-6 py-24 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Qalam Career Visibility OS</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-tight sm:text-6xl">Get found. Build trust. Get shortlisted.</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-white/70">Your LinkedIn profile, content, resume, applications, and interview story should use the same credible evidence. Qalam connects the complete outcome workflow.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`${APP_URL}/login?callbackUrl=/career`} className="rounded-xl bg-gold px-6 py-4 font-bold text-white">Start free</Link>
            <Link href="/pricing" className="rounded-xl border border-white/25 px-6 py-4 font-bold text-white">See plans and add-ons</Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">One system, not disconnected tools</p>
            <h2 className="mt-3 text-4xl font-bold text-zinc-900">Every career signal works from the same truth.</h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">Use the core workflow on your plan, then add a specific career output when you need more capacity or depth.</p>
          </div>
          <div className="mt-10 grid gap-x-8 gap-y-0 border-y border-zinc-200 md:grid-cols-2">
            {modules.map(([title, copy], index) => (
              <article key={title} className="grid grid-cols-[2.25rem_1fr] gap-4 border-b border-zinc-100 py-6 md:[&:nth-last-child(-n+2)]:border-b-0">
                <span className="text-xs font-bold text-gold">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-100 bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">One-time career add-ons</p>
              <h2 className="mt-3 text-4xl font-bold text-zinc-900">Pay for the output, not another subscription.</h2>
              <p className="mt-4 text-base leading-7 text-zinc-600">Each credit generates and saves the result inside your Qalam workspace. Card checkout appears only for configured products.</p>
            </div>
            <Link href={`${APP_URL}/login?callbackUrl=/career/add-ons`} className="w-fit rounded-xl bg-teal px-6 py-4 font-bold text-white">Open career add-ons</Link>
          </div>

          <div className="mt-10 grid gap-5 rounded-3xl bg-zinc-900 p-7 text-white sm:grid-cols-[1fr_auto] sm:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">Most useful for one application</p><h3 className="mt-2 text-2xl font-bold">Job-Win Pack</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Review, resume, cover letter, and interview practice in one connected workflow.</p></div>
            <div className="sm:text-right"><p className="text-xs text-white/40 line-through">{formatPkr(CAREER_PACKS.find(({ key }) => key === "job_win_pack")!.originalPrice)}</p><strong className="mt-1 block text-2xl text-gold">{formatPkr(CAREER_PACKS.find(({ key }) => key === "job_win_pack")!.price)}</strong></div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {CAREER_ADD_ONS.map((item, index) => (
              <div key={item.key} className="grid gap-3 border-b border-zinc-100 px-5 py-5 last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                <span className="text-xs font-bold text-zinc-300">0{index + 1}</span>
                <div>
                  <h3 className="font-semibold text-zinc-900">{item.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500">One {item.unit}, generated inside Qalam</p>
                </div>
                <strong className="text-sm text-teal">{formatPkr(item.price)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-zinc-900">Stop presenting a different version of yourself everywhere.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">Build the evidence once. Adapt it for the platform, audience, and job without changing the truth.</p>
          <Link href={`${APP_URL}/login?callbackUrl=/career/evidence`} className="mt-8 inline-flex rounded-xl bg-teal px-7 py-4 font-bold text-white">Build your Evidence Vault</Link>
        </div>
      </section>
    </main>
  )
}
