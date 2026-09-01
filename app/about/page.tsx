import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata, buildOrganizationSchema, SITE_URL } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "About Qalam - Operating Principles of a LinkedIn Publishing System",
  description: "What Qalam is, how voice memory works, what the product refuses to automate, and how to verify every claim before signing up.",
  path: "/about",
  keywords: ["about Qalam", "LinkedIn publishing system", "voice memory", "Qalam product principles", "LinkedIn content workflow"],
})

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Qalam",
  description:
    "Qalam is a LinkedIn publishing system with voice memory. Drafting is grounded in writing examples and professional context the user saves, and a person decides what gets published. Workspaces can add an optional reviewer approval step.",
  url: `${SITE_URL}/about`,
  mainEntity: buildOrganizationSchema(),
}

const PRINCIPLES = [
  {
    title: "Voice before volume",
    desc: "A feature that helps someone publish more while sounding less like themselves does not ship. Output quantity is easy now. Recognisability is the scarce thing.",
  },
  {
    title: "Say what is manual",
    desc: "If a workflow requires a person, we call it manual. If a score is a heuristic, we label it a heuristic. If a capability is not built, the page says it is not built.",
  },
  {
    title: "Continuity through context",
    desc: "Evidence, saved writing examples, drafts, versions, and outcomes stay connected across the workspace, without pretending that every action silently retrains a model.",
  },
]

const REFUSALS = [
  {
    label: "No autonomous posting",
    copy: "Qalam does not post, comment, react, or follow on its own. Publishing and scheduling are actions a person takes, and a scheduled post goes out at the time that person set.",
  },
  {
    label: "No engagement automation",
    copy: "There are no pods, no automated comment loops, and no artificial activity. The comment assistant drafts options that a person reads, chooses, and submits themselves.",
  },
  {
    label: "No silent voice drift",
    copy: "The voice profile changes when you change it. Qalam does not quietly retrain on your edits or post performance, which is what keeps the output predictable over months rather than weeks.",
  },
  {
    label: "No unreviewed output",
    copy: "AI drafting is grounded in the evidence and examples held in the workspace, and a person still decides what gets sent or scheduled. Qalam does not publish anything you have not acted on, because no language model can be guaranteed never to overstate. Workspaces that want a second pair of eyes can add a reviewer approval step on top.",
  },
]

const INSPECT = [
  { label: "Interactive demo", href: "/demo", desc: "The real interface running on labelled sample data." },
  { label: "Changelog", href: "/changelog", desc: "What shipped, and when." },
  { label: "Plans and limits", href: "/pricing", desc: "Exact monthly allowances per plan, not the word unlimited." },
  { label: "Scoring methodology", href: "/methodology/linkedin-authority-score", desc: "How the diagnostics are calculated." },
  { label: "System status", href: "/status", desc: "Current health of the running service." },
  { label: "Privacy policy", href: "/legal/privacy", desc: "How workspace data is handled and stored." },
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
          <div className="relative z-10 mx-auto max-w-[880px]">
            <FadeUp duration={0.5}>
              <span className="chip mb-6 inline-flex border-white/15 bg-white/8 text-white/85">About Qalam</span>
              <h1 className="mb-6 text-5xl font-extrabold leading-tight text-white sm:text-6xl">
                A publishing system built around{" "}
                <span className="gold-underline" style={{ color: "oklch(0.85 0.05 85)" }}>one constraint.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-white/65">
                Qalam is a LinkedIn publishing system with voice memory. The constraint is that output has to
                sound like the person whose name is on it. Everything else in the product exists to serve
                that, or it does not get built.
              </p>
            </FadeUp>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-[880px]">
            <FadeUp>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
                <h2 className="mb-4 text-2xl font-bold text-white">Why voice memory is the whole problem</h2>
                <div className="space-y-4 leading-relaxed text-white/60">
                  <p>
                    Generating a clean, competent LinkedIn post is now close to free. That is precisely why a
                    clean, competent post no longer signals anything. When the cost of polish drops to zero, the
                    remaining signal is whether the writing sounds like a specific person with a specific view.
                  </p>
                  <p>
                    That is a storage problem more than a generation problem. Qalam holds the material the
                    answer depends on. You save writing examples you are willing to be judged by, along with
                    your role, industry, and the audience you write for. Those samples are analysed into tone,
                    sentence length, vocabulary, and structural characteristics. When you draft, the most
                    relevant examples are retrieved and used as the reference for that specific piece.
                  </p>
                  <p>
                    The profile changes when you change it, not silently in the background. That is a deliberate
                    design choice: a voice that quietly retrains on every edit is a voice you cannot predict
                    three months from now.
                  </p>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-[880px]">
            <FadeUp>
              <h2 className="mb-6 text-2xl font-bold text-white">What the product refuses to automate</h2>
              <div className="divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/5">
                {REFUSALS.map((item) => (
                  <div key={item.label} className="p-7 md:p-8">
                    <h3 className="text-lg font-bold text-white">{item.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{item.copy}</p>
                  </div>
                ))}
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
                  <p className="text-sm leading-relaxed text-white/65">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-[880px]">
            <FadeUp>
              <h2 className="mb-3 text-2xl font-bold text-white">Verify the claims yourself</h2>
              <p className="mb-7 max-w-2xl leading-relaxed text-white/60">
                A page that describes a product is weaker evidence than the product. These surfaces are public
                and current.
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {INSPECT.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex min-h-11 flex-col rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/25 hover:bg-white/10"
                    >
                      <span className="font-bold text-[oklch(0.88_0.04_90)]">{item.label}</span>
                      <span className="mt-1 text-sm leading-relaxed text-white/55">{item.desc}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </FadeUp>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="mx-auto max-w-[880px]">
            <FadeUp>
              <div className="rounded-3xl border border-teal/20 bg-gradient-to-br from-teal/30 to-transparent p-10 text-center">
                <h2 className="mb-3 text-3xl font-bold text-white">Running LinkedIn for more than one account?</h2>
                <p className="mx-auto mb-7 max-w-xl text-white/65">
                  Agencies and content teams give each client an isolated workspace with its own voice profile,
                  archive, reviewer, and schedule.
                </p>
                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                  <Link
                    href="/partners"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-7 py-3.5 font-bold text-teal-900 transition-colors hover:bg-gold-600"
                  >
                    See partnership paths
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Compare plans
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
