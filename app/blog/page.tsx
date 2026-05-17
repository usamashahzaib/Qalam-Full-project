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
    desc: "A practical breakdown of what source material matters, what to avoid, and how edits become training data.",
    tag: "Voice",
    state: "Editorial outline",
  },
  {
    title: "Why post history is a better moat than another prompt template",
    desc: "A product argument for saving drafts, versions, approvals, and outcomes instead of shipping more surface-level generation.",
    tag: "Product",
    state: "Editorial outline",
  },
  {
    title: "What agencies actually need from a content workflow",
    desc: "Separate client memory, clear approvals, shared assets, and less revision churn.",
    tag: "Agency",
    state: "Editorial outline",
  },
]

export default function BlogPage() {
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
              Public working notes behind Qalam. These entries are published as product-backed editorial outlines until the long-form articles ship.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 md:grid-cols-3">
          {POSTS.map((post, i) => (
            <FadeUp key={post.title} delay={i * 0.08}>
              <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <span className="inline-flex rounded-full border border-teal/20 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal">
                    {post.tag}
                  </span>
                  <span className="inline-flex rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-400">
                    {post.state}
                  </span>
                </div>
                <h2 className="mb-3 text-xl font-bold leading-snug text-zinc-800">{post.title}</h2>
                <p className="flex-1 text-sm leading-relaxed text-zinc-500">{post.desc}</p>
              </article>
            </FadeUp>
          ))}
        </div>

        <FadeUp className="mx-auto mt-12 max-w-[920px]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h3 className="mb-2 text-lg font-bold text-zinc-900">Want product updates instead of essays?</h3>
            <p className="mb-5 text-sm text-zinc-500">The changelog is the faster source of truth.</p>
            <Link href="/changelog" className="inline-flex items-center justify-center rounded-xl bg-teal px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-600">
              View Changelog
            </Link>
          </div>
        </FadeUp>
      </section>
    </div>
  )
}
