import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FadeUp } from "@/components/FadeUp"
import { QalamEvidenceField } from "@/components/ui/QalamEvidenceField"
import { INDUSTRIES } from "@/lib/marketing-discovery"
import { USE_CASE_PAGES } from "@/lib/site-content"
import { SITE_NAME, absoluteUrl, buildPageMetadata } from "@/lib/seo"

type Params = { slug: keyof typeof USE_CASE_PAGES }

const USE_CASE_KEYWORDS: Record<keyof typeof USE_CASE_PAGES, string[]> = {
  "job-seekers": ["career visibility for job seekers", "ATS resume help", "LinkedIn profile for job search", "job application system"],
  recruiters: ["resume review for recruiters", "recruiter LinkedIn content", "talent acquisition content", "candidate resume review"],
  "career-coaches": ["career coaching software", "ATS resume coaching tool", "LinkedIn coaching platform", "career coach client workflow"],
  universities: ["career services software", "student ATS resume checker", "university employability platform", "student LinkedIn optimization"],
  founders: ["LinkedIn AI writer for founders", "founder LinkedIn content", "founder thought leadership", "AI writer for founders"],
  "marketing-teams": ["AI writer for marketing teams", "LinkedIn content workflow", "brand voice AI", "marketing content system"],
  "hr-leaders": ["LinkedIn content for HR leaders", "employer brand LinkedIn", "HR thought leadership", "AI writer for HR"],
  consultants: ["LinkedIn content for consultants", "consultant thought leadership", "AI writer for consultants", "consulting LinkedIn posts"],
  agencies: ["AI LinkedIn writer for agencies", "LinkedIn ghostwriting agency tool", "agency content workflow", "client LinkedIn approvals"],
}

export function generateStaticParams() {
  return Object.keys(USE_CASE_PAGES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const page = USE_CASE_PAGES[slug]
  if (!page) return {}
  return buildPageMetadata({
    title: page.title,
    description: page.summary,
    path: `/use-cases/${slug}`,
    keywords: USE_CASE_KEYWORDS[slug],
  })
}

export default async function UseCaseDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const page = USE_CASE_PAGES[slug]
  if (!page) notFound()
  const industry = INDUSTRIES.find((item) => item.slug === slug)

  const pageUrl = absoluteUrl(`/use-cases/${slug}`)
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.summary,
    url: pageUrl,
    audience: { "@type": "Audience", audienceType: page.audience },
    about: {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
    },
    dateModified: page.updatedAt,
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Qalam", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Industries", item: absoluteUrl("/industries") },
      { "@type": "ListItem", position: 3, name: page.title, item: pageUrl },
    ],
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  }

  const otherCases = Object.entries(USE_CASE_PAGES).filter(([key]) => key !== slug)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <div className="min-h-screen bg-zinc-50 pt-24">
        <section className="relative overflow-hidden border-b border-zinc-100 px-6 py-20">
          <QalamEvidenceField variant="quiet" />
          <div className="relative z-10 mx-auto max-w-[900px]">
            <FadeUp>
              <span className="chip mb-5 inline-flex border-gold/40 bg-gold/5 text-gold-700">{page.eyebrow}</span>
              <h1 className="mb-5 text-5xl font-extrabold text-zinc-900 sm:text-6xl">{page.title}</h1>
              <p className="max-w-2xl text-xl leading-relaxed text-zinc-600">{page.summary}</p>
            </FadeUp>
          </div>
        </section>

        {industry && (
          <section className="px-6 pb-16">
            <div className="mx-auto max-w-[900px] overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 text-white shadow-sm">
              <div className="grid gap-8 p-8 md:grid-cols-[0.9fr_1.1fr] md:p-10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">From problem to proof</p>
                  <h2 className="mt-3 text-3xl font-bold">A connected Qalam workflow</h2>
                  <p className="mt-4 text-sm leading-7 text-white/65">{industry.problem}</p>
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/60">Target outcome</p>
                    <p className="mt-2 text-sm leading-6 text-white/85">{industry.outcome}</p>
                  </div>
                </div>
                <ol className="space-y-3">
                  {industry.workflows.map((workflow, index) => (
                    <li key={workflow} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-extrabold">{String(index + 1).padStart(2, "0")}</span>
                      <span className="text-sm font-semibold text-white/85">{workflow}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        )}

        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-[900px] gap-6 md:grid-cols-[1.4fr_.9fr]">
            <FadeUp>
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-zinc-900">Operational fit</h2>
                <p className="leading-relaxed text-zinc-600">{page.description}</p>
              </div>
            </FadeUp>
            <FadeUp delay={0.08}>
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-zinc-900">Why it matters</h2>
                <ul className="space-y-3 text-sm text-zinc-600">
                  {page.bullets.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-teal" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          </div>
        </section>

        <section className="px-6 pb-12">
          <div className="mx-auto max-w-[900px] rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold text-zinc-900">Frequently asked questions</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {page.faqs.map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-lg font-semibold text-zinc-900">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {otherCases.length > 0 && (
          <section className="px-6 pb-12">
            <div className="mx-auto max-w-[900px]">
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-zinc-500">Other use cases</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {otherCases.map(([key, useCase]) => (
                  <Link
                    key={key}
                    href={`/use-cases/${key}`}
                    className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-gold/40 hover:shadow"
                  >
                    <p className="text-sm font-bold text-zinc-900 group-hover:text-gold-700">{useCase.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{useCase.summary}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-[900px] rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-zinc-200">
            <h2 className="mb-3 text-3xl font-bold text-zinc-900">Need the matching workflow?</h2>
            <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-zinc-600">
              Explore the complete capability map, then choose the self-serve plan or contact Qalam for an organization-specific workflow.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/features" className="inline-flex items-center justify-center rounded-xl bg-teal px-7 py-3.5 font-bold text-white transition-colors hover:bg-teal-600">
                Explore Features
              </Link>
              <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-7 py-3.5 font-semibold text-zinc-700 transition-colors hover:border-teal/40 hover:bg-teal/5">
                View Pricing
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-7 py-3.5 font-semibold text-zinc-700 transition-colors hover:border-teal/40 hover:bg-teal/5">
                Contact Qalam
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
