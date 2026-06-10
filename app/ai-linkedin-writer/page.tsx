import type { Metadata } from "next"
import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { CheckIcon } from "@/components/ui/qalam-icons"
import { SITE_NAME, absoluteUrl, buildBreadcrumbSchema, buildFaqSchema, buildHowToSchema, buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "AI LinkedIn Writer — Create Posts in Your Voice with Qalam",
  description:
    "The best AI LinkedIn writer that learns your voice. Generate posts, hooks, and carousels that sound like you — not generic AI. Free hook generator included. Start free.",
  path: "/ai-linkedin-writer",
  keywords: [
    "AI LinkedIn writer",
    "LinkedIn AI writer",
    "AI writer for LinkedIn",
    "LinkedIn post generator",
    "AI LinkedIn posts",
    "LinkedIn content generator",
    "LinkedIn writing assistant",
    "AI ghostwriter LinkedIn",
    "best AI for LinkedIn",
    "LinkedIn AI tool",
    "Qalam",
    "Qalam AI writer",
  ],
})

const pageUrl = absoluteUrl("/ai-linkedin-writer")

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: "Qalam", path: "/" },
  { name: "AI LinkedIn Writer", path: "/ai-linkedin-writer" },
])

const howToSchema = buildHowToSchema({
  name: "How to write LinkedIn posts with AI using Qalam",
  description:
    "A 4-step workflow for using an AI LinkedIn writer that learns your voice and creates posts that sound authentically like you.",
  steps: [
    {
      name: "Set up your voice profile",
      text: "Paste 5–10 of your best LinkedIn posts into Qalam. The AI analyzes your tone, vocabulary, sentence structure, and hook patterns to build a voice profile unique to you.",
    },
    {
      name: "Enter your topic or idea",
      text: "Type a raw idea, insight, or experience you want to share. No need for perfect prompts — Qalam works from your voice profile, not generic templates.",
    },
    {
      name: "Generate and refine your draft",
      text: "Qalam produces a draft in your voice. Edit, revise, or regenerate sections. Every edit trains the system further — it gets closer to you with each post.",
    },
    {
      name: "Schedule or publish directly",
      text: "Move the final draft to your content calendar or publish directly to LinkedIn. The post stays in your archive for future reference and reuse.",
    },
  ],
})

const faqSchema = buildFaqSchema([
  {
    q: "What is the best AI writer for LinkedIn?",
    a: "Qalam is the best AI writer for LinkedIn because it learns your voice from real posts, not generic templates. Unlike ChatGPT or Jasper, Qalam remembers your edits, approved drafts, and hook patterns — so every new post sounds more like you than the last.",
  },
  {
    q: "How does an AI LinkedIn writer work?",
    a: "An AI LinkedIn writer uses large language models trained on professional content to generate post drafts. Qalam goes further by building a voice profile from your actual writing, so outputs match your tone, vocabulary, and structure instead of sounding like generic AI.",
  },
  {
    q: "Can AI write LinkedIn posts that sound like me?",
    a: "Yes — if the AI has voice memory. Qalam trains on your real LinkedIn posts and learns from every edit you make. After 10–20 posts, the drafts are nearly indistinguishable from your natural writing style.",
  },
  {
    q: "Is Qalam better than ChatGPT for LinkedIn writing?",
    a: "ChatGPT resets every session and has no memory of your voice. Qalam keeps your voice profile, draft history, hook archive, and publishing context in one workspace. For serious LinkedIn publishing, Qalam is the stronger system.",
  },
  {
    q: "Does Qalam work for founders, consultants, and agencies?",
    a: "Yes. Founders use Qalam for thought leadership. Consultants build authority archives. Agencies run multi-client workflows with isolated voice profiles and approval flows. Each use case benefits from voice memory and archive continuity.",
  },
  {
    q: "Is there a free AI LinkedIn writer?",
    a: "Qalam offers a free plan with 10 drafts per month, voice profile setup, and access to free tools like the LinkedIn Hook Generator and Headline Analyzer. No credit card required.",
  },
])

const FEATURES = [
  {
    title: "Voice Memory",
    desc: "Trains on your real posts so every draft sounds like you — not a generic AI template.",
  },
  {
    title: "Hook Generator",
    desc: "Generate 10 proven opening lines for any topic. Save the best structures for reuse.",
  },
  {
    title: "Content Archive",
    desc: "Every draft, version, and approved post stays in your workspace. Build a compounding asset.",
  },
  {
    title: "Post Scheduler",
    desc: "Plan your publishing calendar without losing the connection between draft, timing, and review.",
  },
  {
    title: "Carousel Builder",
    desc: "Turn your best posts into LinkedIn carousel assets in one click.",
  },
  {
    title: "Agency Workspaces",
    desc: "Run multiple client accounts with isolated voice profiles and approval workflows.",
  },
]

