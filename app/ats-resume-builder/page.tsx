import type { Metadata } from "next"
import Link from "next/link"
import { APP_URL, SITE_URL } from "@/lib/seo"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"

export const metadata: Metadata = {
  title: "Free ATS Resume Builder for Pakistan | 12 Templates",
  description: "Create one free ATS resume, target it to an exact job description, edit every line, and export to PDF. Built for Pakistani professionals.",
  alternates: { canonical: `${SITE_URL}/ats-resume-builder` },
}

export default function AtsResumeBuilderPage() {
  return <main className="bg-white pt-24"><section className="border-b border-zinc-100 px-6 py-24"><div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">ATS Resume Studio</p><h1 className="mt-4 text-5xl font-extrabold leading-tight text-zinc-900">One free resume. Built for the exact job.</h1><p className="mt-5 text-xl leading-8 text-zinc-600">Paste your current resume and target JD. Qalam improves relevance, ATS keywords, impact, and career progression without inventing experience.</p><Link href={`${APP_URL}/login?callbackUrl=/career/resumes`} className="mt-8 inline-flex rounded-xl bg-teal px-7 py-4 font-bold text-white">Build your free resume</Link></div><div className="rounded-3xl bg-[#073f3b] p-8 text-white"><p className="text-sm font-bold text-gold">Included</p><ul className="mt-5 space-y-4 text-sm text-white/80"><li>✓ Exact job description targeting</li><li>✓ ATS, relevance, impact, clarity, and progression scoring</li><li>✓ Full editor and automatic version history</li><li>✓ PDF export</li><li>✓ 12 professional templates</li><li>✓ Truth-preserving AI rules</li></ul></div></div></section><section className="bg-zinc-50 px-6 py-20"><div className="mx-auto max-w-6xl"><h2 className="text-4xl font-bold text-zinc-900">12 ATS-safe designs. No decorative parsing traps.</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{RESUME_TEMPLATES.map((template) => <article key={template.key} className="rounded-2xl border border-zinc-200 bg-white p-5"><div className="h-2 w-12 rounded-full" style={{ backgroundColor: template.accent }} /><h3 className="mt-5 font-bold text-zinc-900">{template.name}</h3><p className="mt-1 text-sm text-zinc-500">{template.bestFor}</p></article>)}</div></div></section></main>
}
