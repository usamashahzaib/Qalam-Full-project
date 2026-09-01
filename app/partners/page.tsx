import Link from "next/link"
import type { Metadata } from "next"
import { buildBreadcrumbSchema, buildFaqSchema, buildPageMetadata } from "@/lib/seo"

const faqs = [
  {
    q: "What can Qalam run for a multi-client LinkedIn operation today?",
    a: "Each client gets a separate workspace with its own voice profile, drafts, hooks, carousels, archive, and analytics. Team members are invited per workspace with owner, admin, editor, client reviewer, or viewer roles. Workspaces that want sign-off can route drafts to a named reviewer, and each workspace carries its own accent colour across the interface.",
  },
  {
    q: "Is Qalam white-label?",
    a: "No. What exists is per-workspace accent branding, which changes the interface colour while that client workspace is active. See Current scope for where the line sits, and tell us if full white-label is a requirement for your operation.",
  },
  {
    q: "How does the voice profile actually work?",
    a: "You save writing examples you are happy to be judged by, plus your role, industry, and audience. Qalam analyses those samples into tone, sentence length, vocabulary, and structural characteristics, then retrieves the most relevant examples each time it drafts. It does not learn silently from your edits, approvals, or post performance. Changing the saved profile is a deliberate update.",
  },
  {
    q: "Does Qalam post to LinkedIn on its own?",
    a: "No. Publishing and scheduling are actions a person takes. A post you scheduled is published at the time you set. There is no autonomous posting, no engagement automation, and no background activity carried out under a client's name.",
  },
  {
    q: "Can you preload our methodology or run cohort provisioning?",
    a: "Content pillars, professional context, and voice examples are configurable per workspace today, so a good deal of a taught method can be set up inside the existing product. Anything deeper is a design partnership scoped case by case. See Current scope.",
  },
  {
    q: "What are the commercial terms?",
    a: "They depend on the model. Agency operations run on the standard Agency plan with reviewed onboarding. Design partnerships are scoped and agreed directly, because the work varies too much for a fixed rate card. The consumer referral programme inside the product is a separate, much smaller instrument and is not the basis of a partnership.",
  },
]

const paths = [
  {
    label: "Path 01",
    title: "Agency operations",
    who: "Agencies, ghostwriters, and content teams running LinkedIn for multiple clients",
    problem:
      "Running several clients through one generic AI tool means one shared history, one blurred voice, and approval chased over email. Quality drops at the exact point the roster grows.",
    live: [
      "A separate workspace per client, each with its own voice profile, drafts, hooks, carousels, and archive",
      "Role-based team access: owner, admin, editor, client reviewer, and viewer",
      "Optional approval step, routed to a named reviewer when a client wants sign-off",
      "User-set scheduling and publishing to a connected LinkedIn account",
      "Per-workspace post analytics, synced from LinkedIn for posts published through Qalam and entered manually for anything published elsewhere",
      "Per-workspace accent branding across the interface",
    ],
    state: "Live on the Agency plan, with reviewed onboarding",
    ctaLabel: "Discuss an agency workflow",
    ctaHref: "/contact?topic=agency",
  },
  {
    label: "Path 02",
    title: "Design partnerships",
    who: "Coaches, educators, communities, and methodology owners",
    problem:
      "A taught method lands in the workshop and then has nowhere to live. Students lose the pillars, the hook structures, and the review discipline the moment they go back to their own tools.",
    live: [
      "Content pillars, professional context, and voice examples configurable per workspace",
      "The full publishing workflow available to every seat you set up",
      "A working product your people can inspect before anything is agreed",
    ],
    state: "Evaluated case by case, scoped as a pilot",
    ctaLabel: "Propose a design partnership",
    ctaHref: "/contact?topic=partnership",
  },
]

// One authoritative scope statement, replacing the "not built" line that used to
// repeat on both path cards, in two FAQs, and in a boundary.
const scopeLive = [
  "Isolated workspace per client, each with its own voice profile, drafts, hooks, carousels, and archive",
  "Roles per workspace: owner, admin, editor, client reviewer, viewer",
  "Optional reviewer approval step for workspaces that want one",
  "User-set scheduling and publishing to a connected LinkedIn account",
  "Post analytics synced from LinkedIn for posts published through Qalam, plus manual entry for anything else",
  "Per-workspace accent branding across the interface",
  "Content pillars, professional context, and voice examples configurable per workspace",
]

const scopeNotBuilt = [
  "Full white-label, custom domains, and removable Qalam identity",
  "Partner-level reporting across a whole roster",
  "Custom scoring rubrics and preloaded methodology templates",
  "Bulk cohort or member provisioning",
]

