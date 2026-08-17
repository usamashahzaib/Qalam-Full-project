import Link from "next/link"
import { APP_URL, buildBreadcrumbSchema, buildFaqSchema, buildPageMetadata, SITE_URL } from "@/lib/seo"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"

export const metadata = buildPageMetadata({
  title: "Free ATS Resume Builder | One Resume Every Month",
  description: "Create one ATS-safe, job-targeted resume free every month. Paste your resume and job description, edit every line, then export to PDF.",
  path: "/ats-resume-builder",
  tag: "ATS Resume Builder",
  keywords: ["free ATS resume builder", "ATS safe resume", "resume builder", "job targeted resume"],
})

const included = [
  "Exact job description targeting",
  "ATS, relevance, impact, clarity, and progression scoring",
  "Full editor and automatic version history",
  "PDF export",
  "12 professional templates",
  "Truth-preserving AI rules",
  "One full resume generation every month on Free",
]

const faqs = [
  {
    q: "Is the ATS Resume Builder free?",
    a: "Yes. After signing in, the Free plan includes one full resume generation per calendar month with editing and PDF export. Payment details are not required for that free generation.",
  },
  {
    q: "Does Qalam invent experience to match a job?",
    a: "No. Qalam is designed to preserve truth. It helps you select relevant evidence, clarify outcomes, and use language that better matches the role without adding unsupported claims.",
  },
  {
    q: "Should I check my resume before building a new version?",
    a: "Usually, yes. The free ATS Resume Checker gives you an evidence-based baseline so you can see which issues to fix before creating a role-specific version.",
  },
]

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Qalam ATS Resume Builder",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}/ats-resume-builder`,
      description: "Build an ATS-safe, job-targeted resume using a current resume and job description.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "One resume generation per calendar month on the Free plan after sign in." },
    },
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "ATS Resume Builder", path: "/ats-resume-builder" },
    ]),
    buildFaqSchema(faqs),
  ],
}

export default function AtsResumeBuilderPage() {
  return (
    <main className="bg-white pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
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
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">Methodology</p>
            <h2 className="mt-3 text-4xl font-bold text-zinc-900">Build for the role. Keep the evidence true.</h2>
            <ol className="mt-6 space-y-5 text-zinc-600">
              <li><strong className="text-zinc-900">1. Diagnose the starting point.</strong> Run the ATS Resume Checker to identify parsing, relevance, proof, and clarity gaps.</li>
              <li><strong className="text-zinc-900">2. Match the job language.</strong> Use the target job description to surface accurate skills, responsibilities, and outcomes already supported by your work.</li>
              <li><strong className="text-zinc-900">3. Edit before export.</strong> Keep the version you can defend in an interview, then export a clean PDF.</li>
            </ol>
            <Link href="/methodology/ats-resume-readiness" className="mt-7 inline-flex font-bold text-teal hover:underline">Read the ATS readiness methodology</Link>
          </div>
          <aside className="rounded-3xl bg-zinc-900 p-8 text-white">
            <p className="text-sm font-bold text-gold">Continue your workflow</p>
            <div className="mt-5 space-y-4 text-sm">
              <Link href="/free-tools/ats-resume-checker" className="block rounded-xl bg-white/10 p-4 hover:bg-white/15"><strong>Free ATS Resume Checker</strong><span className="mt-1 block text-white/70">Get your baseline before rebuilding.</span></Link>
              <Link href="/resume-keyword-match" className="block rounded-xl bg-white/10 p-4 hover:bg-white/15"><strong>Resume Keyword Match</strong><span className="mt-1 block text-white/70">Find accurate language to prioritize.</span></Link>
              <Link href="/career-visibility" className="block rounded-xl bg-white/10 p-4 hover:bg-white/15"><strong>Career Visibility OS</strong><span className="mt-1 block text-white/70">Align your resume and LinkedIn story.</span></Link>
              <Link href="/pricing" className="block rounded-xl bg-white/10 p-4 hover:bg-white/15"><strong>Compare plans</strong><span className="mt-1 block text-white/70">See generation limits and add-ons.</span></Link>
            </div>
          </aside>
        </div>
      </section>
      <section className="bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">Questions</p>
          <h2 className="mt-3 text-4xl font-bold text-zinc-900">ATS Resume Builder FAQs</h2>
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <article key={faq.q} className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h3 className="font-bold text-zinc-900">{faq.q}</h3>
                <p className="mt-2 leading-7 text-zinc-600">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
