import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FadeUp } from "@/components/FadeUp"
import { PRODUCT_PAGES } from "@/lib/site-content"
import { buildPageMetadata, SITE_URL } from "@/lib/seo"

type Params = { slug: keyof typeof PRODUCT_PAGES }

export function generateStaticParams() {
  return Object.keys(PRODUCT_PAGES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const page = PRODUCT_PAGES[slug]
  if (!page) return {}
  return buildPageMetadata({
    title: page.title,
    description: page.summary,
    path: `/product/${slug}`,
  })
}

export default async function ProductDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const page = PRODUCT_PAGES[slug]
  if (!page) notFound()

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.summary,
    publisher: { "@type": "Organization", name: "Qalam", url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/product/${slug}` },
  }

  const ALL_PRODUCTS = Object.entries(PRODUCT_PAGES).filter(([k]) => k !== slug)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <div className="pt-24 min-h-screen bg-zinc-50">
        <section className="border-b border-zinc-100 bg-white px-6 py-20">
          <div className="mx-auto max-w-[900px]">
            <FadeUp>
              <span className="chip mb-5 inline-flex border-teal/30 bg-teal-50 text-teal">{page.eyebrow}</span>
              <h1 className="mb-5 text-5xl font-extrabold text-zinc-900 sm:text-6xl">{page.title}</h1>
              <p className="max-w-2xl text-xl leading-relaxed text-zinc-600">{page.summary}</p>
            </FadeUp>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-[900px] gap-6 md:grid-cols-[1.4fr_.9fr]">
            <FadeUp>
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-zinc-900">Why this exists</h2>
                <p className="leading-relaxed text-zinc-600">{page.description}</p>
              </div>
            </FadeUp>
            <FadeUp delay={0.08}>
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                <h2 className="mb-4 text-2xl font-bold text-zinc-900">What it changes</h2>
                <ul className="space-y-3 text-sm text-zinc-600">
                  {page.bullets.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-gold" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          </div>
        </section>

        {ALL_PRODUCTS.length > 0 && (
          <section className="px-6 pb-12">
            <div className="mx-auto max-w-[900px]">
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-zinc-500">Also in Qalam</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ALL_PRODUCTS.map(([k, p]) => (
                  <Link
                    key={k}
                    href={`/product/${k}`}
                    className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-teal/40 hover:shadow"
                  >
                    <p className="text-sm font-bold text-zinc-900 group-hover:text-teal">{p.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{p.summary}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-[900px] rounded-3xl bg-teal p-10 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white">See it inside the full workflow</h2>
            <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-white/70">
              Product pages explain the system. The app and pricing pages show where the workflow fits inside the broader publishing stack.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl bg-gold px-7 py-3.5 font-bold text-white transition-colors hover:bg-gold-600">
                Compare Plans
              </Link>
              <Link href="/free-tools" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/10">
                Explore Free Tools
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
