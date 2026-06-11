import type { Metadata } from "next"
import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { ContactForm } from "@/components/ContactForm"
import {
  CONTACT_INBOXES,
  MANUAL_UPGRADE_METHODS,
  MANUAL_UPGRADE_SLA,
} from "@/lib/contact"

export const metadata: Metadata = {
  title: "Contact",
  description: "Public contact routes for support, plan upgrades, agency onboarding, and commercial questions.",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="border-b border-zinc-100 bg-white px-6 py-20">
        <div className="mx-auto max-w-[860px] text-center">
          <FadeUp>
            <span className="chip mb-5 inline-flex border-teal/30 bg-teal-50 text-teal">Contact</span>
            <h1 className="mb-5 text-5xl font-extrabold text-zinc-900 sm:text-6xl">Reach the Qalam team</h1>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600">
              Public contact routes for support, plan upgrades, agency onboarding, partnerships, and legal questions.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Contact form */}
      <section className="border-b border-zinc-100 px-6 py-16">
        <div className="mx-auto max-w-[1000px]">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <FadeUp>
              <div className="flex flex-col gap-6">
                {CONTACT_INBOXES.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    className="block rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:border-teal/30"
                  >
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-teal">{item.title}</p>
                    <p className="text-base font-bold text-zinc-900">{item.value}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.desc}</p>
                  </a>
                ))}
                <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">Before you write</p>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-zinc-600">
                    <li>- Your workspace email</li>
                    <li>- The plan you want</li>
                    <li>- Monthly or annual billing</li>
                    <li>- Team size if agency access needed</li>
                  </ul>
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.06}>
              <ContactForm />
            </FadeUp>
          </div>
        </div>
      </section>

      <section className="px-6 pb-8">
        <div className="mx-auto max-w-[1000px]">
          <FadeUp>
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal">Manual upgrades</p>
              <h2 className="mb-3 text-2xl font-bold text-zinc-900">How paid access works today</h2>
              <ol className="space-y-2 text-sm leading-relaxed text-zinc-600">
                <li>1. Pick the plan that matches your workload.</li>
                <li>2. Email the team or use the form above for payment instructions.</li>
                <li>3. Pay using {MANUAL_UPGRADE_METHODS.join(", ")}.</li>
                <li>4. Send the payment screenshot in the same thread.</li>
                <li>5. Qalam unlocks your workspace after manual review.</li>
              </ol>
              <p className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-500">
                {MANUAL_UPGRADE_SLA}
              </p>
              <div className="mt-5">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  Compare plans
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center justify-center gap-4 rounded-3xl bg-teal p-10 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h2 className="mb-2 text-3xl font-bold text-white">Need product context first?</h2>
            <p className="text-sm leading-relaxed text-white/70">
              Pricing, free tools, and product pages explain the current public scope better than a generic contact form.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl bg-gold px-7 py-3.5 font-bold text-white transition-colors hover:bg-gold-600"
          >
            See pricing
          </Link>
        </div>
      </section>
    </div>
  )
}
