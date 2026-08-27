import Link from "next/link"
import { LINKEDIN_AUTHORITY_METHOD } from "@/lib/career-authority-product-content"
import { absoluteUrl } from "@/lib/seo"

export function AuthorityMethodologyPage() {
  const method = LINKEDIN_AUTHORITY_METHOD
  const url = absoluteUrl(method.path)
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: method.title,
        description: method.description,
        url,
        dateModified: method.updatedAt,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Qalam", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "LinkedIn Authority Score methodology", item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: method.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="bg-[#fafaf8] pb-24 pt-28 text-zinc-900">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <nav aria-label="Breadcrumb" className="mb-12 text-sm text-zinc-500">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href="/" className="hover:text-teal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-zinc-700">LinkedIn Authority Score methodology</li>
            </ol>
          </nav>

          <header className="grid gap-12 border-b border-zinc-300 pb-16 lg:grid-cols-[1.35fr_.65fr] lg:gap-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal">Transparent scoring</p>
              <h1 className="mt-5 max-w-[17ch] text-4xl font-extrabold leading-[1.04] tracking-[-0.045em] sm:text-6xl">{method.title}</h1>
              <p className="mt-7 max-w-[65ch] text-lg leading-8 text-zinc-600">{method.description}</p>
            </div>
            <aside className="self-end border-l-4 border-gold bg-gold-50 p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold-700">Current status</p>
              <p className="mt-2 text-xl font-bold">{method.status}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-700">No score is available yet. We are publishing the model early so its assumptions can be inspected before release.</p>
            </aside>
          </header>

          <section className="grid gap-8 border-b border-zinc-300 py-16 lg:grid-cols-[.55fr_1.45fr]">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">Direct answer</h2>
            <p className="max-w-[70ch] text-2xl font-semibold leading-10 tracking-[-0.025em]">{method.answer}</p>
          </section>

          <section aria-labelledby="dimensions" className="py-20">
            <div className="grid gap-5 lg:grid-cols-[.65fr_1.35fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold-700">Proposed model</p>
                <h2 id="dimensions" className="mt-4 text-3xl font-extrabold tracking-[-0.035em]">Five diagnostic dimensions</h2>
              </div>
              <p className="max-w-[60ch] leading-7 text-zinc-600">Final weights and thresholds will be published only after the scoring workflow has been calibrated and tested. These dimensions define what the score is intended to examine.</p>
            </div>
            <ol className="mt-12 divide-y divide-zinc-300 border-y border-zinc-300">
              {method.dimensions.map((dimension, index) => (
                <li key={dimension.name} className="grid gap-4 py-8 md:grid-cols-[4rem_.7fr_1fr]">
                  <span className="font-mono text-sm font-bold text-gold-700">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-xl font-bold">{dimension.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-600">{dimension.question}</p>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">Planned evidence</p>
                    <p className="mt-3 leading-7 text-zinc-700">{dimension.evidence}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="grid gap-16 border-y border-zinc-300 py-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.025em]">Scoring rules</h2>
              <ol className="mt-7 space-y-4">
                {method.rules.map((rule, index) => (
                  <li key={rule} className="grid grid-cols-[2rem_1fr] border-t border-zinc-200 pt-4 leading-7 text-zinc-700">
                    <span className="font-mono text-xs font-bold text-teal">{index + 1}</span>
                    {rule}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.025em]">Known limitations</h2>
              <ul className="mt-7 space-y-4">
                {method.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-4 border-t border-zinc-200 pt-4 leading-7 text-zinc-700">
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-sm border-2 border-gold" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="method-faq" className="grid gap-10 py-20 lg:grid-cols-[.5fr_1.5fr]">
            <div>
              <h2 id="method-faq" className="text-3xl font-extrabold tracking-[-0.035em]">Methodology questions</h2>
              <p className="mt-3 text-sm text-zinc-500">Version reviewed {method.updatedAt}</p>
            </div>
            <div className="divide-y divide-zinc-300">
              {method.faqs.map((faq) => (
                <details key={faq.question} className="py-5 first:pt-0">
                  <summary className="min-h-11 list-none pr-8 text-lg font-bold marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">{faq.question}</summary>
                  <p className="mt-3 max-w-[65ch] leading-7 text-zinc-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="grid gap-8 bg-teal px-6 py-12 text-white sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14">
            <div>
              <h2 className="text-2xl font-extrabold">See where the score will be used</h2>
              <p className="mt-3 max-w-[60ch] leading-7 text-white/75">The planned optimizer will turn each score dimension into source-labelled profile actions.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/linkedin-optimization" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gold px-6 py-3 text-sm font-bold text-white transition hover:bg-gold-600 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">LinkedIn optimization</Link>
              <Link href="/free-tools" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Current free tools</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