const COMPARISONS = [
  {
    feature: "Voice memory that learns from your posts",
    qalam: true,
    chatgpt: false,
    jasper: false,
  },
  {
    feature: "LinkedIn-specific hook structures",
    qalam: true,
    chatgpt: false,
    jasper: false,
  },
  {
    feature: "Draft archive and version history",
    qalam: true,
    chatgpt: false,
    jasper: true,
  },
  {
    feature: "Direct LinkedIn publishing",
    qalam: true,
    chatgpt: false,
    jasper: false,
  },
  {
    feature: "Free plan with real features",
    qalam: true,
    chatgpt: true,
    jasper: false,
  },
  {
    feature: "PKR pricing for Pakistan market",
    qalam: true,
    chatgpt: false,
    jasper: false,
  },
]

const TESTIMONIALS = [
  {
    quote:
      "I tried ChatGPT, Jasper, and Copy.ai for my LinkedIn content. They all sounded like someone else. Qalam was the first tool where my posts actually sounded like me.",
    author: "Founder, SaaS Startup",
    role: "Using Qalam for 3 months",
  },
  {
    quote:
      "The hook generator alone saved me 30 minutes per post. But the voice memory is what keeps me paying — month three is easier than month one.",
    author: "Marketing Consultant",
    role: "Solo plan subscriber",
  },
  {
    quote:
      "We run LinkedIn for 8 clients. Qalam's agency workspaces keep every voice separate. No more accidentally posting client A's tone on client B's account.",
    author: "Content Agency Owner",
    role: "Agency plan subscriber",
  },
]

