import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FadeUp } from "@/components/FadeUp"
import { USE_CASE_PAGES } from "@/lib/site-content"
import { buildPageMetadata, SITE_URL } from "@/lib/seo"

type Params = { slug: keyof typeof USE_CASE_PAGES }

export function generateStaticParams() {
  return Object.keys(USE_CASE_PAGES).map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const page = USE_CASE_PAGES[params.slug]
  if (!page) return {}
  return buildPageMetadata({
    title: page.title,
    description: page.summary,
    path: `/use-cases/${params.slug}`,
  })
}

export default function UseCaseDetailPage({ params }: { params: Params }) {
  const page = USE_CASE_PAGES[params.slug]
  if (!page) notFound()

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.summary,
    publisher: { "@type": "Organization", name: "Qalam", url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/use-cases/${params.slug}` },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
    <div className="pt-24 min-h-screen bg-zinc-50">
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
