import type { Metadata } from "next"
import Link from "next/link"
import { ATS_DIRECT_ANSWER, ATS_FACTORS, ATS_FAQS, ATS_METHODOLOGY_UPDATED, ATS_METHODOLOGY_VERSION } from "@/lib/ats-methodology"
import { buildBreadcrumbSchema, buildFaqSchema, buildOgImageUrl, SITE_URL } from "@/lib/seo"

const title = "Qalam ATS Resume Readiness Methodology"
const description = "The evidence-first eight-factor framework behind Qalam's ATS Resume Checker, including scoring weights, recruiter logic, truth rules, and limitations."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/methodology/ats-resume-readiness` },
  keywords: ["ATS scoring methodology", "resume readiness score", "ATS resume factors", "recruiter resume screening", "evidence-first resume"],
  openGraph: { title, description, url: `${SITE_URL}/methodology/ats-resume-readiness`, type: "article", images: [buildOgImageUrl(title, description, "Methodology")] },
  twitter: { card: "summary_large_image", title, description, images: [buildOgImageUrl(title, description, "Methodology")] },
}

const methodologySchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      "@id": `${SITE_URL}/methodology/ats-resume-readiness#methodology`,
      headline: title,
      description,
      datePublished: ATS_METHODOLOGY_UPDATED,
      dateModified: ATS_METHODOLOGY_UPDATED,
      version: ATS_METHODOLOGY_VERSION,
      author: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      mainEntityOfPage: `${SITE_URL}/methodology/ats-resume-readiness`,
      about: ATS_FACTORS.map((factor) => ({ "@type": "DefinedTerm", name: factor.name, description: factor.definition })),
    },
    buildBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Methodology", path: "/methodology/ats-resume-readiness" },
      { name: "ATS Resume Readiness", path: "/methodology/ats-resume-readiness" },
    ]),
    buildFaqSchema(ATS_FAQS.map((faq) => ({ q: faq.q, a: faq.a }))),
  ],
}

export default function AtsResumeReadinessMethodologyPage() {
  return (
    <main className="bg-zinc-50 pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(methodologySchema).replace(/</g, "\\u003c") }} />
      <article>
        <header className="border-b border-zinc-200 bg-[#f8f7f3] px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">Public methodology. Version {ATS_METHODOLOGY_VERSION}</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl">The evidence-first standard behind Qalam ATS scores.</h1>
            <p className="mt-6 max-w-3xl text-xl leading-8 text-zinc-600">{ATS_DIRECT_ANSWER}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/free-tools/ats-resume-checker" className="inline-flex min-h-12 items-center rounded-xl bg-teal px-6 font-bold text-white">Check a resume free</Link>
              <span className="inline-flex min-h-12 items-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-600">Updated {ATS_METHODOLOGY_UPDATED}</span>
            </div>
          </div>
        </header>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-zinc-900">Eight weighted decision factors</h2>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-600">The overall score is a weighted diagnostic. Low evidence cannot be hidden by keyword density or decorative formatting.</p>
            <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {ATS_FACTORS.map((factor, index) => (
                <section key={factor.name} className="grid gap-3 border-b border-zinc-100 p-5 last:border-0 sm:grid-cols-[48px_180px_1fr] sm:items-start">
                  <span className="font-bold text-teal">{String(index + 1).padStart(2, "0")}</span>
                  <div><h3 className="font-bold text-zinc-900">{factor.name}</h3><p className="mt-1 text-xs font-bold text-gold-700">{factor.weight}% weight</p></div>
                  <p className="text-sm leading-6 text-zinc-600">{factor.definition}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white px-6 py-16">
          <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
            <div><h2 className="text-2xl font-bold text-zinc-900">Truth rules</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-700"><li>Candidate facts stay separate from AI wording.</li><li>Unsupported keywords are labelled, not inserted.</li><li>Protected characteristics are excluded from evaluation.</li><li>Gaps are not penalized without supplied context.</li><li>Every rewrite must remain traceable to resume evidence.</li></ul></div>
            <div><h2 className="text-2xl font-bold text-zinc-900">Known limits</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-zinc-700"><li>Employer ATS configurations are private and differ.</li><li>Knockout questions may sit outside the resume.</li><li>A high score cannot guarantee an interview.</li><li>Role alignment is provisional without a job description.</li><li>Human hiring judgment remains contextual.</li></ul></div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-zinc-900">Frequently asked questions</h2>
            <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">{ATS_FAQS.map((faq) => <details key={faq.q} className="group py-5"><summary className="cursor-pointer list-none font-bold text-zinc-900">{faq.q}</summary><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">{faq.a}</p></details>)}</div>
          </div>
        </section>
      </article>
    </main>
  )
}