export default function AiLinkedInWriterPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen bg-zinc-50">
        {/* Hero */}
        <section className="border-b border-zinc-100 bg-white px-6 py-24">
          <div className="mx-auto max-w-[1200px]">
            <FadeUp>
              <div className="mx-auto max-w-[860px] text-center">
                <span className="chip mb-6 inline-flex border-teal/30 bg-teal-50 text-teal">AI LinkedIn Writer</span>
                <h1 className="mb-6 text-5xl font-extrabold leading-tight text-zinc-900 sm:text-6xl lg:text-7xl">
                  The AI writer that learns{" "}
                  <span className="text-gold gold-underline">your LinkedIn voice</span>
                </h1>
                <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-zinc-600">
                  Most AI writers generate generic posts. <strong className="text-zinc-900">Qalam</strong> learns your
                  tone, vocabulary, and hook patterns from your real posts — so every draft sounds like{" "}
                  <em>you</em>, not a chatbot.
                </p>
                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal px-8 py-4 text-lg font-bold text-white shadow-[0_4px_24px_rgba(13,74,69,0.35)] transition-colors hover:bg-teal-600"
                  >
                    Start free — 10 drafts, no card
                  </Link>
                  <Link
                    href="/free-tools/hook-generator"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 px-8 py-4 text-lg font-semibold text-zinc-700 transition-colors hover:border-teal/30 hover:bg-teal/5"
                  >
                    Try the free hook generator
                  </Link>
                </div>
                <p className="mt-5 text-sm text-zinc-400">
                  No credit card. No expiry. Your content stays private.
                </p>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* What is an AI LinkedIn Writer */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-[860px]">
            <FadeUp>
              <h2 className="mb-6 text-4xl font-bold text-zinc-900">What is an AI LinkedIn writer?</h2>
              <div className="space-y-4 text-lg leading-relaxed text-zinc-600">
                <p>
                  An <strong>AI LinkedIn writer</strong> is a software tool that uses artificial intelligence to help
                  you create LinkedIn posts, hooks, headlines, and carousels. Most AI writers treat LinkedIn like any
                  other platform — they generate generic professional content that could belong to anyone.
                </p>
                <p>
                  <strong>Qalam is different.</strong> It is an AI writing system built specifically for LinkedIn, with a
                  core feature called <em>voice memory</em>. Instead of starting from scratch every session, Qalam
                  learns your writing style from your real posts and gets closer to your voice with every draft you
                  approve.
                </p>
                <p>
                  The result? Posts that sound like <em>you</em> — with your vocabulary, your rhythm, your perspective —
                  created in minutes instead of hours.
                </p>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-zinc-100 bg-white px-6 py-20">
          <div className="mx-auto max-w-[1200px]">
            <FadeUp className="mb-14 text-center">
              <h2 className="mb-4 text-4xl font-bold text-zinc-900">
                Why Qalam is the best AI writer for LinkedIn
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-zinc-600">
                Not just another AI content tool. A system that compounds value the longer you use it.
              </p>
            </FadeUp>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, i) => (
                <FadeUp key={feature.title} delay={i * 0.06}>
                  <div className="h-full rounded-2xl border border-zinc-200 bg-zinc-50 p-7 shadow-sm">
                    <h3 className="mb-3 text-lg font-bold text-zinc-900">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-zinc-600">{feature.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-[1200px]">
            <FadeUp className="mb-14 text-center">
              <h2 className="mb-4 text-4xl font-bold text-zinc-900">How Qalam works in 4 steps</h2>
              <p className="mx-auto max-w-2xl text-lg text-zinc-600">
                From first draft to trained voice — a workflow designed for serious LinkedIn publishers.
              </p>
            </FadeUp>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Set up your voice profile",
                  desc: "Paste 5–10 of your best LinkedIn posts. Qalam extracts your tone, vocabulary, and structure.",
                },
                {
                  step: "02",
                  title: "Enter your topic",
                  desc: "Type a raw idea or insight. No perfect prompts needed — Qalam works from your voice profile.",
                },
                {
                  step: "03",
                  title: "Generate and refine",
                  desc: "Get a draft in your voice. Edit and approve — every change trains the system further.",
                },
                {
                  step: "04",
                  title: "Schedule or publish",
                  desc: "Move to your calendar or publish directly. The post stays in your archive for reuse.",
                },
              ].map((item, i) => (
                <FadeUp key={item.step} delay={i * 0.1}>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-teal/20 bg-white text-xl font-bold text-teal">
                      {item.step}
                    </div>
                    <h3 className="mb-3 text-lg font-bold text-zinc-900">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-zinc-600">{item.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="border-y border-zinc-100 bg-white px-6 py-20">
          <div className="mx-auto max-w-[900px]">
            <FadeUp className="mb-14 text-center">
              <h2 className="mb-4 text-4xl font-bold text-zinc-900">Qalam vs other AI writers</h2>
              <p className="text-lg text-zinc-600">
                See why Qalam wins for LinkedIn-specific publishing workflows.
              </p>
            </FadeUp>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-100">
                    <th className="px-6 py-4 font-semibold text-zinc-700">Feature</th>
                    <th className="px-6 py-4 text-center font-bold text-teal">Qalam</th>
                    <th className="px-6 py-4 text-center font-semibold text-zinc-500">ChatGPT</th>
                    <th className="px-6 py-4 text-center font-semibold text-zinc-500">Jasper</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISONS.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                      <td className="px-6 py-4 font-medium text-zinc-700">{row.feature}</td>
                      <td className="px-6 py-4 text-center">
                        {row.qalam ? (
                          <CheckIcon className="mx-auto h-5 w-5 text-teal" />
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.chatgpt ? (
                          <CheckIcon className="mx-auto h-5 w-5 text-zinc-400" />
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {row.jasper ? (
                          <CheckIcon className="mx-auto h-5 w-5 text-zinc-400" />
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-[1200px]">
            <FadeUp className="mb-14 text-center">
              <h2 className="mb-4 text-4xl font-bold text-zinc-900">What users say about Qalam</h2>
              <p className="text-lg text-zinc-600">Real feedback from LinkedIn professionals using Qalam daily.</p>
            </FadeUp>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <FadeUp key={i} delay={i * 0.08}>
                  <div className="h-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                    <p className="mb-6 text-sm italic leading-relaxed text-zinc-600">&ldquo;{t.quote}&rdquo;</p>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{t.author}</p>
                      <p className="text-xs text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* Free Tools CTA */}
        <section className="border-y border-zinc-100 bg-white px-6 py-20">
          <div className="mx-auto max-w-[860px] text-center">
            <FadeUp>
              <h2 className="mb-4 text-4xl font-bold text-zinc-900">Try Qalam free tools first</h2>
              <p className="mb-10 text-lg text-zinc-600">
                No account required. See the quality before you commit to anything.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: "Hook Generator", desc: "10 opening lines for any topic", href: "/free-tools/hook-generator" },
                  { name: "Headline Analyzer", desc: "Score your profile headline", href: "/free-tools/headline-analyzer" },
                  { name: "Profile Optimizer", desc: "Improve your LinkedIn profile", href: "/free-tools/profile-optimizer" },
                  { name: "Viral Checker", desc: "Analyze why posts perform", href: "/free-tools/viral-checker" },
                  { name: "Carousel Builder", desc: "Turn posts into carousels", href: "/free-tools/carousel-builder" },
                  { name: "Engagement Predictor", desc: "Score before you post", href: "/free-tools/engagement-predictor" },
                ].map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="group rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-left shadow-sm transition-all hover:border-teal/40 hover:shadow"
                  >
                    <p className="text-sm font-bold text-zinc-900 group-hover:text-teal">{tool.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{tool.desc}</p>
                  </Link>
                ))}
              </div>
            </FadeUp>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-[860px]">
            <FadeUp className="mb-14 text-center">
              <h2 className="mb-4 text-4xl font-bold text-zinc-900">Frequently asked questions</h2>
              <p className="text-lg text-zinc-600">Everything you need to know about AI LinkedIn writing with Qalam.</p>
            </FadeUp>
            <div className="space-y-4">
              {[
                {
                  q: "What is the best AI writer for LinkedIn?",
                  a: "Qalam is the best AI writer for LinkedIn because it learns your voice from real posts, not generic templates. Unlike ChatGPT or Jasper, Qalam remembers your edits, approved drafts, and hook patterns — so every new post sounds more like you than the last.",
                },
                {
                  q: "How does an AI LinkedIn writer work?",
                  a: "An AI LinkedIn writer uses large language models trained on professional content to generate post drafts. Qalam goes further by building a voice profile from your actual writing, so outputs match your tone, vocabulary, and structure instead of sounding like generic AI.",
                },
                {
                  q: "Can AI write LinkedIn posts that sound like me?",
                  a: "Yes — if the AI has voice memory. Qalam trains on your real LinkedIn posts and learns from every edit you make. After 10–20 posts, the drafts are nearly indistinguishable from your natural writing style.",
                },
                {
                  q: "Is Qalam better than ChatGPT for LinkedIn writing?",
                  a: "ChatGPT resets every session and has no memory of your voice. Qalam keeps your voice profile, draft history, hook archive, and publishing context in one workspace. For serious LinkedIn publishing, Qalam is the stronger system.",
                },
                {
                  q: "Does Qalam work for founders, consultants, and agencies?",
                  a: "Yes. Founders use Qalam for thought leadership. Consultants build authority archives. Agencies run multi-client workflows with isolated voice profiles and approval flows. Each use case benefits from voice memory and archive continuity.",
                },
                {
                  q: "Is there a free AI LinkedIn writer?",
                  a: "Qalam offers a free plan with 10 drafts per month, voice profile setup, and access to free tools like the LinkedIn Hook Generator and Headline Analyzer. No credit card required.",
                },
              ].map((faq, i) => (
                <FadeUp key={i} delay={i * 0.04}>
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-2 text-lg font-bold text-zinc-900">{faq.q}</h3>
                    <p className="text-sm leading-relaxed text-zinc-600">{faq.a}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-teal px-6 py-24">
          <div className="mx-auto max-w-[720px] text-center">
            <FadeUp>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                Stop sounding like everyone else on LinkedIn.
              </h2>
              <p className="mb-10 text-xl leading-relaxed text-white/80">
                Qalam is the AI writer that learns <em>your</em> voice. Start free. No card. No expiry.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-8 py-4 text-lg font-bold text-white shadow-lg transition-colors hover:bg-gold-600"
                >
                  Start free — 10 drafts
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Compare plans
                </Link>
              </div>
              <p className="mt-5 text-sm text-white/60">
                Your drafts are private. No one at Qalam reads your content. Ever.
              </p>
            </FadeUp>
          </div>
        </section>

        {/* Internal Links */}
        <section className="border-t border-zinc-100 bg-white px-6 py-16">
          <div className="mx-auto max-w-[1200px]">
            <h3 className="mb-6 text-sm font-semibold uppercase tracking-widest text-zinc-500">
              Related resources
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/product/post-writer" className="text-sm text-teal hover:underline">
                AI Post Writer →
              </Link>
              <Link href="/product/voice-profile" className="text-sm text-teal hover:underline">
                Voice Profile →
              </Link>
              <Link href="/use-cases/founders" className="text-sm text-teal hover:underline">
                LinkedIn for Founders →
              </Link>
              <Link href="/use-cases/consultants" className="text-sm text-teal hover:underline">
                LinkedIn for Consultants →
              </Link>
              <Link href="/blog/train-an-ai-writing-system-without-losing-your-voice" className="text-sm text-teal hover:underline">
                Train AI on Your Voice →
              </Link>
              <Link href="/blog/the-three-habits-that-separate-linkedin-authority-from-linkedin-noise" className="text-sm text-teal hover:underline">
                LinkedIn Authority Habits →
              </Link>
              <Link href="/pricing" className="text-sm text-teal hover:underline">
                Pricing →
              </Link>
              <Link href="/free-tools" className="text-sm text-teal hover:underline">
                All Free Tools →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
