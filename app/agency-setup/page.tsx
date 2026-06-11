import type { Metadata } from "next"
import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Agency Setup",
  description:
    "Set up Qalam agency workspaces for LinkedIn ghostwriting, client voice memory, approvals, team roles, and multi-client publishing flow.",
  path: "/agency-setup",
  keywords: [
    "agency LinkedIn workflow",
    "LinkedIn ghostwriting agency tool",
    "AI writer for agencies",
    "client content approvals",
    "agency content workspace",
  ],
})

const pillars = [
  {
    title: "Separate client memory",
    body:
      "Each client gets an isolated workspace, so drafts, voice examples, notes, and publishing context do not bleed into another account.",
  },
  {
    title: "Approval before publish",
    body:
      "Drafts move through an approval path instead of getting shipped ad hoc. That reduces revision churn and keeps client sign-off visible.",
  },
  {
    title: "Team operating layer",
    body:
      "Writers, editors, and reviewers can work from one system instead of juggling disconnected docs, chats, and exported drafts.",
  },
]

const steps = [
  "Create an agency workspace and add your internal team.",
  "Create one client workspace per account you manage.",
  "Store client notes, voice guidance, and examples inside that workspace.",
  "Draft and review content under the correct client before publishing.",
]

export default function AgencySetupPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="border-b border-zinc-100 bg-white px-6 py-20">
        <div className="mx-auto max-w-[980px]">
          <FadeUp>
            <span className="chip mb-5 inline-flex border-gold/40 bg-gold/5 text-gold">
              Agency Setup
            </span>
            <h1 className="mb-5 max-w-4xl text-5xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl">
              Run multiple client content systems without mixing their voice.
            </h1>
            <p className="max-w-3xl text-xl leading-relaxed text-zinc-600">
              Qalam agency workspaces are built for one thing: clean client separation.
              Each account should keep its own memory, review path, and publishing context.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-[980px] gap-6 md:grid-cols-3">
          {pillars.map((item, i) => (
            <FadeUp key={item.title} delay={i * 0.06}>
              <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-teal">
                  0{i + 1}
                </p>
                <h2 className="mb-3 text-2xl font-bold text-zinc-900">{item.title}</h2>
                <p className="text-sm leading-relaxed text-zinc-600">{item.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      <section className="px-6 pb-8">
        <div className="mx-auto grid max-w-[980px] gap-6 md:grid-cols-[1.2fr_.8fr]">
          <FadeUp>
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
              <h2 className="mb-4 text-3xl font-bold text-zinc-900">How setup works</h2>
              <div className="space-y-4">
                {steps.map((step, i) => (
                  <div key={step} className="flex gap-4">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-600">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <div className="rounded-3xl border border-teal/20 bg-teal p-8 shadow-sm">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold-100">
                Current product scope
              </p>
              <h2 className="mb-3 text-2xl font-bold text-white">
                Best fit for agencies managing repeat client publishing.
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-white/75">
                The public setup page explains the model. The in-app agency area is where
                clients, team members, exports, and writer handoff live today.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-gold px-6 py-3.5 font-bold text-white transition-colors hover:bg-gold-600"
                >
                  Open Agency Workspace
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  See Agency Pricing
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[980px] rounded-3xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h2 className="mb-3 text-3xl font-bold text-zinc-900">What this changes operationally</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-600">
            Without workspace separation, agencies end up mixing notes, voice examples, and
            drafts across accounts. That is where quality drops. Qalam is meant to keep each
            client&apos;s memory clean, make review predictable, and reduce back-and-forth before
            a post goes live.
          </p>
        </div>
      </section>
    </div>
  )
}
