import type { Metadata } from "next"
import Link from "next/link"
import { APP_URL, SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Career Visibility OS for LinkedIn and ATS Resumes",
  description: "Build one credible career story across LinkedIn, content, ATS resumes, recruiter discovery, and career progression with Qalam.",
  alternates: { canonical: `${SITE_URL}/career-visibility` },
}

const modules = [
  ["Career Vault", "Keep roles, skills, achievements, goals, and proof in one reusable source of truth."],
  ["LinkedIn Market Position", "Measure searchability, credibility, clarity, conversion, and professional positioning."],
  ["Post Intelligence", "Use your own content and real metrics to find what works, what weakens authority, and what to publish next."],
  ["ATS Resume Studio", "Create exact-JD resumes from verified experience with 12 ATS-safe templates and version history."],
  ["Career Network", "Opt into recruiter discovery without exposing private contact details in search results."],
  ["Learning Cohorts", "Give CHRP, CHRMP, university, and coaching learners one practical career improvement workflow."],
]

export default function CareerVisibilityPage() {
  return <main className="bg-white pt-24"><section className="border-b border-zinc-100 bg-[#073f3b] px-6 py-24 text-white"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Qalam Career Visibility OS</p><h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-tight sm:text-6xl">Get found. Build trust. Get shortlisted.</h1><p className="mt-6 max-w-2xl text-xl leading-8 text-white/70">Your LinkedIn profile, content, and resume should tell the same credible story. Qalam connects all three.</p><div className="mt-8 flex flex-wrap gap-3"><Link href={`${APP_URL}/login?callbackUrl=/career`} className="rounded-xl bg-gold px-6 py-4 font-bold text-white">Start free</Link><Link href="/pricing" className="rounded-xl border border-white/25 px-6 py-4 font-bold text-white">See quarterly plans</Link></div></div></section><section className="px-6 py-20"><div className="mx-auto max-w-6xl"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">One system, not disconnected tools</p><h2 className="mt-3 text-4xl font-bold text-zinc-900">Every career signal works from the same truth.</h2></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{modules.map(([title, copy], index) => <article key={title} className="rounded-2xl border border-zinc-200 p-6"><span className="text-xs font-bold text-gold">0{index + 1}</span><h3 className="mt-4 text-xl font-bold text-zinc-900">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{copy}</p></article>)}</div></div></section><section className="bg-zinc-50 px-6 py-20"><div className="mx-auto max-w-4xl text-center"><h2 className="text-4xl font-bold text-zinc-900">Stop presenting a different version of yourself everywhere.</h2><p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">Build the evidence once. Adapt it for the platform, audience, and job without changing the truth.</p><Link href={`${APP_URL}/login?callbackUrl=/career`} className="mt-8 inline-flex rounded-xl bg-teal px-7 py-4 font-bold text-white">Build your Career Vault</Link></div></section></main>
}
