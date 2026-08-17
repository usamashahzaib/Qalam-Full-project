import type { Metadata } from "next"
import Link from "next/link"
import { APP_URL, SITE_URL } from "@/lib/seo"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"

export const metadata: Metadata = {
  title: "1 Free ATS Resume Every Month | 12 Safe Templates",
  description: "Sign in and create one full ATS-safe resume free every month. Target an exact job description, edit every line, and export to PDF.",
  alternates: { canonical: `${SITE_URL}/ats-resume-builder` },
}

const included = [
  "Exact job description targeting",
  "ATS, relevance, impact, clarity, and progression scoring",
  "Full editor and automatic version history",
  "PDF export",
  "12 professional templates",
  "Truth-preserving AI rules",
  "One full resume generation every month on Free",
]

export default function AtsResumeBuilderPage() {
  return (
    <main className="bg-white pt-24">
      <section className="border-b border-zinc-100 px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">One free generation every month</p>
            <h1 className="mt-4 text-5xl font-extrabold leading-tight text-zinc-900">Build a full ATS-safe resume for the exact job.</h1>
            <p className="mt-5 text-xl leading-8 text-zinc-600">Sign in, paste your current resume and target JD, then edit and export a complete role-specific resume. Qalam improves relevance, keywords, proof, and clarity without inventing experience.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`${APP_URL}/login?callbackUrl=/career/resumes`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-7 font-bold text-white">Build my monthly free resume</Link>
              <Link href="/free-tools/ats-resume-checker" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 px-7 font-bold text-zinc-700">Check my resume first</Link>
            </div>
            <p className="mt-3 text-sm text-zinc-500">Free plan. No payment card required. One resume generation per calendar month.</p>
          </div>
          <div className="rounded-3xl bg-[#073f3b] p-8 text-white">
            <p className="text-sm font-bold text-gold">Included</p>
            <ul className="mt-5 list-disc space-y-4 pl-5 text-sm text-white/80">
              {included.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>
      <section className="bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-zinc-900">12 ATS-safe designs. No decorative parsing traps.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {RESUME_TEMPLATES.map((template) => (
              <article key={template.key} className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="h-2 w-12 rounded-full" style={{ backgroundColor: template.accent }} />
                <h3 className="mt-5 font-bold text-zinc-900">{template.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">{template.bestFor}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
