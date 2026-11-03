import type { Metadata } from "next"
import Link from "next/link"
import { DISCOVERY_UPDATED_AT } from "@/lib/marketing-discovery"
import { APP_URL, SITE_NAME, absoluteUrl, buildBreadcrumbSchema, buildFaqSchema, buildPageMetadata } from "@/lib/seo"

const title = "Qalam Features: Write LinkedIn Posts in Your Own Voice"
const description = "Qalam asks what happened before it writes, learns from your edits, scores each draft, and turns a post into a 4:5 carousel. See each step."

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/features",
  keywords: [
    "AI LinkedIn writer",
    "LinkedIn post writer in your voice",
    "LinkedIn carousel maker",
    "LinkedIn post scheduler",
    "LinkedIn hook generator",
    "LinkedIn content score",
  ],
})

const steps = [
  {
    name: "It asks first",
    copy: "Type a topic and Qalam asks up to three short questions: a moment you lived through, a number that is really yours, and what people in your field get wrong. The draft is built on your answers.",
  },
  {
    name: "You pick the opening",
    copy: "Five opening lines, each from a different angle. Choose one and it stays word for word as the first line of the post.",
  },
  {
    name: "It writes the rest in your voice",
    copy: "Qalam has read posts you wrote, so sentence length, spelling, sign-offs and habits come from you. Where it has nothing to go on, it stays plain instead of inventing a personality.",
  },
  {
    name: "It checks the draft",
    copy: "A figure you never gave, a study nobody cited, a story that did not happen: the draft is checked for these and the invented parts are cut before you see them.",
  },
  {
    name: "You edit, then publish or schedule",
    copy: "Change whatever you like. Publish to LinkedIn straight away, or pick a time. Scheduling and publishing start on the Solo plan.",
  },
]

const parts = [
  {
    name: "Voice that trains on your own posts",
    copy: "Paste three to five posts you wrote. Qalam measures how long you write, whether you use hashtags or emoji, how you close, and which spelling you use. This works on every plan, free included.",
  },
  {
    name: "Learning from your edits",
    copy: "When you save a post, Qalam keeps the version it wrote next to the version you kept. Your two most recent real edits go back into the next draft, so you fix less each time.",
  },
  {
    name: "A content score you can read",
    copy: "Seven named checks, from hook to specificity, with the reason behind each number. It is Qalam's own diagnostic, not a LinkedIn score, and it does not predict reach.",
  },
  {
    name: "Post to carousel",
    copy: "Turn a finished post into slides that use only what the post says. Slides are cut at 4:5, the portrait size LinkedIn shows best, with your accent colour and name in the footer. The PDF download is on the Pro plan, and you upload it to LinkedIn as a document.",
  },
  {
    name: "Hook and call-to-action alternatives",
    copy: "Not sure about an opening or a closing line? Ask for alternatives and swap one in without rewriting the post around it.",
  },
  {
    name: "Comment drafts in your feed",
    copy: "The Qalam Chrome extension turns a post you are reading into three comment drafts. You pick one, edit it and post it yourself. Nothing is posted for you.",
  },
]

const notDone = [
  "It does not invent results, clients or numbers. If you did not give it one, the post works without it.",
  "It does not promise reach, impressions or followers, and it does not post anything you have not approved.",
  "It does not score your post against LinkedIn's algorithm. Nobody outside LinkedIn can.",
]

const faqs = [
  {
    q: "Why does it ask questions before writing?",
    a: "A topic alone gives any writer, human or not, nothing to say that is yours. Three honest answers give it something true to build on. You can skip the questions and go straight to hooks.",
  },
  {
    q: "Do the questions use up my drafts?",
    a: "No. A draft is counted when hooks or a post are generated, not when Qalam asks you something.",
  },
  {
    q: "Does the voice training work on the free plan?",
    a: "Yes. Paste three to five posts you wrote yourself, run the analysis, and check the result before you save it. Every plan gets the same voice training.",
  },
  {
    q: "Can I export a carousel?",
    a: "Yes, on the Pro plan, as a 4:5 PDF you upload to LinkedIn as a document. Every plan can build and edit the slides. The PDF uses standard fonts, so it covers Latin-script text. For other scripts, copy the slide text into your design tool.",
  },
  {
    q: "Are Qalam scores official LinkedIn scores?",
    a: "No. They are independent Qalam diagnostics based on the text you supply.",
  },
  {
    q: "What does the free plan include?",
    a: "A limited number of AI posts, hook sets and carousels each month, plus the voice profile. Exact limits are on the pricing page and inside the app.",
  },
]

const pageSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: title,
  description,
  url: absoluteUrl("/features"),
  dateModified: DISCOVERY_UPDATED_AT,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: parts.map((part, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: part.name,
      description: part.copy,
    })),
  },
  about: { "@type": "SoftwareApplication", name: SITE_NAME, applicationCategory: "BusinessApplication" },
}

export default function FeaturesPage() {
  return (
    <main className="overflow-x-clip bg-[#fafaf8] pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbSchema([{ name: "Qalam", path: "/" }, { name: "Features", path: "/features" }])).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqSchema(faqs)).replace(/</g, "\\u003c") }} />

      <section className="border-b border-zinc-200 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="t-eyebrow text-teal">Inside Qalam</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-none tracking-tight text-zinc-900 sm:text-6xl">A LinkedIn writer that asks before it writes.</h1>
          </div>
          <div className="border-l-2 border-gold pl-5 sm:pl-7">
            <p className="max-w-[62ch] text-base leading-8 text-zinc-600 sm:text-lg">Most AI writers take a topic and produce something that could belong to anyone. Qalam asks what happened, learns how you write, and checks the draft for things you never said.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`${APP_URL}/signup`} className="press rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white">Write a post free</Link>
              <Link href="/pricing" className="press rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700">See plans</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="t-eyebrow text-gold-700">How a post gets written</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-zinc-900">Five steps. About ten minutes.</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-600">The slow part is your answers. Everything after that is quick, and you decide at every step.</p>
            </div>
            <ol className="divide-y divide-zinc-200 border-y border-zinc-200">
              {steps.map((step, index) => (
                <li key={step.name} className="grid gap-3 py-5 sm:grid-cols-[3rem_13rem_1fr] sm:items-start">
                  <span className="text-xs font-bold text-gold-700">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="font-bold text-zinc-900">{step.name}</h3>
                  <p className="text-sm leading-6 text-zinc-600">{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1100px]">
          <p className="t-eyebrow text-teal">What is in it</p>
          <h2 className="mt-4 max-w-[22ch] text-4xl font-extrabold leading-tight tracking-tight text-zinc-900">The parts that make a draft sound like you.</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {parts.map((part) => (
              <article key={part.name} className="border-t border-zinc-200 pt-5">
                <h3 className="font-bold text-zinc-900">{part.name}</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-600">{part.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[900px]">
          <p className="t-eyebrow text-gold-700">What it will not do</p>
          <ul className="mt-5 space-y-4">
            {notDone.map((line) => <li key={line} className="border-l-2 border-gold pl-5 text-base leading-7 text-zinc-700">{line}</li>)}
          </ul>
        </div>
      </section>

      <section className="border-t border-zinc-200 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[900px]">
          <p className="t-eyebrow text-teal">Questions</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900">Before you try it</h2>
          <div className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200">
            {faqs.map((faq) => <article key={faq.q} className="py-6"><h3 className="font-bold text-zinc-900">{faq.q}</h3><p className="mt-2 text-sm leading-7 text-zinc-600">{faq.a}</p></article>)}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#073f3b] p-7 text-white sm:flex-row sm:items-center">
            <div><h2 className="text-2xl font-extrabold">Write one post and judge it yourself.</h2><p className="mt-2 text-sm text-white/65">Free account. Answer three questions and see the draft.</p></div>
            <div className="flex flex-wrap gap-3"><Link href={`${APP_URL}/signup`} className="press shrink-0 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-teal-900">Create a free account</Link><Link href="/free-tools/hook-generator" className="press shrink-0 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white">Try the hook generator</Link></div>
          </div>
        </div>
      </section>
    </main>
  )
}
