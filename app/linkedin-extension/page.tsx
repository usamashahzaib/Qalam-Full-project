import Link from "next/link"
import type { Metadata } from "next"
import { buildBreadcrumbSchema, buildFaqSchema, buildPageMetadata, absoluteUrl } from "@/lib/seo"

const faqs = [
  { q: "What does the Qalam LinkedIn extension do?", a: "It creates three selectable comment variations from a LinkedIn post you choose. A selected variation is inserted into an open comment box when available, or copied for you to paste." },
  { q: "Does Qalam post comments automatically?", a: "No. Qalam never submits a LinkedIn comment or post for you. You review every suggestion and choose whether to publish it." },
  { q: "How does the extension use my plan?", a: "Every generated set counts against the same smart comment allowance shown in your Qalam plan. Free includes 10 per month, Solo 50, Pro 150, and Agency 400 during managed onboarding." },
  { q: "Does the extension need my LinkedIn password?", a: "No. The extension does not ask for or store LinkedIn credentials. It uses a short-lived Qalam connection code and only sends visible post text after you start generation." },
]

export const metadata: Metadata = buildPageMetadata({
  title: "Qalam LinkedIn Extension - Thoughtful Comment Assistant",
  description: "Generate three on-voice LinkedIn comment options from the post you choose. Use your Qalam plan allowance without automatic posting.",
  path: "/linkedin-extension",
  tag: "LinkedIn Extension",
  keywords: ["LinkedIn comment generator extension", "LinkedIn Chrome extension", "AI LinkedIn comments", "Qalam LinkedIn extension"],
})

function ProductScene() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-teal/20 bg-[#eef7f5] p-4 shadow-[0_32px_90px_rgba(7,61,55,0.18)] sm:p-7">
      <div className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal to-cyan-600" /><div><p className="text-sm font-bold text-zinc-900">Ayesha Khan</p><p className="text-xs text-zinc-500">Product leader</p></div></div>
          <p className="mt-5 text-sm leading-7 text-zinc-700">The clearest career stories are built from evidence, not adjectives. A good portfolio explains the problem, decision, and measurable outcome.</p>
          <div className="mt-5 flex gap-4 border-t border-zinc-100 pt-4 text-xs font-medium text-zinc-500"><span>Like</span><span>Comment</span><span>Repost</span></div>
          <button className="mt-4 min-h-11 rounded-lg border border-teal/30 bg-teal/5 px-3 text-xs font-bold text-teal">Generate with Qalam</button>
        </div>
        <div className="rounded-2xl bg-[#083f3a] p-5 text-white shadow-xl">
          <p className="text-sm font-bold">Qalam comment assistant</p>
          <p className="mt-2 text-xs leading-5 text-white/70">Choose a style. Qalam creates three options. Nothing posts automatically.</p>
          <div className="mt-4 flex gap-2"><span className="rounded-lg bg-white px-2.5 py-2 text-xs font-semibold text-teal">Insightful</span><span className="rounded-lg bg-white/10 px-2.5 py-2 text-xs">Supportive</span></div>
          <div className="mt-4 rounded-xl bg-white p-3 text-xs leading-5 text-zinc-700">&quot;This is a useful distinction. Evidence makes the work legible, while adjectives only signal intention.&quot;</div>
          <div className="mt-3 rounded-xl border border-white/20 p-3 text-xs leading-5 text-white/85">&quot;A strong portfolio also shows what changed because of the decision, not just what was delivered.&quot;</div>
          <p className="mt-4 t-eyebrow font-semiboldr text-[#a9e4dc]">3 options. You choose.</p>
        </div>
      </div>
    </div>
  )
}

