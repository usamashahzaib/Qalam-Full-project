import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata } from "@/lib/seo"
import { SUPPORT_EMAIL } from "@/lib/contact"

export const metadata = buildPageMetadata({
  title: "Docs: Setup, Voice Profile, and Publishing Workflows",
  description: "Public Qalam docs for onboarding, voice setup, drafting, scheduling, and workspace operations.",
  path: "/docs",
})

const SECTIONS = [
  {
    title: "Getting started",
    body: "Email or LinkedIn sign-in, workspace creation, and where drafts, career records, archive items, and profile settings live today.",
  },
  {
    title: "Voice profile setup",
    body: "How to add writing samples, tune profile fields, and treat the current voice layer as an evolving workspace setting, not a magic model.",
  },
  {
    title: "Writing and revising posts",
    body: "Draft generation, manual edits, save flow, archive behavior, and how revisions persist across the current workspace.",
  },
  {
    title: "Scheduling and publishing",
    body: "What the scheduler surface does today, where LinkedIn publish fits, and which steps still require operator review.",
  },
  {
    title: "Analytics and post outcomes",
    body: "Current analytics are event-backed app signals, not a full LinkedIn reporting pipeline. Use them as workspace telemetry, not channel truth.",
  },
  {
    title: "Team and approval workflows",
    body: "Pro includes the approval workflow so a draft can be reviewed and released as a separate step from writing. Multi-workspace agency tooling is on the roadmap.",
  },
]

export default function DocsPage() {
  return (
    <div data-nav-ground="dark" data-nav-hero="dark" className="min-h-screen bg-teal-900 pt-24">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[760px] text-center">
          <FadeUp>
            <span className="chip mb-5 inline-flex border-white/20 bg-white/5 text-white/70">
              Help Center
            </span>
            <h1 className="mb-4 text-5xl font-extrabold text-white">Docs</h1>
            <p className="text-lg leading-relaxed text-white/55">
              Public docs are concise on purpose: only live behavior, current constraints, and the
              shortest path to operator clarity.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-[760px] space-y-4">
          {SECTIONS.map((section, i) => (
            <FadeUp key={section.title} delay={i * 0.06}>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5">
                <p className="font-medium text-white">{section.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{section.body}</p>
              </div>
            </FadeUp>
          ))}

          <FadeUp className="pt-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="mb-5 text-white/60">
                Need something specific now? Use the free tools or contact support directly.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href="/free-tools"
                  className="inline-flex items-center justify-center rounded-xl bg-teal px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-600"
                >
                  Browse Free Tools
                </Link>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
