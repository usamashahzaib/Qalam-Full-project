import Link from "next/link"
import { absoluteUrl } from "@/lib/seo"

export type CareerAnswerPageData = {
  path: string
  eyebrow: string
  title: string
  summary: string
  directAnswer: string
  status: string
  statusDetail: string
  problemTitle: string
  problem: string
  steps: { number: string; title: string; body: string }[]
  includes: string[]
  limits: string[]
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
  faqs: { question: string; answer: string }[]
}

const jsonLd = (page: CareerAnswerPageData) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: page.title,
      description: page.summary,
      url: absoluteUrl(page.path),
      about: { "@type": "SoftwareApplication", name: "Qalam" },
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
})

export function CareerAnswerPage({ page }: { page: CareerAnswerPageData }) {
  return (
    <main className="bg-[#fafaf8] pb-24 pt-28 text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page)).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <nav aria-label="Breadcrumb" className="mb-12 text-sm text-zinc-500">
          <Link href="/" className="hover:text-teal">Home</Link>
          <span aria-hidden="true" className="px-2">/</span>
          <span aria-current="page">{page.title}</span>
        </nav>

        <header className="grid gap-12 border-b border-zinc-300 pb-16 lg:grid-cols-[1.45fr_.55fr] lg:gap-20">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-teal">{page.eyebrow}</p>
            <h1 className="mt-5 max-w-[18ch] text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-6xl">{page.title}</h1>
            <p className="mt-7 max-w-[64ch] text-lg leading-8 text-zinc-600 sm:text-xl">{page.summary}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={page.primaryCta.href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal px-6 py-3 text-sm font-bold text-white hover:bg-teal-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">
                {page.primaryCta.label}
              </Link>
              <Link href={page.secondaryCta.href} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-bold text-zinc-800 hover:border-teal/40 hover:text-teal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">
                {page.secondaryCta.label}
              </Link>
            </div>
          </div>
          <aside aria-label="Product status" className="self-end border-l-4 border-gold bg-gold-50 p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold-700">Product status</p>
            <p className="mt-2 text-xl font-bold">{page.status}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-700">{page.statusDetail}</p>
          </aside>
        </header>

        <section className="grid gap-8 border-b border-zinc-300 py-16 lg:grid-cols-[.5fr_1.5fr]">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-500">Direct answer</h2>
          <p className="max-w-[70ch] text-2xl font-semibold leading-10 tracking-[-0.02em]">{page.directAnswer}</p>
        </section>

        <section className="grid gap-10 py-20 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
          <h2 className="max-w-[18ch] text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{page.problemTitle}</h2>
          <p className="max-w-[65ch] text-lg leading-8 text-zinc-600">{page.problem}</p>
        </section>

        <section className="border-y border-zinc-300 py-16">
          <h2 className="mb-10 text-3xl font-extrabold tracking-[-0.03em]">How the workflow works</h2>
          <ol className="divide-y divide-zinc-300">
            {page.steps.map((step) => (
              <li key={step.number} className="grid gap-4 py-8 first:pt-0 last:pb-0 md:grid-cols-[5rem_.7fr_1fr]">
                <span className="font-mono text-sm font-bold text-gold-700">{step.number}</span>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="max-w-[58ch] leading-7 text-zinc-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-12 py-20 lg:grid-cols-2 lg:gap-24">
          <div>
            <h2 className="text-2xl font-extrabold">What Qalam checks</h2>
            <ul className="mt-7 space-y-4">
              {page.includes.map((item) => <li key={item} className="border-t border-zinc-200 pt-4 leading-7 text-zinc-700">{item}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">What Qalam does not claim</h2>
            <ul className="mt-7 space-y-4">
              {page.limits.map((item) => <li key={item} className="border-t border-zinc-200 pt-4 leading-7 text-zinc-700">{item}</li>)}
            </ul>
          </div>
        </section>

        <section className="grid gap-10 border-t border-zinc-300 pt-16 lg:grid-cols-[.5fr_1.5fr]">
          <h2 className="text-3xl font-extrabold">Questions</h2>
          <div className="divide-y divide-zinc-300">
            {page.faqs.map((faq) => (
              <details key={faq.question} className="py-5 first:pt-0">
                <summary className="min-h-11 cursor-pointer text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">{faq.question}</summary>
                <p className="mt-3 max-w-[65ch] leading-7 text-zinc-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
