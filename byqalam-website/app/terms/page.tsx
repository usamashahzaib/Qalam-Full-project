"use client"

import { FadeUp } from "@/components/FadeUp"

const SECTIONS = [
  {
    title: "Using Qalam",
    content: `By using Qalam, you agree that you're at least 16 years old and that you're using the service for lawful purposes. You're responsible for anything you post using Qalam.

Don't use Qalam to generate spam, misinformation, or content designed to deceive or harm others. Don't attempt to reverse-engineer, scrape, or misuse our API. Don't share your account credentials with others.

If you violate these terms, we may suspend or terminate your account. We'll give you notice unless the violation is severe or repeated.`,
  },
  {
    title: "Your content",
    content: `Anything you create using Qalam - posts, drafts, voice training data - remains yours. We don't claim ownership of your content.

By using Qalam, you give us permission to use your content for the sole purpose of providing the service to you. For example, your posts are processed to generate your Voice Fingerprint and to produce new drafts. Nothing more.

We do not use your content to train shared or public AI models without your explicit opt-in consent.`,
  },
  {
    title: "Subscriptions and billing",
    content: `Paid plans are billed monthly or annually, in advance. Your subscription renews automatically unless you cancel before the renewal date.

You can cancel at any time from your account settings. You'll retain access until the end of your billing period. We do not offer prorated refunds for unused time, except where required by law.

If we increase the price of your plan, we will notify you at least 30 days in advance. You can cancel before the price change takes effect.`,
  },
  {
    title: "Refund policy",
    content: `If you're not satisfied within the first 7 days of a paid plan, contact us at billing@byqalam.com and we'll issue a full refund - no questions asked.

After 7 days, refunds are evaluated case-by-case. We're reasonable. If something didn't work as expected, talk to us.`,
  },
  {
    title: "Availability and changes",
    content: `We aim for 99.9% uptime but don't guarantee it. We perform maintenance during low-usage hours and notify users of planned downtime in advance.

We may add, modify, or remove features over time. When we make changes that significantly affect the service, we'll notify you at least 14 days in advance.`,
  },
  {
    title: "Liability",
    content: `Qalam is provided "as is." We work hard to make it excellent, but we don't guarantee that the content it generates will be accurate, effective, or appropriate for every use case.

You are responsible for reviewing AI-generated content before publishing it. We are not liable for the outcomes of content you create using Qalam.

Our total liability to you for any claim is limited to the amount you paid us in the 3 months prior to the claim.`,
  },
  {
    title: "Governing law",
    content: `These terms are governed by the laws of Pakistan and, where applicable, the laws of the EU for users based in Europe. Any disputes will be resolved through binding arbitration before they go to court.

If any part of these terms is found unenforceable, the rest remains in effect.`,
  },
]

export default function TermsPage() {
  return (
    <div className="pt-24 min-h-screen">
      <section className="py-20 px-6">
        <div className="max-w-[760px] mx-auto">

          <FadeUp className="mb-14">
            <span className="chip border-white/20 text-white/70 bg-white/5 mb-5 inline-flex">Legal</span>
            <h1 className="text-5xl font-extrabold text-white mb-4">Terms of Service</h1>
            <p className="text-white/40 text-sm">Last updated: May 1, 2025</p>
            <p className="text-white/60 text-lg leading-relaxed mt-5">
              Written in plain English. If something&apos;s unclear, email{" "}
              <a href="mailto:legal@byqalam.com" className="text-gold hover:underline">
                legal@byqalam.com
              </a>{" "}
              and we&apos;ll clarify.
            </p>
          </FadeUp>

          <div className="flex flex-col gap-8">
            {SECTIONS.map((section, i) => (
              <FadeUp key={section.title} delay={i * 0.07}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                  <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
                  <p className="text-white/60 leading-relaxed text-sm whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.3}>
            <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-white font-semibold mb-1">Questions about these terms?</p>
              <a
                href="mailto:legal@byqalam.com"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-colors mt-4"
              >
                legal@byqalam.com →
              </a>
            </div>
          </FadeUp>

        </div>
      </section>
    </div>
  )
}
