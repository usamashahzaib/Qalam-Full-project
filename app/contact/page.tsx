import type { Metadata } from "next"
import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"

export const metadata: Metadata = {
  title: "Contact | Qalam",
  description: "Public contact options for Qalam sales, support, partnerships, and hiring.",
}

const CONTACTS = [
  {
    title: "Sales & upgrades",
    desc: "Plan questions, agency fit, and upgrade requests.",
    value: "business@byqalam.com",
    href: "mailto:business@byqalam.com",
  },
  {
    title: "General & support",
    desc: "Product questions, partnerships, and everything else.",
    value: "info@byqalam.com",
    href: "mailto:info@byqalam.com",
  },
]

export default function ContactPage() {
  return (
    <div className="pt-24 min-h-screen bg-zinc-50">
      <section className="border-b border-zinc-100 bg-white px-6 py-20">
        <div className="mx-auto max-w-[860px] text-center">
          <FadeUp>
            <span className="chip mb-5 inline-flex border-teal/30 bg-teal-50 text-teal">Contact</span>
            <h1 className="mb-5 text-5xl font-extrabold text-zinc-900 sm:text-6xl">Reach the Qalam team</h1>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-600">
              This page exists so footer and legal contact routes resolve to something real. Pick the right inbox and we will route from there.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-[1000px] gap-6 md:grid-cols-3">
          {CONTACTS.map((item, i) => (
            <FadeUp key={item.title} delay={i * 0.08}>
              <a href={item.href} className="block rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm transition-colors hover:border-teal/30">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-teal">{item.title}</p>
                <h2 className="mb-3 text-xl font-bold text-zinc-900">{item.value}</h2>
                <p className="text-sm leading-relaxed text-zinc-600">{item.desc}</p>
              </a>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto flex max-w-[860px] flex-col items-center justify-center gap-4 rounded-3xl bg-teal p-10 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h2 className="mb-2 text-3xl font-bold text-white">Need product context first?</h2>
            <p className="text-sm leading-relaxed text-white/70">
              Pricing, free tools, and product pages explain the current public scope better than a generic contact form.
            </p>
          </div>
          <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl bg-gold px-7 py-3.5 font-bold text-white transition-colors hover:bg-gold-600">
            See Pricing
          </Link>
        </div>
      </section>
    </div>
  )
}
