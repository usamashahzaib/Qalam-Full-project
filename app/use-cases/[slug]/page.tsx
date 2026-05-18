import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FadeUp } from "@/components/FadeUp"
import { USE_CASE_PAGES } from "@/lib/site-content"
import { SITE_NAME, absoluteUrl, buildPageMetadata } from "@/lib/seo"

type Params = { slug: keyof typeof USE_CASE_PAGES }

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
  })
}

export default async function UseCaseDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const page = USE_CASE_PAGES[slug]
  if (!page) notFound()

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
      { "@type": "ListItem", position: 2, name: "Use Cases", item: absoluteUrl("/blog") },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="min-h-screen bg-zinc-50 pt-24">
        <section className="border-b border-zinc-100 bg-white px-6 py-20">
          <div className="mx-auto max-w-[900px]">
            <FadeUp>
              <span className="chip mb-5 inline-flex border-gold/40 bg-gold/5 text-gold">{page.eyebrow}</span>
              <h1 className="mb-5 text-5xl font-extrabold text-zinc-900 sm:text-6xl">{page.title}</h1>
              <p className="max-w-2xl text-xl leading-relaxed text-zinc-600">{page.summary}</p>
            </FadeUp>
          </div>
        </section>

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
                    <p className="text-sm font-bold text-zinc-900 group-hover:text-gold">{useCase.title}</p>
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
              Each use case connects back to the same product stack: drafting, voice memory, archive, scheduling, and review.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl bg-teal px-7 py-3.5 font-bold text-white transition-colors hover:bg-teal-600">
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