export default function LinkedInExtensionPage() {
  const schemas = [
    buildBreadcrumbSchema([{ name: "Home", path: "/" }, { name: "Qalam LinkedIn Extension", path: "/linkedin-extension" }]),
    buildFaqSchema(faqs),
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Qalam for LinkedIn", applicationCategory: "BusinessApplication", operatingSystem: "Chrome and Chromium desktop browsers", url: absoluteUrl("/linkedin-extension"), description: "A browser extension that creates selectable LinkedIn comment variations using a Qalam plan allowance.", offers: { "@type": "Offer", price: "0", priceCurrency: "PKR" } },
  ]
  return (
    <main className="overflow-hidden bg-[#fbfdfc] pt-20 text-zinc-900">
      {schemas.map((schema, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />)}
      <section className="relative px-6 py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_20%_10%,rgba(183,232,221,0.72),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(255,220,170,0.42),transparent_31%)]" />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div><p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-teal">Qalam for LinkedIn</p><h1 className="max-w-xl text-4xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-6xl">Thoughtful comments, with you in control.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">Turn a visible LinkedIn post into three on-voice comment options. Select one to insert into an open comment box or copy it. Qalam never posts automatically.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="/downloads/qalam-linkedin-extension.zip" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-5 text-sm font-bold text-white shadow-lg shadow-teal/20 transition-colors hover:bg-teal-600">Download extension package</a><Link href="/extension/connect" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-teal/30 bg-white px-5 text-sm font-bold text-teal transition-colors hover:bg-teal/5">Connect Qalam</Link></div><p className="mt-4 text-xs leading-5 text-zinc-500">Desktop Chrome or Chromium only. This beta package is installed manually and is not a Chrome Web Store listing.</p></div>
          <ProductScene />
        </div>
      </section>
      <section className="border-y border-zinc-200 bg-white px-6 py-14"><div className="mx-auto grid max-w-[1100px] gap-8 md:grid-cols-3"><div><p className="text-2xl font-bold text-teal">01</p><h2 className="mt-3 text-lg font-bold">Choose a post</h2><p className="mt-2 text-sm leading-6 text-zinc-600">On LinkedIn, open Qalam only when you want help with a visible post.</p></div><div><p className="text-2xl font-bold text-teal">02</p><h2 className="mt-3 text-lg font-bold">Pick a writing angle</h2><p className="mt-2 text-sm leading-6 text-zinc-600">Choose Insightful, Supportive, or Engaging. Qalam returns three concise alternatives.</p></div><div><p className="text-2xl font-bold text-teal">03</p><h2 className="mt-3 text-lg font-bold">Review before you act</h2><p className="mt-2 text-sm leading-6 text-zinc-600">Insert a selection into an existing comment box or copy it. You decide whether to publish.</p></div></div></section>
      <section className="mx-auto max-w-[1100px] px-6 py-20"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-teal">Plan coverage</p><h2 className="mt-3 text-3xl font-bold tracking-tight">One allowance everywhere</h2><p className="mt-4 text-sm leading-7 text-zinc-600">The extension uses the same smart comment allowance shown in Qalam. Your remaining balance stays consistent across the web app and LinkedIn.</p><Link href="/pricing" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-teal underline underline-offset-4">Compare plans and pricing</Link></div><div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500"><span className="p-4">Plan</span><span className="p-4">Free</span><span className="p-4">Solo</span><span className="p-4">Pro</span></div><div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] text-sm"><span className="border-r border-zinc-100 p-4 font-semibold">Extension</span><span className="p-4">Included</span><span className="p-4">Included</span><span className="p-4">Included</span><span className="border-r border-t border-zinc-100 p-4 font-semibold">Comment sets</span><span className="border-t border-zinc-100 p-4">10/month</span><span className="border-t border-zinc-100 p-4">50/month</span><span className="border-t border-zinc-100 p-4">150/month</span></div><p className="border-t border-zinc-100 p-4 text-xs leading-5 text-zinc-500">Agency managed onboarding includes 400 comment sets per month.</p></div></div></section>
      <section className="bg-[#073f3a] px-6 py-20 text-white"><div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a9e4dc]">Privacy and control</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Designed for assisted writing, not automation.</h2></div><ul className="space-y-4 text-sm leading-6 text-white/80"><li>Qalam never asks for, receives, or stores your LinkedIn password.</li><li>Visible post text is sent only after you start a generation.</li><li>The extension does not auto-comment, auto-post, or schedule actions on LinkedIn.</li><li>You can disconnect the extension from the browser popup at any time.</li></ul></div></section>
      <section className="mx-auto max-w-4xl px-6 py-20"><p className="text-center text-sm font-bold uppercase tracking-[0.18em] text-teal">FAQ</p><h2 className="mt-3 text-center text-3xl font-bold tracking-tight">Extension questions, answered.</h2><div className="mt-10 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">{faqs.map((faq) => <details key={faq.q} className="group p-5"><summary className="cursor-pointer list-none pr-8 text-sm font-bold text-zinc-900">{faq.q}<span className="float-right text-teal group-open:rotate-45">+</span></summary><p className="mt-3 text-sm leading-7 text-zinc-600">{faq.a}</p></details>)}</div><div className="mt-10 flex flex-wrap justify-center gap-5 text-sm font-semibold text-teal"><Link href="/free-tools/comment-generator">Try the free comment generator</Link><Link href="/ai-linkedin-writer">Explore the AI LinkedIn Writer</Link><Link href="/pricing">View every plan</Link></div></section>
    </main>
  )
}
