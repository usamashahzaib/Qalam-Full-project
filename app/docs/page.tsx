import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata, resolvePublicHref } from "@/lib/seo"
import { SUPPORT_EMAIL } from "@/lib/contact"

export const metadata = buildPageMetadata({
  title: "Docs: Setup, Voice Profile, and Publishing Workflows",
  description: "Public Qalam docs for onboarding, voice setup, drafting, scheduling, and workspace operations.",
  path: "/docs",
})

const SECTIONS = [
  {
    title: "Getting started",
    body: "Create an account or sign in, then open Writer to start a post. Saved posts appear in Library. If you work with clients, select the intended client workspace before drafting so its content and voice stay together.",
    href: "/login", link: "Sign in to your workspace",
  },
  {
    title: "Voice profile setup",
    body: "Open Voice and add your professional details. On a plan with voice training, paste writing samples you wrote, choose Analyze Voice, review the result, and choose Save Voice Profile. Update those samples when your writing changes. Editing a draft does not automatically retrain your voice.",
    href: "/voice", link: "Open Voice",
  },
  {
    title: "Writing and revising posts",
    body: "In Writer, enter a topic and the facts you want included. Generate hooks, choose one, then generate the full post. Check names, numbers, personal claims, and tone before saving. A quality score is an editing aid, not proof that a claim is true or that a post will perform well.",
    href: "/writer", link: "Open Writer",
  },
  {
    title: "Scheduling and publishing",
    body: "Connect LinkedIn in Settings before publishing. On a plan with scheduling, review your draft and choose a future date and time. Planner shows scheduled posts in your browser's local time. Carousel documents currently need to be exported and uploaded to LinkedIn manually. If a publish result is uncertain, check LinkedIn before trying again.",
    href: "/calendar", link: "Open Planner",
  },
  {
    title: "Analytics and post outcomes",
    body: "Use Analytics to review the activity and metrics available for your workspace. Missing LinkedIn metrics do not mean zero engagement. Check the connected account and compare against LinkedIn before drawing conclusions from an incomplete report.",
    href: "/analytics", link: "Open Analytics",
  },
  {
    title: "Team and approval workflows",
    body: "Pro includes the approval workflow so a draft can be reviewed and released as a separate step from writing. Agency includes five isolated client workspaces, team seats, and reviewed onboarding.",
    href: "/approvals", link: "Open Approvals",
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
            <p className="text-lg leading-relaxed text-white/65">
              Set up your voice, prepare a draft, and check what happens before publishing.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-[760px] space-y-4">
          {SECTIONS.map((section, i) => (
            <FadeUp key={section.title} delay={i * 0.06}>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5">
                <h2 className="font-medium text-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{section.body}</p>
                <Link href={resolvePublicHref(section.href)} className="mt-3 inline-flex min-h-11 items-center font-semibold text-white underline underline-offset-4">{section.link}</Link>
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
