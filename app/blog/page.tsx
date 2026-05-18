import type { Metadata } from "next"
import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import { PUBLISHED_BLOG_POSTS, UPCOMING_BLOG_POSTS } from "@/lib/marketing-content"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Blog | Qalam",
  description:
    "Published playbooks, workflow analysis, and product thinking behind Qalam, the AI LinkedIn writing system for professionals.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "Blog | Qalam",
    description: "Published playbooks and workflow notes behind Qalam.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Qalam",
    description: "Published playbooks and workflow notes behind Qalam.",
  },
}

const blogIndexSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Qalam Blog",
  description:
    "Published playbooks, workflow analysis, and product thinking behind Qalam, the AI LinkedIn writing system for professionals.",
  url: `${SITE_URL}/blog`,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: PUBLISHED_BLOG_POSTS.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/blog/${post.slug}`,
      name: post.title,
    })),
  },
}

export default function BlogPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogIndexSchema) }} />
      <div className="min-h-screen bg-zinc-50 pt-24">
        <section className="border-b border-zinc-100 bg-white px-6 py-20">
          <div className="mx-auto max-w-[920px] text-center">
            <FadeUp>
              <span className="chip mb-6 inline-flex border-teal/30 bg-teal-50 text-teal">Journal</span>
              <h1 className="mb-5 text-5xl font-extrabold text-zinc-900 sm:text-6xl">
                Practical notes on LinkedIn publishing,
                <span className="text-gold gold-underline"> authority, and workflow.</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-500">
                Answer-first articles built to explain how serious operators can publish with more consistency, stronger voice fidelity, and less generic AI output.
              </p>
            </FadeUp>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-[1100px]">
            <FadeUp className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Published</h2>
            </FadeUp>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {PUBLISHED_BLOG_POSTS.map((post, i) => (
                <FadeUp key={post.slug} delay={i * 0.08}>
                  <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="inline-flex rounded-full border border-teal/20 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal">
                        {post.tag}
                      </span>
                      <span className="text-xs text-zinc-400">{post.readMinutes} min read</span>
                    </div>
                    <h2 className="mb-3 text-xl font-bold leading-snug text-zinc-800">{post.title}</h2>
                    <p className="flex-1 text-sm leading-relaxed text-zinc-500">{post.excerpt}</p>
                    <div className="mt-5 flex items-center justify-between gap-4">
                      <p className="text-xs text-zinc-400">{new Date(post.datePublished).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                      <Link href={`/blog/${post.slug}`} className="text-sm font-semibold text-teal transition-colors hover:text-teal-600">
                        Read article
                      </Link>
                    </div>
                  </article>
                </FadeUp>
              ))}
            </div>

            <FadeUp className="mb-8 mt-14">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Planned next</h2>
            </FadeUp>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {UPCOMING_BLOG_POSTS.map((post, i) => (
                <FadeUp key={post.slug} delay={i * 0.06}>
                  <article className="flex h-full flex-col rounded-2xl border border-zinc-100 bg-white/60 p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-500">
                        {post.tag}
                      </span>
                      <span className="text-xs text-zinc-400">{post.readMinutes} min read</span>
                    </div>
                    <h2 className="mb-2 text-base font-bold leading-snug text-zinc-700">{post.title}</h2>
                    <p className="flex-1 text-sm leading-relaxed text-zinc-400">{post.description}</p>
                  </article>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        <FadeUp className="mx-auto mb-20 max-w-[1100px] px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h3 className="mb-2 text-lg font-bold text-zinc-900">Need product truth faster than essays?</h3>
            <p className="mb-5 text-sm text-zinc-500">The changelog and pricing pages show the current state of Qalam directly.</p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/changelog" className="inline-flex items-center justify-center rounded-xl bg-teal px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-600">
                View Changelog
              </Link>
              <Link href="/pricing" className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-6 py-3 font-semibold text-zinc-700 transition-colors hover:border-teal/40 hover:bg-teal/5">
                View Pricing
              </Link>
            </div>
          </div>
        </FadeUp>
      </div>
    </>
  )
}
