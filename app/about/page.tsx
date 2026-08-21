import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata, buildOrganizationSchema, SITE_URL } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "About - AI LinkedIn Writing System",
  description: "Qalam is a serious LinkedIn publishing system: voice memory, post history, content assets, scheduling, and performance feedback for founders and agencies.",
  path: "/about",
  keywords: ["about Qalam", "Qalam AI writer", "LinkedIn writing system", "Qalam product principles"],
})

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Qalam",
  description: "Qalam is an AI LinkedIn writing system built around persistent voice memory, draft history, and compounding content capital for serious professionals.",
  url: `${SITE_URL}/about`,
  mainEntity: buildOrganizationSchema(),
}

const PRINCIPLES = [
  {
    title: "Voice before volume",
    desc: "If a feature helps users publish more but sound less like themselves, it fails the test.",
  },
  {
    title: "Retention through memory",
    desc: "The product should improve because it remembers your edits, drafts, approved posts, and outcomes.",
  },
  {
    title: "No fake intelligence",
    desc: "If a workflow is manual, we say it is manual. If a signal is heuristic, we label it heuristic.",
  },
]

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema).replace(/</g, "\\u003c") }} />
    <div data-nav-ground="dark" data-nav-hero="dark" className="min-h-screen bg-teal-900 pt-24">
      <section className="qlx qlx-surface relative overflow-hidden px-6 py-24">
        <div className="qlx-grain" aria-hidden />
        <div
          className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.4 0.05 196 / 0.55) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div
          className="absolute -right-24 top-0 h-[400px] w-[400px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.85 0.05 85 / 0.4) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-[860px] text-center">
          <FadeUp duration={0.5}>
            <span className="chip mb-6 inline-flex border-white/15 bg-white/8 text-white/85">
              About Qalam
            </span>
            <h1 className="mb-6 text-5xl font-extrabold leading-tight text-white sm:text-6xl">
              A publishing system for people who need
              {" "}
              <span className="gold-underline" style={{ color: "oklch(0.85 0.05 85)" }}>authority, not filler.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/65">
              Qalam is being built as a serious LinkedIn publishing desk: voice memory, post
              history, content assets, scheduling, and performance feedback in one system.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto max-w-[860px]">
          <FadeUp>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
              <h2 className="mb-4 text-2xl font-bold text-white">What this product is trying to solve</h2>
              <div className="space-y-4 leading-relaxed text-white/60">
                <p>
                  Most AI writing tools reset every session. They generate a draft, but they do not
                  accumulate knowledge about the writer behind it.
                </p>
                <p>
                  Qalam is designed around a different idea: each approved post, edit, saved asset,
                  and publishing outcome should make the next session more useful than the last one.
                </p>
                <p>
                  That is the product direction. Not chat for chat&apos;s sake. Not generic content
                  volume. A system that becomes harder to replace the longer someone uses it.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 md:grid-cols-3">
          {PRINCIPLES.map((item, i) => (
            <FadeUp key={item.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-7">
                <h3 className="mb-3 text-xl font-bold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/55">{item.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-[860px]">
          <FadeUp>
            <div className="rounded-3xl border border-teal/20 bg-gradient-to-br from-teal/30 to-transparent p-10 text-center">
              <h2 className="mb-3 text-3xl font-bold text-white">Want the product updates?</h2>
              <p className="mx-auto mb-7 max-w-xl text-white/55">
                The changelog, pricing, and free tools pages show the current public state more
                honestly than a polished brand story ever could.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl bg-gold px-7 py-3.5 font-bold text-white transition-colors hover:bg-gold-600"
                >
                  Compare Plans
                </Link>
                <Link
                  href="/free-tools"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Explore Free Tools
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
    </>
  )
}
