import type { Metadata } from "next"
import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Blog | Qalam",
  description:
    "Product thinking, workflow notes, and operating principles behind Qalam - the AI LinkedIn publishing system built for serious professionals.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "Blog - Qalam",
    description: "Product thinking, workflow notes, and operating principles behind Qalam.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog - Qalam",
    description: "Product thinking and operating principles behind Qalam.",
  },
}

const POSTS = [
  {
    title: "How to train an AI writing system without losing your voice",
    desc: "A practical breakdown of what source material matters, what to avoid, and how edits become training data over time. Most writers try to prompt their way to authenticity. The smarter path is accumulation.",
    tag: "Voice",
    read: "6 min read",
    date: "May 2026",
    status: "draft" as const,
  },
  {
    title: "Why post history is a better moat than another prompt template",
    desc: "A product argument for saving drafts, versions, approvals, and outcomes instead of shipping more surface-level generation. The compounding is in the context, not the generation.",
    tag: "Product",
    read: "5 min read",
    date: "May 2026",
    status: "draft" as const,
  },
  {
    title: "What agencies actually need from a content workflow",
    desc: "Separate client memory, clear approvals, shared assets, and less revision churn. The real problem is not a tools problem — it is a separation problem. Here is how Qalam thinks about it.",
    tag: "Agency",
    read: "7 min read",
    date: "May 2026",
    status: "draft" as const,
  },
  {
    title: "The three habits that separate LinkedIn authority from LinkedIn noise",
    desc: "Consistency, specificity, and voice fidelity. After reviewing hundreds of professional profiles and post archives, these three patterns show up every time a writer is actually building something durable.",
    tag: "Strategy",
    read: "4 min read",
    date: "Coming soon",
    status: "soon" as const,
  },
  {
    title: "HR leaders and employer brand: why most content sounds the same",
    desc: "The cultural and structural reasons why employer brand content defaults to the same three formats. What actually works, and how to build a repeatable system around real organizational truth.",
    tag: "HR",
    read: "5 min read",
    date: "Coming soon",
    status: "soon" as const,
  },
  {
    title: "From consultant to thought leader: the archive is the product",
    desc: "Consultants who consistently win inbound opportunities have one thing in common: a documented public record of their thinking. Here is how to build that systematically without sounding like a content machine.",
    tag: "Consulting",
    read: "6 min read",
    date: "Coming soon",
    status: "soon" as const,
  },
]

export default function BlogPage() {
  const published = POSTS.filter((p) => p.status === "draft")
  const upcoming = POSTS.filter((p) => p.status === "soon")

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="border-b border-zinc-100 bg-white px-6 py-20">
        <div className="mx-auto max-w-[920px] text-center">
          <FadeUp>
            <span className="chip mb-6 inline-flex border-teal/30 bg-teal-50 text-teal">Journal</span>
            <h1 className="mb-5 text-5xl font-extrabold text-zinc-900 sm:text-6xl">
              Notes on publishing systems,
              <span className="text-gold gold-underline"> voice, and workflow.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-500">
              Product thinking, operating principles, and practical writing strategy from the team behind Qalam.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">In progress</h2>
          </FadeUp>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {published.map((post, i) => (
              <FadeUp key={post.title} delay={i * 0.08}>
                <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="inline-flex rounded-full border border-teal/20 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal">
                      {post.tag}
                    </span>
                    <span className="text-xs text-zinc-400">{post.read}</span>
                  </div>
                  <h2 className="mb-3 text-xl font-bold leading-snug text-zinc-800">{post.title}</h2>
                  <p className="flex-1 text-sm leading-relaxed text-zinc-500">{post.desc}</p>
                  <p className="mt-4 text-xs text-zinc-400">{post.date}</p>
                </article>
              </FadeUp>
            ))}
          </div>

          <FadeUp className="mb-8 mt-14">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Coming soon</h2>
          </FadeUp>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {upcoming.map((post, i) => (
              <FadeUp key={post.title} delay={i * 0.06}>
                <article className="flex h-full flex-col rounded-2xl border border-zinc-100 bg-white/60 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-500">
                      {post.tag}
                    </span>
                    <span className="text-xs text-zinc-400">{post.read}</span>
                  </div>
                  <h2 className="mb-2 text-base font-bold leading-snug text-zinc-700">{post.title}</h2>
                  <p className="flex-1 text-sm leading-relaxed text-zinc-400">{post.desc}</p>
                </article>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <FadeUp className="mx-auto mb-20 max-w-[1100px] px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h3 className="mb-2 text-lg font-bold text-zinc-900">Want product updates instead of essays?</h3>
          <p className="mb-5 text-sm text-zinc-500">The changelog is the faster source of truth.</p>
          <Link href="/changelog" className="inline-flex items-center justify-center rounded-xl bg-teal px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-600">
            View Changelog
          </Link>
        </div>
      </FadeUp>
    </div>
  )
}
