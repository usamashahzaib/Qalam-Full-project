import type { Metadata } from "next"
import Link from "next/link"
import { FadeUp } from "@/components/FadeUp"
import {
  AnalyticsIcon,
  CarouselIcon,
  CheckIcon,
  CommentIcon,
  HookIcon,
  MicroscopeIcon,
  ProfileIcon,
} from "@/components/ui/qalam-icons"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Free LinkedIn AI Tools - Hook Generator, Headline Analyzer & More",
  description:
    "Free AI tools for LinkedIn: hook generator, comment generator, headline analyzer, profile optimizer, viral checker, carousel builder, and engagement predictor. Most need no account. Built by Qalam, the AI LinkedIn writer.",
  alternates: { canonical: `${SITE_URL}/free-tools` },
  openGraph: {
    title: "Free LinkedIn AI Tools - Hook Generator, Headline Analyzer | Qalam",
    description:
      "Seven free AI-powered LinkedIn tools to help you write better posts, comment smarter, optimize your profile, and predict engagement. Most work with no sign-in.",
    url: `${SITE_URL}/free-tools`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free LinkedIn AI Tools - Hook Generator, Headline Analyzer | Qalam",
    description:
      "Hook generator, comment generator, headline analyzer, profile optimizer, viral checker. Most need no account. Built by Qalam.",
  },
}

const TOOLS = [
  {
    icon: HookIcon,
    title: "Hook Generator",
    desc: "Generate ten opening lines for any topic in seconds. No account required.",
    badge: "Most Used",
    badgeColor: "bg-gold text-white",
    href: "/free-tools/hook-generator",
  },
  {
    icon: CommentIcon,
    title: "Comment Generator",
    desc: "Draft sharp, on-voice LinkedIn comments for any post in seconds. Free sign-in required.",
    badge: "New",
    badgeColor: "border border-teal/20 bg-teal-50 text-teal",
    href: "/free-tools/comment-generator",
  },
  {
    icon: AnalyticsIcon,
    title: "Headline Analyzer",
    desc: "Score your LinkedIn headline for visibility, keyword strength, and clarity.",
    badge: "Popular",
    badgeColor: "border border-teal/20 bg-teal-50 text-teal",
    href: "/free-tools/headline-analyzer",
  },
  {
    icon: ProfileIcon,
    title: "Profile Optimizer",
    desc: "Get a structured breakdown of your LinkedIn profile with focused improvement suggestions.",
    badge: null,
    badgeColor: "",
    href: "/free-tools/profile-optimizer",
  },
  {
    icon: CarouselIcon,
    title: "Carousel Builder",
    desc: "Turn a post into a cleaner multi-slide asset for LinkedIn distribution.",
    badge: "New",
    badgeColor: "border border-teal/20 bg-teal-50 text-teal",
    href: "/free-tools/carousel-builder",
  },
  {
    icon: MicroscopeIcon,
    title: "Viral Formula Checker",
    desc: "Paste a post and get AI analysis of viral potential, weaknesses, and a stronger hook.",
    badge: null,
    badgeColor: "",
    href: "/free-tools/viral-checker",
  },
  {
    icon: AnalyticsIcon,
    title: "Engagement Predictor",
    desc: "Get a directional pre-publish score based on structure, specificity, and clarity.",
    badge: null,
    badgeColor: "",
    href: "/free-tools/engagement-predictor",
  },
]

const freeToolsSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Free LinkedIn AI Tools by Qalam",
  description:
    "Seven free AI-powered LinkedIn tools: hook generator, comment generator, headline analyzer, profile optimizer, viral checker, carousel builder, and engagement predictor. Most need no account.",
  url: "https://www.byqalam.com/free-tools",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: TOOLS.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.title,
      url: `https://www.byqalam.com${tool.href}`,
      description: tool.desc,
    })),
  },
}

export default function FreeToolsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(freeToolsSchema).replace(/</g, "\\u003c") }} />
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="relative overflow-hidden border-b border-zinc-100 bg-white px-6 py-20">
        <div
          className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.2) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-[300px] w-[300px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(201,135,31,0.3) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 mx-auto max-w-[1200px]">
          <FadeUp>
            <span className="chip mb-5 inline-flex border-teal/30 bg-teal-50 text-teal">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold/15">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              </span>
              Free tools · most need no account
            </span>
            <h1 className="mb-5 text-5xl font-extrabold leading-tight text-zinc-900 sm:text-6xl">
              Free LinkedIn
              <br />
              <span className="text-gold gold-underline">workflow tools</span>
            </h1>
            <p className="mb-8 max-w-2xl font-cormorant text-2xl italic leading-relaxed text-zinc-500">
              Seven focused tools to help you write better, comment sharper, profile
              stronger, and pressure-test ideas before they hit the feed.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Most need no sign-up", "Instant results", "Real routes", "Zero cost"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600"
                  >
                    <CheckIcon className="h-4 w-4 text-teal" />
                    {tag}
                  </span>
                )
              )}
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool, i) => {
              const Icon = tool.icon
              return (
                <FadeUp key={tool.title} delay={i * 0.08}>
                  <div className="group flex h-full flex-col rounded-2xl border border-zinc-100 bg-white p-7 shadow-sm transition-all duration-[220ms] hover:-translate-y-1.5 hover:border-gold/30 hover:shadow-[0_20px_48px_rgba(13,74,69,0.12)]">
                    <div className="mb-5 flex items-start justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal transition-colors group-hover:bg-teal group-hover:text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      {tool.badge && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tool.badgeColor}`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-zinc-900">{tool.title}</h3>
                    <p className="mb-6 flex-1 text-sm leading-relaxed text-zinc-500">{tool.desc}</p>

                    <Link
                      href={tool.href}
                      className="group/btn flex items-center justify-between rounded-xl bg-teal-50 px-5 py-3 text-sm font-semibold text-teal transition-all hover:bg-teal hover:text-white"
                    >
                      Try Free
                      <span className="text-base transition-transform group-hover/btn:translate-x-1">→</span>
                    </Link>
                  </div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <FadeUp>
            <div className="relative overflow-hidden rounded-2xl bg-teal px-10 py-16 text-center">
              <div
                className="pointer-events-none absolute left-[-10%] top-[-50%] h-[500px] w-[500px] rounded-full opacity-20 mesh-blob"
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)",
                  ["--dur" as string]: "16s",
                }}
              />
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-teal-200">
                Want the full system?
              </p>
              <h2 className="mb-4 text-4xl font-extrabold text-white">
                Unlock the full <span className="text-gold">Qalam platform</span>
              </h2>
              <p className="mx-auto mb-8 max-w-lg font-cormorant text-xl italic text-white/70">
                60 posts a month, trained Voice Profile, scheduler, and performance
                review. Pro starts at PKR 1,490/month.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-gold px-8 py-4 text-base font-bold text-white shadow-lg transition-colors hover:bg-gold-600"
                >
                  Start free - no card needed
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-white/25 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Compare Plans
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
