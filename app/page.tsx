import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CareerMomentumPreview } from "@/components/home/CareerMomentumPreview"
import { CareerSignalMap } from "@/components/home/CareerSignalMap"
import { FaqAccordion } from "@/components/home/FaqAccordion"
import { HeroChecker } from "@/components/home/HeroChecker"
import { HomepageAnalytics, TrackedHomepageLink } from "@/components/home/HomepageAnalytics"
import { CheckIcon } from "@/components/ui/qalam-icons"
import { PLANS, formatPkr, getQuarterlyMonthlyEquivalent, quarterlyFraming } from "@/lib/pricing"
import { LANDING_FAQ } from "@/lib/marketing-content"
import { resolvePublicHref } from "@/lib/seo"
import { SUPPORT_EMAIL } from "@/lib/contact"

export const metadata: Metadata = {
  title: "Qalam | Turn Experience Into Proof People Trust",
  description: "Build an accurate career story across LinkedIn, ATS resumes, and recruiter positioning from facts you control.",
}

const workflow = [
  {
    number: "01",
    title: "Capture the facts",
    copy: "Start with achievements, source posts, target roles, and the work you can defend in an interview.",
  },
  {
    number: "02",
    title: "Shape each surface",
    copy: "Turn the same evidence into LinkedIn positioning, professional content, and role-specific resume language.",
  },
  {
    number: "03",
    title: "Review before release",
    copy: "Edit every claim, approve every draft, and publish only when the result still sounds true to you.",
  },
]

const proofRules = [
  {
    label: "Accuracy",
    title: "No invented achievements",
    copy: "The system works from the evidence you provide. It should sharpen a fact, never manufacture one.",
  },
  {
    label: "Control",
    title: "Nothing posts by surprise",
    copy: "Scheduling and publishing are explicit actions. Drafts stay drafts until you decide otherwise.",
  },
  {
    label: "Continuity",
    title: "One career record",
    copy: "Your Career Vault keeps roles, evidence, resumes, and applications connected instead of scattered across prompts.",
  },
]

const focusedFaq = LANDING_FAQ.slice(0, 4)

const productScreens = [
  {
    src: "/product/qalam-writer-demo.png",
    alt: "Qalam demo workspace showing the LinkedIn writer, hook choices, voice profile, and editable draft",
    title: "Write from a real point",
    copy: "Choose a hook, edit the full draft, and keep the voice context visible while you work.",
  },
  {
    src: "/product/qalam-voice-demo.png",
    alt: "Qalam demo voice profile showing sample tone, style, and approved writing examples",
    title: "Keep voice context explicit",
    copy: "See what the demo voice profile contains and which sample writing informs the draft.",
  },
  {
    src: "/product/qalam-archive-demo.png",
    alt: "Qalam demo archive showing clearly labelled sample LinkedIn posts and activity fields",
    title: "Build a reusable archive",
    copy: "Return to prior ideas and clearly labelled sample records without losing the original context.",
  },
]

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: focusedFaq.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
}

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Build an evidence-led career story with Qalam",
  description: "Capture career facts, shape them for each professional surface, and review every output before release.",
  step: workflow.map((step, index) => ({
    "@type": "HowToStep",
    position: index + 1,
    name: step.title,
    text: step.copy,
  })),
}

