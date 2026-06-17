import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FadeUp } from "@/components/FadeUp"
import { BLOG_POSTS, PUBLISHED_BLOG_POSTS } from "@/lib/marketing-content"
import { SITE_NAME, SITE_URL, absoluteUrl, buildOgImageUrl } from "@/lib/seo"

type Params = { slug: string }

export function generateStaticParams() {
  return PUBLISHED_BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const post = PUBLISHED_BLOG_POSTS.find((entry) => entry.slug === slug)
  if (!post) return {}

  const ogImage = buildOgImageUrl(post.title, post.description, post.tag)

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: absoluteUrl(`/blog/${post.slug}`) },
    openGraph: {
      title: `${post.title} | ${SITE_NAME}`,
      description: post.description,
      url: absoluteUrl(`/blog/${post.slug}`),
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | ${SITE_NAME}`,
      description: post.description,
      images: [ogImage],
    },
  }
}

export default async function BlogArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const post = PUBLISHED_BLOG_POSTS.find((entry) => entry.slug === slug)
  if (!post) notFound()

  const relatedPosts = BLOG_POSTS.filter((entry) => entry.slug !== slug && entry.status === "published").slice(0, 2)

  const postUrl = absoluteUrl(`/blog/${post.slug}`)
  const ogImage = buildOgImageUrl(post.title, post.description, post.tag)

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateModified,
    image: ogImage,
    wordCount: post.sections.reduce(
      (acc, s) => acc + s.paragraphs.join(" ").split(" ").length,
      0
    ),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/qalam-mark.png`,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/qalam-mark.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    url: postUrl,
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Qalam", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
      { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
    ],
  }

  const faqSchema = post.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      }
    : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} />
      {faqSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} /> : null}
      <article className="min-h-screen bg-zinc-50 pt-24">
        <section className="border-b border-zinc-100 bg-white px-6 py-20">
          <div className="mx-auto max-w-[860px]">
            <FadeUp>
              <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                <span className="rounded-full border border-teal/20 bg-teal-50 px-3 py-1 font-semibold text-teal">{post.tag}</span>
                <span>{new Date(post.datePublished).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                <span>{post.readMinutes} min read</span>
              </div>
              <h1 className="mb-5 text-4xl font-extrabold leading-tight text-zinc-900 sm:text-5xl">{post.title}</h1>
              <p className="max-w-3xl text-lg leading-relaxed text-zinc-600">{post.description}</p>
            </FadeUp>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-[860px] space-y-10">
            {post.sections.map((section, index) => (
              <FadeUp key={section.heading} delay={index * 0.05}>
                <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
                  <h2 className="mb-4 text-2xl font-bold text-zinc-900">{section.heading}</h2>
                  <div className="space-y-4 text-base leading-relaxed text-zinc-600">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              </FadeUp>
            ))}
          </div>
        </section>

        {post.faqs.length ? (
          <section className="px-6 pb-16">
            <div className="mx-auto max-w-[860px] rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold text-zinc-900">Frequently asked questions</h2>
              <div className="space-y-5">
                {post.faqs.map((faq) => (
                  <div key={faq.q}>
                    <h3 className="text-lg font-semibold text-zinc-900">{faq.q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {relatedPosts.length ? (
          <section className="px-6 pb-20">
            <div className="mx-auto max-w-[860px] rounded-3xl bg-teal p-10 text-white">
              <h2 className="mb-4 text-3xl font-bold">Read the next answer page</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {relatedPosts.map((related) => (
                  <Link key={related.slug} href={`/blog/${related.slug}`} className="rounded-2xl border border-white/15 bg-white/5 p-5 transition-colors hover:bg-white/10">
                    <p className="text-sm font-semibold text-gold">{related.tag}</p>
                    <p className="mt-2 text-lg font-bold">{related.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/75">{related.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </article>
    </>
  )
}
