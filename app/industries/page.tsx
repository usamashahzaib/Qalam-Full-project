import type { Metadata } from "next"
import Link from "next/link"
import { INDUSTRIES, DISCOVERY_UPDATED_AT } from "@/lib/marketing-discovery"
import { SITE_NAME, absoluteUrl, buildBreadcrumbSchema, buildFaqSchema, buildPageMetadata } from "@/lib/seo"

const title = "Industries and Professionals Qalam Helps"
const description = "See how Qalam supports job seekers, recruiters, career coaches, universities, founders, consultants, and agencies with connected career workflows."

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/industries",
  keywords: [
    "career tools for job seekers",
    "ATS resume platform for career coaches",
    "career readiness platform for universities",
    "LinkedIn content tool for recruiters",
    "career visibility software",
  ],
})

const faqs = [
  {
    q: "Is Qalam only for job seekers?",
    a: "No. Job seekers use the ATS and career workflows, while recruiters, coaches, universities, founders, consultants, agencies, and marketing teams use the parts relevant to their work.",
  },
  {
    q: "Can an organization use Qalam with learners or clients?",
    a: "Qalam includes cohort and workspace concepts for structured delivery. Organizations should contact Qalam for the current availability and implementation scope before promising access to learners or clients.",
  },
  {
    q: "Does every industry receive the same workflow?",
    a: "No. The source of truth is shared, but the decision lens changes. A job seeker needs ATS and recruiter readiness, while a founder or consultant needs professional positioning, voice, content, and authority continuity.",
  },
]

const pageSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: title,
  description,
  url: absoluteUrl("/industries"),
  dateModified: DISCOVERY_UPDATED_AT,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: INDUSTRIES.map((industry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/use-cases/${industry.slug}`),
      name: industry.name,
      description: industry.qalamFit,
    })),
  },
  about: { "@type": "SoftwareApplication", name: SITE_NAME, applicationCategory: "BusinessApplication" },
}

export default function IndustriesPage() {
  return (
    <main className="overflow-x-clip bg-[#fafaf8] pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbSchema([{ name: "Qalam", path: "/" }, { name: "Industries", path: "/industries" }])).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqSchema(faqs)).replace(/</g, "\\u003c") }} />

      <section className="border-b border-zinc-200 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Built around the decision being made</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <h1 className="text-4xl font-extrabold leading-none tracking-tight text-zinc-900 sm:text-6xl">Different careers need different proof. Qalam keeps the evidence connected.</h1>
            <p className="max-w-[60ch] border-l-2 border-teal pl-5 text-base leading-8 text-zinc-600 sm:pl-7">Choose your context to see the exact problem, outcome, and workflows Qalam supports. No generic promise that one feature solves every audience.</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-[1200px] divide-y divide-zinc-200 border-y border-zinc-200">
          {INDUSTRIES.map((industry, index) => (
            <article key={industry.slug} className="group grid gap-5 py-8 md:grid-cols-[3rem_0.72fr_1.28fr_auto] md:items-start md:gap-8">
              <span className="text-xs font-bold text-gold-700">{String(index + 1).padStart(2, "0")}</span>
              <div><h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 group-hover:text-teal">{industry.name}</h2><p className="mt-2 text-xs leading-5 text-zinc-500">{industry.audience}</p></div>
              <div><p className="text-sm font-bold text-zinc-800">{industry.outcome}</p><p className="mt-3 text-sm leading-7 text-zinc-600">{industry.qalamFit}</p><div className="mt-4 flex flex-wrap gap-2">{industry.workflows.map((workflow) => <span key={workflow} className="rounded-full border border-zinc-200 bg-white px-3 py-1 t-eyebrow text-zinc-600">{workflow}</span>)}</div></div>
              <Link href={`/use-cases/${industry.slug}`} className="press inline-flex min-h-11 w-fit items-center rounded-xl border border-teal/20 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal hover:bg-teal hover:text-white">View workflow</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Shared foundation</p><h2 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900">One professional truth, adapted to the audience.</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Individuals", "Own your evidence, resume versions, target roles, profile position, applications, and content."],
              ["Teams", "Keep voice, professional context, drafts, reviews, and publishing decisions consistent."],
              ["Service providers", "Separate client facts and outputs so delivery remains traceable and distinct."],
              ["Learning organizations", "Help learners translate training and projects into employer-readable proof."],
            ].map(([label, copy]) => <div key={label} className="border-t-2 border-teal bg-zinc-50 p-5"><h3 className="font-bold text-zinc-900">{label}</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{copy}</p></div>)}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[900px]">
          <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900">Industry questions</h2>
          <div className="mt-7 divide-y divide-zinc-200 border-y border-zinc-200">{faqs.map((faq) => <article key={faq.q} className="py-6"><h3 className="font-bold text-zinc-900">{faq.q}</h3><p className="mt-2 text-sm leading-7 text-zinc-600">{faq.a}</p></article>)}</div>
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#073f3b] p-7 text-white sm:flex-row sm:items-center"><div><h2 className="text-2xl font-extrabold">Need an organization-specific workflow?</h2><p className="mt-2 text-sm text-white/65">Tell Qalam who the users are, what outcome matters, and how delivery works today.</p></div><Link href="/contact" className="press shrink-0 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-teal-900">Discuss the workflow</Link></div>
        </div>
      </section>
    </main>
  )
}
