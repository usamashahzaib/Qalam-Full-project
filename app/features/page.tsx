import type { Metadata } from "next"
import Link from "next/link"
import { CapabilityShowcase } from "@/components/marketing/CapabilityShowcase"
import { CAPABILITIES, DISCOVERY_UPDATED_AT } from "@/lib/marketing-discovery"
import { APP_URL, SITE_NAME, absoluteUrl, buildBreadcrumbSchema, buildFaqSchema, buildPageMetadata } from "@/lib/seo"

const title = "Career Visibility OS Features and Product Views"
const description = "See how Qalam checks ATS resumes, builds targeted resumes, matches job descriptions, improves LinkedIn profiles, and connects career evidence."

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/features",
  keywords: [
    "Career Visibility OS features",
    "ATS resume checker features",
    "ATS resume builder",
    "LinkedIn profile optimization",
    "AI LinkedIn writer",
    "job description match",
  ],
})

const faqs = [
  {
    q: "Can I see what Qalam does before creating an account?",
    a: "Yes. This page shows representative product views and explains each major workflow. The public ATS Resume Checker can also be used without an account.",
  },
  {
    q: "Does Qalam invent resume achievements or career facts?",
    a: "No. Qalam separates supplied evidence from AI wording and must not invent employers, dates, qualifications, skills, achievements, or metrics.",
  },
  {
    q: "Are Qalam scores official LinkedIn or employer ATS scores?",
    a: "No. They are independent Qalam diagnostics based on published methodologies and the information supplied by the user.",
  },
  {
    q: "Which Qalam features are free?",
    a: "The public ATS Resume Checker is free without sign-in. A free account includes monthly content capacity and one ATS-safe resume generation each month. Current limits are shown on the pricing page and inside the app.",
  },
]

const pageSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: title,
  description,
  url: absoluteUrl("/features"),
  dateModified: DISCOVERY_UPDATED_AT,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: CAPABILITIES.map((capability, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(capability.href),
      name: capability.label,
      description: capability.description,
    })),
  },
  about: { "@type": "SoftwareApplication", name: SITE_NAME, applicationCategory: "BusinessApplication" },
}

export default function FeaturesPage() {
  return (
    <main className="overflow-x-clip bg-[#fafaf8] pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbSchema([{ name: "Qalam", path: "/" }, { name: "Features", path: "/features" }])).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqSchema(faqs)).replace(/</g, "\\u003c") }} />

      <section className="border-b border-zinc-200 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Inside Qalam</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-none tracking-tight text-zinc-900 sm:text-6xl">See the complete career visibility system before you sign in.</h1>
          </div>
          <div className="border-l-2 border-gold pl-5 sm:pl-7">
            <p className="max-w-[62ch] text-base leading-8 text-zinc-600 sm:text-lg">Qalam connects resume readiness, job fit, LinkedIn positioning, professional content, and career evidence. These product views explain what each workflow evaluates, produces, and keeps connected.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/free-tools/ats-resume-checker" className="press rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white">Check a resume free</Link>
              <Link href="/industries" className="press rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700">See who Qalam helps</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-0 py-16 sm:py-24">
        <CapabilityShowcase headingLevel={2} />
      </section>

      <section className="border-y border-zinc-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">One evidence chain</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-zinc-900">The output changes. The truth does not.</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600">Your target role and verified evidence stay attached as Qalam adapts the format for an ATS, recruiter, LinkedIn search, professional audience, or interview.</p>
            </div>
            <ol className="divide-y divide-zinc-200 border-y border-zinc-200">
              {[
                ["01", "Capture evidence", "Roles, projects, skills, qualifications, achievements, and goals remain traceable to what you supplied."],
                ["02", "Evaluate the target", "Qalam applies the relevant ATS, recruiter, LinkedIn, or content decision lens."],
                ["03", "Generate the right format", "Create a resume, profile recommendation, post, cover letter, or interview framework without changing the underlying facts."],
                ["04", "Keep the outcome connected", "Versions, applications, revisions, approvals, and later results stay in one career workspace."],
              ].map(([number, step, copy]) => (
                <li key={number} className="grid gap-3 py-5 sm:grid-cols-[3rem_11rem_1fr] sm:items-start">
                  <span className="text-xs font-bold text-gold">{number}</span>
                  <h3 className="font-bold text-zinc-900">{step}</h3>
                  <p className="text-sm leading-6 text-zinc-600">{copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[900px]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Questions</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900">What the product does and does not claim</h2>
          <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
            {faqs.map((faq) => <article key={faq.q} className="py-6"><h3 className="font-bold text-zinc-900">{faq.q}</h3><p className="mt-2 text-sm leading-7 text-zinc-600">{faq.a}</p></article>)}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#073f3b] p-7 text-white sm:flex-row sm:items-center">
            <div><h2 className="text-2xl font-extrabold">Start with the free ATS Resume Checker.</h2><p className="mt-2 text-sm text-white/65">No account. Upload a PDF or DOCX and get specific findings.</p></div>
            <div className="flex flex-wrap gap-3"><Link href="/free-tools/ats-resume-checker" className="press shrink-0 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-white">Check a resume free</Link><Link href={`${APP_URL}/signup`} className="press shrink-0 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">Create a free account</Link></div>
          </div>
        </div>
      </section>
    </main>
  )
}
