import type { Metadata } from "next"
import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { SITE_URL } from "@/lib/seo"
import { SUPPORT_EMAIL, UPGRADES_EMAIL } from "@/lib/contact"

export const metadata: Metadata = {
  title: "Terms of Service | Qalam",
  description:
    "Qalam Terms of Service - acceptable use, intellectual property, billing, content ownership, and enforcement.",
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: { index: true, follow: true },
}

const SECTIONS = [
  {
    id: "ip",
    title: "Intellectual Property and Copyright",
    content: [
      "All content on byqalam.com - including the product interface, copy, design, code, icons, illustrations, marketing materials, documentation, blog posts, and generated output templates - is the intellectual property of Qalam and is protected by applicable law.",
      "You may not copy, reproduce, republish, upload, transmit, distribute, sell, license, adapt, or create derivative works from any part of this site or product without prior written permission from Qalam. Scraping, automated harvesting, or systematic extraction of content via bots, spiders, or other automated means is prohibited.",
      "Fair use and legitimate quotation with attribution and a link to the source are permitted for non-commercial editorial, journalistic, or educational purposes, limited to short excerpts.",
    ],
  },
  {
    id: "monitoring",
    title: "Content Monitoring and Enforcement",
    content: [
      "Qalam may use standard logs, access records, and abuse monitoring to investigate scraping, automated harvesting, credential abuse, or unauthorized redistribution of proprietary material.",
      "We do not represent that every page view or clipboard action carries persistent session- or device-level watermarking. Enforcement statements on this site should match the controls actually in production.",
    ],
  },
  {
    id: "prohibited",
    title: "Prohibited Uses",
    content: [
      "You may not use this site or the Qalam product to copy proprietary content for commercial gain, train or fine-tune another AI or machine learning model without written permission, impersonate Qalam or its staff, distribute spam or deceptive content, attempt to reverse-engineer the application, access the product through automated scripts or credential-sharing, or violate applicable law.",
      "Violation of these terms may result in account termination, access restriction, and legal action where appropriate.",
    ],
  },
  {
    id: "your-content",
    title: "Your Content",
    content: [
      "Content you create using Qalam - drafts, posts, voice examples, and exported assets - remains yours. You grant Qalam a limited, non-exclusive license to process that material solely to deliver the product features you use.",
      "You represent that you have the rights necessary to submit any content you provide and that it does not infringe third-party rights.",
    ],
  },
  {
    id: "dmca",
    title: "DMCA and Copyright Infringement Claims",
    content: [
      `If you believe content on byqalam.com infringes your copyright, send a notice to ${UPGRADES_EMAIL} with identification of the work, the allegedly infringing material, your contact information, and a good-faith statement that the use is unauthorized.`,
    ],
  },
  {
    id: "billing",
    title: "Billing and Subscriptions",
    content: [
      "Commercial pricing is published publicly, but automated checkout and subscription enforcement may be rolled out in stages. If billing is handled manually for your workspace, the written onboarding terms provided at that time govern invoicing, renewal, and cancellation.",
    ],
  },
  {
    id: "availability",
    title: "Availability and Changes",
    content: [
      "Qalam is provided as is. We aim to improve the product over time, but make no guarantee of uninterrupted availability. We may modify or discontinue features, pricing, or service behavior with reasonable notice.",
    ],
  },
  {
    id: "governing",
    title: "Governing Law and Disputes",
    content: [
      "These Terms are governed by the laws of the jurisdiction in which Qalam is registered. Any disputes should first be addressed through good-faith negotiation before formal proceedings.",
    ],
  },
  {
    id: "contact",
    title: "Questions",
    content: [
      `For billing and business matters: ${UPGRADES_EMAIL}. For general support and everything else: ${SUPPORT_EMAIL}.`,
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="border-b border-zinc-100 bg-white px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <FadeUp>
            <span className="chip mb-5 inline-flex border-teal/30 bg-teal-50 text-teal">
              Legal
            </span>
            <h1 className="mb-4 text-5xl font-extrabold text-zinc-900">Terms of Service</h1>
            <p className="text-lg leading-relaxed text-zinc-500">
              Last updated: May 2026 · Questions?{" "}
              <a href={`mailto:${UPGRADES_EMAIL}`} className="text-teal underline underline-offset-2">
                {UPGRADES_EMAIL}
              </a>
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-[760px]">
          <FadeUp>
            <div className="mb-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                On this page
              </p>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-teal/30 hover:text-teal"
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          </FadeUp>

          <div className="space-y-6">
            {SECTIONS.map((section, i) => (
              <FadeUp key={section.id} delay={i * 0.04}>
                <div
                  id={section.id}
                  className="scroll-mt-28 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
                >
                  <h2 className="mb-4 text-xl font-bold text-zinc-900">{section.title}</h2>
                  <div className="space-y-3">
                    {section.content.map((para, j) => (
                      <p key={j} className="text-sm leading-relaxed text-zinc-600">
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp>
            <div className="mt-10 rounded-2xl bg-teal p-8 text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal-200">
                Need something in writing?
              </p>
              <h2 className="mb-4 text-2xl font-bold text-white">
                Enterprise agreements, DPA, and custom licensing can be discussed case by case.
              </h2>
              <Link
                href={`mailto:${UPGRADES_EMAIL}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-gold-600"
              >
                {"Contact Legal ->"}
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
