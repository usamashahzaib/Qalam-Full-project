import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "Privacy",
  description: "Public privacy summary for what Qalam stores, how it is used, and where policy details stay conservative.",
  path: "/privacy",
})

const SECTIONS = [
  {
    title: "What Qalam stores",
    content:
      "Account details, drafts, saved voice examples, post history, and the settings needed to run the product features you choose to use.",
  },
  {
    title: "How it is used",
    content:
      "Your data is used to operate your workspace, improve your voice profile, and preserve your publishing history. Public pages should not claim broader processing than the product actually performs.",
  },
  {
    title: "Third-party services",
    content:
      "Infrastructure and payment providers may process data on our behalf. Public policy text stays conservative unless those vendors are verified in the live stack.",
  },
  {
    title: "Your controls",
    content:
      "For access, deletion, or export requests, contact privacy@byqalam.com. This page is intentionally plain until the full operational policy is finalized.",
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-teal-900 pt-24">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <FadeUp className="mb-12">
            <span className="chip mb-5 inline-flex border-white/20 bg-white/5 text-white/70">
              Legal
            </span>
            <h1 className="mb-4 text-5xl font-extrabold text-white">Privacy Policy</h1>
            <p className="text-lg leading-relaxed text-white/55">
              A short public version that avoids promising infrastructure or data practices we have not
              formally documented yet.
            </p>
          </FadeUp>

          <div className="space-y-6">
            {SECTIONS.map((section, i) => (
              <FadeUp key={section.title} delay={i * 0.06}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                  <h2 className="mb-3 text-xl font-bold text-white">{section.title}</h2>
                  <p className="text-sm leading-relaxed text-white/55">{section.content}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
