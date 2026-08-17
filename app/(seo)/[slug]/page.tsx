import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FadeUp } from "@/components/FadeUp"
import { SEO_LANDING_PAGES } from "@/lib/seo-landing-pages"
import { absoluteUrl, buildBreadcrumbSchema, buildFaqSchema, buildPageMetadata, APP_URL } from "@/lib/seo"

type Params = { slug: keyof typeof SEO_LANDING_PAGES }

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(SEO_LANDING_PAGES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const page = SEO_LANDING_PAGES[slug]
  return page
    ? buildPageMetadata({
        title: page.title,
        description: page.description,
        path: `/${slug}`,
        tag: page.primaryKeyword,
        keywords: page.keywords,
      })
    : {}
}

export default async function SeoLandingPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const page = SEO_LANDING_PAGES[slug]
  if (!page) notFound()

  const url = absoluteUrl(`/${slug}`)
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Qalam", path: "/" },
    { name: page.title, path: `/${slug}` },
  ])
  const faqSchema = buildFaqSchema(page.faqs)
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    headline: page.h1,
    description: page.description,
    url,
    dateModified: page.updatedAt,
    inLanguage: "en",
    about: page.keywords.map((name) => ({ "@type": "Thing", name })),
    mainEntity: page.tool ? {
      "@type": "SoftwareApplication",
      name: page.tool.label,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl(page.tool.href),
      isAccessibleForFree: page.tool.href.startsWith("/free-tools/"),
    } : {
      "@type": "SoftwareApplication",
      name: "Qalam",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />

      <main className="min-h-screen bg-zinc-50 pt-24">
        <section className="border-b border-zinc-100 bg-white px-6 py-20">
          <div className="mx-auto max-w-[960px]">
            <FadeUp>
              <span className="chip mb-5 inline-flex border-teal/30 bg-teal-50 text-teal">{page.primaryKeyword}</span>
              <h1 className="mb-5 text-5xl font-extrabold leading-tight text-zinc-900 sm:text-6xl">{page.h1}</h1>
              <p className="max-w-3xl text-xl leading-relaxed text-zinc-600">{page.summary}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={page.tool?.href || `${APP_URL}/login`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-7 py-3.5 font-bold text-white transition-colors hover:bg-teal-600">
                  {page.tool?.label || "Start free"}
                </Link>
                <Link href={page.methodology?.href || "/career-visibility"} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 px-7 py-3.5 font-semibold text-zinc-700 transition-colors hover:border-teal/40 hover:bg-teal/5">
                  {page.methodology?.label || "Explore Career Visibility"}
                </Link>
              </div>
            </FadeUp>
          </div>
        </section>

        {page.tool ? (
          <section className="border-b border-teal/15 bg-teal-50/40 px-6 py-12">
            <div className="mx-auto grid max-w-[960px] gap-6 md:grid-cols-[1.35fr_.65fr] md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Working Qalam tool</p>
                <h2 className="mt-3 text-3xl font-bold text-zinc-900">{page.tool.label}</h2>
                <p className="mt-3 max-w-2xl leading-7 text-zinc-600">{page.tool.description}</p>
                <p className="mt-3 text-sm font-medium text-zinc-500">{page.tool.detail}</p>
              </div>
              <Link href={page.tool.href} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-6 font-bold text-white transition-colors hover:bg-teal-600">
                Open the tool
              </Link>
            </div>
          </section>
        ) : null}

        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-[960px] gap-6 md:grid-cols-[1.4fr_.8fr]">
            <div className="space-y-6">
              {page.sections.map((section, i) => (
                <FadeUp key={section.heading} delay={i * 0.06}>
                  <article className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
                    <h2 className="mb-3 text-2xl font-bold text-zinc-900">{section.heading}</h2>
                    <p className="leading-relaxed text-zinc-600">{section.body}</p>
                  </article>
                </FadeUp>
              ))}
              {page.example ? (
                <FadeUp delay={page.sections.length * 0.06}>
                  <article className="rounded-2xl border border-gold/25 bg-gold-50/45 p-7">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Example</p>
                    <h2 className="mt-3 text-2xl font-bold text-zinc-900">{page.example.heading}</h2>
                    <p className="mt-3 leading-relaxed text-zinc-700">{page.example.body}</p>
                  </article>
                </FadeUp>
              ) : null}
            </div>

            <aside className="space-y-6">
              <FadeUp delay={0.08}>
                <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
                  <h2 className="mb-3 text-lg font-bold text-zinc-900">Search intent</h2>
                  <p className="text-sm leading-relaxed text-zinc-600">{page.intent}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {page.keywords.slice(0, 6).map((keyword) => (
                      <span key={keyword} className="rounded-full border border-teal/20 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </FadeUp>

              <FadeUp delay={0.14}>
                <div className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-zinc-900">Related pages</h2>
                  <div className="grid gap-3">
                    {page.related.map((item) => (
                      <Link key={item.href} href={item.href} className="rounded-xl border border-zinc-100 px-4 py-3 text-sm font-semibold text-teal transition-colors hover:border-teal/30 hover:bg-teal/5">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </FadeUp>
            </aside>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto max-w-[960px] rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold text-zinc-900">Frequently asked questions</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {page.faqs.map((faq) => (
                <div key={faq.q}>
                  <h3 className="font-semibold text-zinc-900">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