const boundaries = [
  [
    "Your audience stays yours",
    "Qalam does not email your list, contact your clients, or use your audience for its own marketing. There is no clause that turns a partnership into a distribution channel.",
  ],
  [
    "Your content stays yours",
    "Workspace content belongs to the account that created it. Nothing written in a client workspace is reused as Qalam marketing material without written permission.",
  ],
  [
    "Nothing acts under your name",
    "No autonomous posting, no engagement automation, no background activity. Publishing and scheduling are explicit actions taken by a person with access.",
  ],
  [
    "We describe only what is built",
    "Current scope below sets out exactly what runs today and what does not. If a requirement is missing, you will hear that in the first conversation rather than after signing.",
  ],
]

export const metadata: Metadata = buildPageMetadata({
  title: "Partnerships - Agency Workspaces and Design Partnerships",
  description: "Run multiple LinkedIn clients in isolated workspaces with separate voice profiles, approvals, and scheduling, or scope a design partnership around a taught methodology.",
  path: "/partners",
  tag: "Partnerships",
  keywords: [
    "LinkedIn agency software",
    "LinkedIn ghostwriting software",
    "LinkedIn client workspaces",
    "LinkedIn content operations",
    "LinkedIn approval workflow",
  ],
})

export default function PartnersPage() {
  const schemas = [
    buildBreadcrumbSchema([{ name: "Home", path: "/" }, { name: "Partnerships", path: "/partners" }]),
    buildFaqSchema(faqs),
  ]

  return (
    <main className="bg-[#fbfdfc] pt-20 text-zinc-900">
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      ))}

      <section className="relative overflow-hidden bg-[#f7f3ea] px-6 pb-20 pt-20 sm:pt-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_18%_8%,rgba(183,232,221,0.6),transparent_38%),radial-gradient(circle_at_82%_14%,rgba(255,220,170,0.4),transparent_34%)]" aria-hidden />
        <div className="relative mx-auto max-w-[1200px]">
          <p className="inline-flex min-h-9 items-center gap-2 rounded-full border border-teal/15 bg-white/65 px-4 text-xs font-bold uppercase tracking-[0.14em] text-teal shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-gold" aria-hidden />
            Partnerships
          </p>
          <h1 className="mt-7 max-w-[18ch] text-[clamp(2.4rem,5.4vw,4.7rem)] font-extrabold leading-[1] tracking-[-0.05em] text-teal">
            Every client in their own voice.{" "}
            <span className="gold-underline font-cormorant font-semibold italic tracking-[-0.03em] text-gold-700">Not the same one.</span>
          </h1>
          <p className="mt-7 max-w-[60ch] text-lg leading-8 text-zinc-600 sm:text-xl">
            Qalam is a LinkedIn publishing system with voice memory. For teams running more than one account, each client gets an isolated workspace with its own voice profile, archive, reviewer, and schedule. Two ways to work with us, and both start with what is actually built.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact?topic=agency"
              className="press inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(13,74,69,0.2)] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-teal-600"
            >
              Talk to partnerships
            </Link>
            <Link href="/demo" className="press inline-flex min-h-12 items-center justify-center rounded-xl border border-teal/20 bg-white/70 px-7 py-3.5 text-sm font-bold text-teal transition-colors hover:border-teal/40 hover:bg-white">
              Inspect the product first
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-teal/10 bg-teal px-6 py-9 text-white">
        <div className="mx-auto grid max-w-[1200px] gap-6 md:grid-cols-3 md:divide-x md:divide-white/15">
          {[
            ["Isolated per client", "Separate voice profile, drafts, hooks, carousels, archive, and analytics in every workspace."],
            ["Optional review step", "Route a draft to a named reviewer when an account wants sign-off, with the full version history attached."],
            ["Explicit publishing", "Posts go out when someone sends or schedules them. No autonomous activity under a client name."],
          ].map(([title, copy]) => (
            <div key={title} className="md:px-8 first:md:pl-0 last:md:pr-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-200">{title}</p>
              <p className="mt-2 text-sm leading-6 text-white/78">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#fbfdfc] px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Two paths</p>
            <h2 className="t-h2 mt-4 text-teal">One is a plan. One is a conversation.</h2>
            <p className="t-lead mt-5 text-zinc-600">
              Each path lists what runs today and what does not. The second list is the useful one.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {paths.map((path) => (
              <article key={path.title} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-7 shadow-[0_18px_50px_rgba(13,74,69,0.06)] sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">{path.label}</p>
                <h3 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">{path.title}</h3>
                <p className="mt-3 text-sm font-semibold text-teal">{path.who}</p>
                <p className="mt-5 text-base leading-7 text-zinc-600">{path.problem}</p>

                <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-teal">What this covers</p>
                <ul className="mt-3 space-y-2.5">
                  {path.live.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-6">
                  <span className="rounded-full bg-teal/8 px-3 py-1.5 text-xs font-bold text-teal">{path.state}</span>
                  <Link href={path.ctaHref} className="inline-flex min-h-11 items-center font-bold text-teal underline decoration-gold decoration-2 underline-offset-4">
                    {path.ctaLabel}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="current-scope" className="border-y border-zinc-200 bg-white px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-[1100px]">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Current scope</p>
            <h2 className="t-h2 mt-4 text-teal">Everything that runs, and the four things that do not.</h2>
            <p className="t-lead mt-5 text-zinc-600">
              One list, stated once, so you can rule Qalam in or out in under a minute.
            </p>
          </div>
          <div className="mt-11 grid gap-10 lg:grid-cols-[1.35fr_0.85fr] lg:gap-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Running today</p>
              <ul className="mt-4 space-y-3">
                {scopeLive.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Not built</p>
              <ul className="mt-4 space-y-3">
                {scopeNotBuilt.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-500">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-zinc-200 pt-5 text-sm leading-6 text-zinc-600">
                Any of these can be scoped as a design partnership. None of them is sold as live.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="qlx relative overflow-hidden bg-[#102f2d] px-6 py-24 text-white sm:py-28" data-nav-ground="dark">
        <div className="qlx-grain" aria-hidden />
        <div className="relative mx-auto max-w-[1200px]">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">Boundaries</p>
              <h2 className="t-h2 mt-4 max-w-lg text-white">What Qalam will never do with your audience or your content.</h2>
              <p className="t-lead mt-5 max-w-lg text-white/65">
                These are the terms up front, so the first conversation can be about the operational fit instead of the fine print.
              </p>
            </div>
            <div className="divide-y divide-white/12 border-y border-white/12">
              {boundaries.map(([title, copy]) => (
                <div key={title} className="py-7">
                  <h3 className="text-xl font-bold text-white">{title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f3ea] px-6 py-24 sm:py-28">
        <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Verify before you talk to us</p>
            <h2 className="t-h2 mt-4 text-teal">The product is inspectable.</h2>
          </div>
          <div className="space-y-5 text-base leading-7 text-zinc-600">
            <p>
              Nothing on this page needs to be taken on trust. The interactive demo runs the real interface with labelled sample data. The changelog records what shipped and when. The pricing page publishes exact monthly limits per plan rather than the word unlimited. The status page reports current system health.
            </p>
            <p>
              Read those first. If the workflow does not fit how your team operates, that is worth finding out in ten minutes rather than in onboarding.
            </p>
            <div className="flex flex-wrap gap-5 pt-2 text-sm font-bold text-teal">
              <Link href="/demo" className="inline-flex min-h-11 items-center underline decoration-gold decoration-2 underline-offset-4">Interactive demo</Link>
              <Link href="/changelog" className="inline-flex min-h-11 items-center underline decoration-gold decoration-2 underline-offset-4">Changelog</Link>
              <Link href="/pricing" className="inline-flex min-h-11 items-center underline decoration-gold decoration-2 underline-offset-4">Plans and limits</Link>
              <Link href="/status" className="inline-flex min-h-11 items-center underline decoration-gold decoration-2 underline-offset-4">System status</Link>
              <Link href="/docs" className="inline-flex min-h-11 items-center underline decoration-gold decoration-2 underline-offset-4">Documentation</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-[900px]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Partnership questions</p>
          <h2 className="t-h2 mt-4 text-teal">Answered plainly, including the negatives.</h2>
          <div className="mt-10 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
            {faqs.map((faq) => (
              <details key={faq.q} className="group p-6">
                <summary className="cursor-pointer list-none pr-8 text-sm font-bold text-zinc-900">
                  {faq.q}
                  <span className="float-right text-teal transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-zinc-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="qlx relative overflow-hidden bg-[#102f2d] px-6 py-20 text-white" data-nav-ground="dark">
        <div className="qlx-grain" aria-hidden />
        <div className="relative mx-auto flex max-w-[1000px] flex-col items-center text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">Next step</p>
          <h2 className="mt-5 max-w-3xl text-[clamp(2.2rem,4.6vw,4.2rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-white">
            Tell us how your operation runs. We will tell you what fits and what does not.
          </h2>
          <Link href="/contact?topic=partnership" className="qlx-champagne-btn mt-8 inline-flex min-h-12 items-center justify-center rounded-xl px-8 text-sm font-bold">
            Talk to partnerships
          </Link>
          <p className="mt-4 text-xs text-white/50">Replies within one business day, including the answers that are no.</p>
        </div>
      </section>
    </main>
  )
}
