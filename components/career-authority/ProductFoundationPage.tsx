import Link from "next/link"
import type { ProductFoundationPage as ProductFoundationPageContent } from "@/lib/career-authority-product-content"
import { SITE_NAME, absoluteUrl } from "@/lib/seo"

function StructuredData({ page }: { page: ProductFoundationPageContent }) {
  const url = absoluteUrl(page.path)
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: page.title,
        description: page.summary,
        url,
        dateModified: page.updatedAt,
        about: { "@type": "SoftwareApplication", name: SITE_NAME },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Qalam", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: page.title, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
}

export function ProductFoundationPage({ page }: { page: ProductFoundationPageContent }) {
  return (
    <>
      <StructuredData page={page} />
      <div className="bg-[#fafaf8] pb-24 pt-28 text-zinc-900">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <nav aria-label="Breadcrumb" className="mb-12 text-sm text-zinc-500">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href="/" className="rounded-sm hover:text-teal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-zinc-700">{page.title}</li>
            </ol>
          </nav>

          <header className="grid gap-10 border-b border-zinc-300 pb-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,.65fr)] lg:gap-20">
            <div>
              <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-teal">{page.eyebrow}</p>
              <h1 className="max-w-[18ch] text-4xl font-extrabold leading-[1.04] tracking-[-0.045em] text-zinc-950 sm:text-6xl">
                {page.title}
              </h1>
              <p className="mt-7 max-w-[65ch] text-lg leading-8 text-zinc-600 sm:text-xl">{page.summary}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={page.primaryCta.href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-600 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">
                  {page.primaryCta.label}
                </Link>
                <Link href={page.secondaryCta.href} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-bold text-zinc-800 transition hover:border-teal/40 hover:text-teal active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">
                  {page.secondaryCta.label}
                </Link>
              </div>
            </div>
            <aside aria-label="Release status" className="self-end border-l-4 border-gold bg-gold-50 p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold-700">Release status</p>
              <p className="mt-2 text-xl font-bold text-zinc-950">{page.status}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-700">{page.statusDetail}</p>
            </aside>
          </header>

          <section aria-labelledby="direct-answer" className="grid gap-8 border-b border-zinc-300 py-16 lg:grid-cols-[.55fr_1.45fr]">
            <h2 id="direct-answer" className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">Direct answer</h2>
            <p className="max-w-[70ch] text-2xl font-semibold leading-10 tracking-[-0.025em] text-zinc-900">{page.answer}</p>
          </section>

          <section aria-labelledby="problem" className="grid gap-10 py-20 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold-700">Why this exists</p>
              <h2 id="problem" className="mt-4 max-w-[18ch] text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">{page.problemTitle}</h2>
            </div>
            <p className="max-w-[65ch] text-lg leading-8 text-zinc-600">{page.problem}</p>
          </section>

          <section aria-labelledby="workflow" className="border-y border-zinc-300 py-16">
            <div className="mb-12 grid gap-4 md:grid-cols-[1fr_1fr]">
              <h2 id="workflow" className="text-3xl font-extrabold tracking-[-0.035em]">The planned workflow</h2>
              <p className="max-w-[55ch] leading-7 text-zinc-600">A diagnosis should show its work before it recommends a rewrite. These are the release stages Qalam is designing.</p>
            </div>
            <ol className="divide-y divide-zinc-300">
              {page.stages.map((stage) => (
                <li key={stage.number} className="grid gap-4 py-8 first:pt-0 last:pb-0 md:grid-cols-[5rem_.7fr_1fr] md:items-start">
                  <span className="font-mono text-sm font-bold text-gold-700">{stage.number}</span>
                  <h3 className="text-xl font-bold text-zinc-950">{stage.title}</h3>
                  <p className="max-w-[58ch] leading-7 text-zinc-600">{stage.description}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="grid gap-12 py-20 lg:grid-cols-2 lg:gap-24">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.025em]">{page.includedTitle}</h2>
              <ul className="mt-7 space-y-4">
                {page.included.map((item) => (
                  <li key={item} className="flex gap-4 border-t border-zinc-200 pt-4 leading-7 text-zinc-700">
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.025em]">{page.notIncludedTitle}</h2>
              <ul className="mt-7 space-y-4">
                {page.notIncluded.map((item) => (
                  <li key={item} className="flex gap-4 border-t border-zinc-200 pt-4 leading-7 text-zinc-700">
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-sm border-2 border-gold" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="evidence" className="grid gap-8 bg-teal px-6 py-12 text-white sm:px-10 lg:grid-cols-[.65fr_1.35fr] lg:px-14">
            <h2 id="evidence" className="text-2xl font-extrabold tracking-[-0.025em]">{page.evidenceTitle}</h2>
            <p className="max-w-[65ch] text-lg leading-8 text-white/80">{page.evidence}</p>
          </section>

          <section aria-labelledby="related" className="py-20">
            <h2 id="related" className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">Continue the workflow</h2>
            <div className="mt-8 divide-y divide-zinc-300 border-y border-zinc-300">
              {page.related.map((item) => (
                <Link key={item.href} href={item.href} className="group grid gap-2 py-6 transition hover:bg-white sm:grid-cols-[.65fr_1fr] sm:px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
                  <span className="font-bold text-zinc-950 group-hover:text-teal">{item.label}</span>
                  <span className="text-sm leading-6 text-zinc-600">{item.description}</span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="faq" className="grid gap-10 border-t border-zinc-300 pt-16 lg:grid-cols-[.5fr_1.5fr]">
            <div>
              <h2 id="faq" className="text-3xl font-extrabold tracking-[-0.035em]">Questions before release</h2>
              <p className="mt-3 text-sm text-zinc-500">Last reviewed {page.updatedAt}</p>
            </div>
            <div className="divide-y divide-zinc-300">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="group py-5 first:pt-0">
                  <summary className="min-h-11 list-none pr-8 text-lg font-bold text-zinc-950 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">
                    {faq.question}
                  </summary>
                  <p className="mt-3 max-w-[65ch] leading-7 text-zinc-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
