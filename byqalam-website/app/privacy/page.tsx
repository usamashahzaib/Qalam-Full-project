"use client"

import { FadeUp } from "@/components/FadeUp"

const SECTIONS = [
  {
    title: "What we collect",
    content: `When you sign up for Qalam, we collect your name, email address, and payment information (processed securely by Stripe — we never store your card details). When you connect your LinkedIn account, we access your public profile information and, with your permission, your post history to train your Voice Fingerprint.

We also collect standard usage data: pages visited, features used, and general interaction patterns. This is anonymized and used solely to improve the product.`,
  },
  {
    title: "How we use your data",
    content: `Your data is used to provide and improve Qalam. Specifically:

Your LinkedIn posts (when you choose to share them) are used only to train your personal Voice Fingerprint model. They are not used to train any shared or public model, and they are not visible to Qalam team members without your explicit permission.

Your email is used for product communications, billing notifications, and (if you opt in) our weekly newsletter. We never sell your email to third parties. Ever.

Anonymized, aggregated usage data helps us understand which features are working and where users get stuck. We can't identify you from this data.`,
  },
  {
    title: "Data storage and security",
    content: `All data is stored on servers in the EU and US, compliant with GDPR and SOC 2 standards. Data is encrypted in transit (TLS 1.3) and at rest (AES-256).

We conduct regular security audits and penetration testing. If we ever discover a breach that affects your data, we will notify you within 72 hours — well within legal requirements.`,
  },
  {
    title: "Third-party services",
    content: `We use a small number of trusted third-party services to operate Qalam:

• Stripe — payment processing
• AWS — infrastructure and storage  
• Resend — transactional email
• PostHog — anonymized product analytics
• Sentry — error monitoring

Each of these services is bound by their own privacy policies and by our data processing agreements. We do not use advertising networks or data brokers.`,
  },
  {
    title: "Your rights",
    content: `You have the right to access all data we hold about you. You have the right to request correction, deletion, or export of your data at any time.

To exercise any of these rights, email privacy@byqalam.com. We respond within 48 hours and fulfill requests within 30 days — usually much faster.

If you're in the EU, you also have the right to lodge a complaint with your local data protection authority. We'd prefer you contact us first so we can make it right, but that right is yours regardless.`,
  },
  {
    title: "Cookies",
    content: `We use a minimal set of cookies: one session cookie to keep you logged in, and one analytics cookie (which you can opt out of). We don't use advertising cookies. We don't use tracking pixels. We don't build advertising profiles.

You can disable cookies in your browser settings at any time. The product will still work, though you'll need to log in each session.`,
  },
  {
    title: "Changes to this policy",
    content: `If we make material changes to this privacy policy, we will notify you by email at least 14 days before the change takes effect. We will also maintain a changelog of policy updates at byqalam.com/privacy.

The date below reflects when this policy was last updated.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="pt-24 min-h-screen">
      <section className="py-20 px-6">
        <div className="max-w-[760px] mx-auto">

          <FadeUp className="mb-14">
            <span className="chip border-white/20 text-white/70 bg-white/5 mb-5 inline-flex">Legal</span>
            <h1 className="text-5xl font-extrabold text-white mb-4">Privacy Policy</h1>
            <p className="text-white/40 text-sm">Last updated: May 1, 2025</p>
            <p className="text-white/60 text-lg leading-relaxed mt-5">
              We wrote this to be actually readable. No legal jargon, no burying things in clause 47. 
              If you have questions after reading this, email us at{" "}
              <a href="mailto:privacy@byqalam.com" className="text-gold hover:underline">
                privacy@byqalam.com
              </a>.
            </p>
          </FadeUp>

          <div className="flex flex-col gap-10">
            {SECTIONS.map((section, i) => (
              <FadeUp key={section.title} delay={i * 0.07}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                  <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
                  <div className="text-white/60 leading-relaxed text-sm whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.3}>
            <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-white font-semibold mb-1">Questions about your privacy?</p>
              <p className="text-white/40 text-sm mb-4">We respond to every email. Usually within a few hours.</p>
              <a
                href="mailto:privacy@byqalam.com"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-colors"
              >
                privacy@byqalam.com →
              </a>
            </div>
          </FadeUp>

        </div>
      </section>
    </div>
  )
}