export default function HomePage() {
  const homepagePlans = PLANS.slice(0, 3).map((plan) => ({
    ...plan,
    href: resolvePublicHref(plan.href),
  }))

  return (
    <>
      <HomepageAnalytics />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema).replace(/</g, "\\u003c") }} />

      <section className="relative overflow-hidden bg-[#f7f3ea] px-6 pb-20 pt-32 sm:pb-24 sm:pt-40">
        <div className="pointer-events-none absolute inset-0 hero-field opacity-70" aria-hidden />
        <div className="pointer-events-none absolute inset-0 hero-wash" aria-hidden />
        <div className="pointer-events-none absolute inset-0 hidden hero-glow lg:block" aria-hidden />
        <div className="pointer-events-none absolute inset-0 hidden hero-aurora lg:block" aria-hidden />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(430px,0.82fr)] lg:gap-16">
          <div>
            <p className="inline-flex min-h-9 items-center gap-2 rounded-full border border-teal/15 bg-white/65 px-4 text-xs font-bold uppercase tracking-[0.14em] text-teal shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-gold" aria-hidden />
              Career visibility, grounded in evidence
            </p>
            <h1 className="mt-7 max-w-[720px] text-[clamp(3.5rem,7.2vw,6.8rem)] font-extrabold leading-[0.92] tracking-[-0.06em] text-teal">
              Turn your experience into <span className="gold-underline font-cormorant font-semibold italic tracking-[-0.035em] text-gold-700">proof people trust.</span>
            </h1>
            <p className="mt-7 max-w-[610px] text-lg leading-8 text-zinc-600 sm:text-xl">
              You already did the work. Qalam turns it into proof a recruiter believes, on LinkedIn, in your resume, and everywhere your name shows up.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <TrackedHomepageLink
                href={resolvePublicHref("/signup")}
                event="homepage_primary_cta_click"
                parameters={{ placement: "hero" }}
                className="press inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(13,74,69,0.2)] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-[0_18px_36px_rgba(13,74,69,0.24)]"
              >
                Build your proof
              </TrackedHomepageLink>
              <Link href="#workflow" className="press inline-flex min-h-12 items-center justify-center rounded-xl border border-teal/20 bg-white/70 px-7 py-3.5 text-sm font-bold text-teal transition-colors hover:border-teal/40 hover:bg-white">
                See how it works
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-teal/75">
              <li>No payment card</li>
              <li>No automatic posting</li>
              <li>No invented experience</li>
            </ul>

            <dl className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5 border-t border-teal/12 pt-7 sm:gap-x-10">
              {[
                { value: "1,000+", label: "Resumes checked with the free ATS tool" },
                { value: "3", label: "Career surfaces shaped from one fact" },
                { value: "0", label: "Achievements ever invented" },
              ].map((stat) => (
                <div key={stat.label} className="min-w-[7rem]">
                  <dd className="font-cormorant text-4xl font-semibold leading-none tracking-tight text-gold-700 tabular-nums sm:text-[2.75rem]">
                    {stat.value}
                  </dd>
                  <dt className="mt-2 max-w-[15ch] text-xs font-semibold leading-5 text-teal/70">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <CareerSignalMap />
        </div>
      </section>

      <section className="border-y border-teal/10 bg-teal px-6 py-9 text-white">
        <div className="mx-auto grid max-w-[1200px] gap-6 md:grid-cols-3 md:divide-x md:divide-white/15">
          {[
            ["Start useful", "Use the free ATS checker before creating an account."],
            ["Stay consistent", "Keep LinkedIn, resumes, and target roles tied to the same facts."],
            ["Keep control", "Review the language and approve every action yourself."],
          ].map(([title, copy]) => (
            <div key={title} className="md:px-8 first:md:pl-0 last:md:pr-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-200">{title}</p>
              <p className="mt-2 text-sm leading-6 text-white/78">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="bg-[#f7f3ea] px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">The operating loop</p>
              <h2 className="t-h2 mt-4 max-w-md text-teal">One truth. Every professional surface.</h2>
              <p className="t-lead mt-5 max-w-lg text-zinc-600">
                Generic AI starts with a prompt. Qalam starts with the work you actually did and carries that evidence through each output.
              </p>
            </div>

            <ol className="border-l border-teal/20">
              {workflow.map((step) => (
                <li key={step.number} className="relative border-b border-zinc-200 py-8 pl-9 first:pt-0 last:border-0 last:pb-0 sm:pl-14">
                  <span className="absolute -left-5 top-7 flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-[#f7f3ea] font-cormorant text-xl font-semibold italic text-gold-700 first:top-0">
                    {step.number}
                  </span>
                  <h3 className="text-2xl font-bold tracking-tight text-zinc-900">{step.title}</h3>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Inside Qalam</p>
              <h2 className="t-h2 mt-4 text-teal">See the working product before you sign up.</h2>
            </div>
            <div>
              <p className="t-lead text-zinc-600">These captures come from Qalam&apos;s interactive demo. The interface is real and every example is clearly labelled demo or sample data.</p>
              <Link href="/demo" className="mt-5 inline-flex min-h-11 items-center font-bold text-teal underline decoration-gold decoration-2 underline-offset-4">
                Open the interactive demo
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {productScreens.map((screen, index) => (
              <figure key={screen.src} className={`overflow-hidden rounded-2xl border border-zinc-200 bg-[#f7f3ea] shadow-[0_18px_50px_rgba(13,74,69,0.08)] ${index === 0 ? "lg:col-span-2" : ""}`}>
                <Image
                  src={screen.src}
                  alt={screen.alt}
                  width={1440}
                  height={1050}
                  sizes={index === 0 ? "(max-width: 1200px) 100vw, 1200px" : "(max-width: 1024px) 100vw, 600px"}
                  className="h-auto w-full border-b border-zinc-200"
                />
                <figcaption className="p-6">
                  <p className="text-lg font-bold text-zinc-900">{screen.title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{screen.copy}</p>
                  <p className="mt-3 t-eyebrow text-gold-700">Interactive demo with sample data</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="free-resume-check" className="bg-white px-6 py-24 sm:py-28">
        <div className="mx-auto grid max-w-[1200px] overflow-hidden rounded-[2rem] border border-teal/12 bg-[#e8f0eb] shadow-[0_24px_70px_rgba(13,74,69,0.09)] lg:grid-cols-[0.78fr_1.22fr]">
          <div className="flex flex-col justify-center p-7 sm:p-12">
            {/* Framed as a recurring habit rather than a one-time trial.
                Applying is the cue this audience already repeats, often weekly
                during a search, so attaching the check to that moment is what
                turns a single visit into a returning one - and it is the form
                the recommendation takes when someone passes it on. */}
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Before you hit apply</p>
            <h2 className="t-h2 mt-4 text-teal">Run it once for every job you apply to.</h2>
            <p className="t-body mt-5 text-zinc-600">
              A resume that cleared one screen can still fail the next, because the next job asks for different evidence. Paste or upload for an immediate structural read. The homepage check is intentionally limited. Open the full checker for the complete review.
            </p>
            <TrackedHomepageLink
              href="/free-tools/ats-resume-checker"
              event="resume_check_start"
              parameters={{ placement: "homepage_checker", method: "full_checker_link" }}
              className="mt-6 inline-flex min-h-11 items-center self-start font-bold text-teal underline decoration-gold decoration-2 underline-offset-4"
            >
              Open the full free checker
            </TrackedHomepageLink>
          </div>
          <div className="qlx bg-[#123f3b] p-4 sm:p-8 lg:p-10">
            <HeroChecker />
          </div>
        </div>
      </section>

      <section className="qlx relative overflow-hidden bg-[#102f2d] px-6 py-24 text-white sm:py-28" data-nav-ground="dark">
        <div className="qlx-grain" aria-hidden />
        <div className="relative mx-auto max-w-[1200px]">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">The refusal</p>
              <h2 className="t-h2 mt-4 max-w-lg text-white">
                Every other AI tool will write you a career you never had.
              </h2>
              <p className="t-lead mt-5 max-w-lg text-white/65">
                Qalam will not. Ask it for an achievement you cannot defend and it gives you back the one you can. That single refusal is what makes the rest of it worth using, because a resume only helps you until the interview asks you to prove it.
              </p>
            </div>
            <div className="divide-y divide-white/12 border-y border-white/12">
              {proofRules.map((rule) => (
                <div key={rule.label} className="grid gap-3 py-7 sm:grid-cols-[120px_1fr] sm:gap-8">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-200">{rule.label}</p>
                  <div>
                    <h3 className="text-xl font-bold text-white">{rule.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{rule.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f3ea] px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Career Vault</p>
            <h2 className="t-h2 mt-4 text-teal">The record behind the result.</h2>
            <p className="t-lead mt-5 text-zinc-600">
              Store the roles, achievements, resumes, applications, and writing examples that make your professional story defensible over time.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-12">
            <div className="panel-raised p-7 md:col-span-5 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">Evidence record</p>
              <blockquote className="mt-5 font-cormorant text-3xl font-semibold leading-tight text-zinc-900">
                “Reduced project review time by 61% while keeping clear owners for every action.”
              </blockquote>
              <p className="mt-6 text-xs leading-5 text-zinc-500">Source, context, metric, and your approval stay attached to the record.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 md:col-span-7">
              {[
                ["Resume variant", "Adapt the evidence to a specific job description without changing the underlying fact."],
                ["LinkedIn draft", "Turn the same lesson into a useful point of view in your chosen voice profile."],
                ["Application trail", "Track where the evidence was used and what happened next."],
              ].map(([title, copy], index) => (
                <div key={title} className={`panel-raised p-7 ${index === 2 ? "sm:col-span-2" : ""}`}>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-gold-700">0{index + 1}</p>
                  <h3 className="mt-3 text-lg font-bold text-zinc-900">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white px-6 py-24 sm:py-28">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">The part that keeps you going</p>
            <h2 className="t-h2 mt-4 text-teal">Career momentum you can actually feel.</h2>
            <p className="t-lead mt-5 max-w-lg text-zinc-600">
              Qalam scores real progress: proof captured, profile depth, visibility, pipeline, and showing up. One clear number, a weekly streak, and the single next move that lifts it. Small, honest wins that compound.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                ["A score you can move", "Every documented achievement and published post nudges it up. No vanity metrics."],
                ["A streak worth keeping", "Show up, capture one proof, keep the week alive. Consistency is the whole game."],
                ["One next action", "Never a blank page. Qalam always names the highest-leverage thing to do today."],
              ].map(([title, copy]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                  <span className="text-sm leading-6 text-zinc-600">
                    <span className="font-bold text-zinc-900">{title}. </span>
                    {copy}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <CareerMomentumPreview />
        </div>
      </section>

      <section id="pricing" className="border-y border-zinc-200 bg-white px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Plans</p>
            <h2 className="t-h2 mt-4 text-teal">Start free. Pay when the workflow earns its place.</h2>
            <p className="t-lead mt-5 text-zinc-600">Three clear levels for exploring, publishing consistently, or building a deeper career operating system.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {homepagePlans.map((plan) => {
              const highlighted = plan.plan === "Solo"
              const price = plan.plan === "Free" ? "PKR 0" : formatPkr(plan.quarterlyPkr)
              const effective = plan.plan === "Free" ? "No payment card" : `${formatPkr(getQuarterlyMonthlyEquivalent(plan.quarterlyPkr))}/month effective`
              return (
                <article key={plan.plan} className={`relative flex flex-col rounded-2xl border p-7 sm:p-8 ${highlighted ? "border-teal bg-teal text-white shadow-[0_20px_50px_rgba(13,74,69,0.2)]" : "border-zinc-200 bg-white text-zinc-900"}`}>
                  {highlighted && <span className="absolute right-5 top-5 rounded-full bg-gold px-3 py-1 t-eyebrow text-teal-900">Most popular</span>}
                  <p className={`text-xs font-bold uppercase tracking-[0.17em] ${highlighted ? "text-gold-200" : "text-teal"}`}>{plan.plan}</p>
                  <div className="mt-5 flex items-center gap-2.5">
                    <p className="text-4xl font-extrabold tracking-tight">{price}</p>
                    {plan.plan !== "Free" && (
                      <span className={`rounded-full px-2.5 py-1 t-eyebrow ${highlighted ? "bg-gold text-teal-900" : "bg-gold-100 text-gold-700"}`}>
                        {quarterlyFraming}
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 text-xs ${highlighted ? "text-white/65" : "text-zinc-500"}`}>{plan.plan === "Free" ? effective : `Billed quarterly. ${effective}.`}</p>
                  {plan.plan !== "Free" && plan.monthlyPkr ? (
                    <p className={`mt-1 text-xs ${highlighted ? "text-white/55" : "text-zinc-400"}`}>
                      <span className="line-through">{formatPkr(plan.monthlyPkr * 3)}</span> if billed monthly.
                    </p>
                  ) : null}
                  <p className={`mt-5 text-sm leading-6 ${highlighted ? "text-white/75" : "text-zinc-600"}`}>{plan.description}</p>
                  <ul className="my-7 flex flex-1 flex-col gap-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm leading-6">
                        <CheckIcon className={`mt-1 h-4 w-4 shrink-0 ${highlighted ? "text-gold-200" : "text-teal"}`} />
                        <span className={highlighted ? "text-white/85" : "text-zinc-700"}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href} className={`inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-bold transition-colors ${highlighted ? "bg-gold text-teal-900 hover:bg-gold-600" : "border border-teal/25 bg-teal/5 text-teal hover:bg-teal hover:text-white"}`}>
                    {plan.cta}
                  </Link>
                </article>
              )
            })}
          </div>
          <Link href="/pricing" className="mt-7 inline-flex min-h-11 items-center font-bold text-teal underline decoration-gold decoration-2 underline-offset-4">Compare every limit and feature</Link>
        </div>
      </section>

      <section id="faq" className="bg-[#f7f3ea] px-6 py-24 sm:py-28">
        <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[0.62fr_1.38fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Questions</p>
            <h2 className="t-h2 mt-4 text-teal">What a careful buyer should ask.</h2>
            <p className="t-body mt-5 text-zinc-600">
              Need a direct answer? <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center font-bold text-teal underline underline-offset-4">Email us</a>.
            </p>
          </div>
          <FaqAccordion items={focusedFaq} />
        </div>
      </section>

      <section className="qlx relative overflow-hidden bg-[#102f2d] px-6 py-20 text-white" data-nav-ground="dark">
        <div className="qlx-grain" aria-hidden />
        <div className="relative mx-auto flex max-w-[1000px] flex-col items-center text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">Your experience already happened</p>
          <h2 className="mt-5 max-w-4xl text-[clamp(2.4rem,5vw,4.7rem)] font-extrabold leading-[1] tracking-[-0.045em] text-white">Make it easier to see, trust, and remember.</h2>
          <TrackedHomepageLink
            href={resolvePublicHref("/signup")}
            event="homepage_primary_cta_click"
            parameters={{ placement: "final_cta" }}
            className="qlx-champagne-btn mt-8 inline-flex min-h-12 items-center justify-center rounded-xl px-8 text-sm font-bold"
          >
            Build your proof
          </TrackedHomepageLink>
          <p className="mt-4 text-xs text-white/50">Free to start. No payment card required.</p>
        </div>
      </section>
    </>
  )
}
