"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"

const TOOLS = [
  {
    icon: "🎣",
    title: "Hook Generator",
    desc: "Generate 10 scroll-stopping first lines for any topic in seconds. No account required.",
    badge: "Most Used",
    badgeColor: "bg-gold text-white",
    href: "/free-tools/hook-generator",
  },
  {
    icon: "📰",
    title: "Headline Analyzer",
    desc: "Score your LinkedIn headline for visibility, keyword strength, and emotional impact.",
    badge: "Popular",
    badgeColor: "bg-teal-50 text-teal border border-teal/20",
    href: "/free-tools/headline-analyzer",
  },
  {
    icon: "👤",
    title: "Profile Optimizer",
    desc: "Get an AI-powered breakdown of your LinkedIn profile with specific improvement suggestions.",
    badge: null,
    badgeColor: "",
    href: "/free-tools/profile-optimizer",
  },
  {
    icon: "🎠",
    title: "Carousel Builder",
    desc: "Turn any post into a beautifully designed LinkedIn carousel. Download as PNG or PDF.",
    badge: "New",
    badgeColor: "bg-green-50 text-green-700 border border-green-200",
    href: "/free-tools/carousel-builder",
  },
  {
    icon: "🔬",
    title: "Viral Formula Checker",
    desc: "Paste any post and get an instant breakdown of why it did (or didn't) go viral.",
    badge: null,
    badgeColor: "",
    href: "/free-tools/viral-checker",
  },
  {
    icon: "📈",
    title: "Engagement Predictor",
    desc: "Our AI predicts your post's reach and engagement score before you hit publish.",
    badge: "Beta",
    badgeColor: "bg-purple-50 text-purple-700 border border-purple-200",
    href: "/free-tools/engagement-predictor",
  },
]

export default function FreeToolsPage() {
  return (
    <div className="pt-24 min-h-screen bg-zinc-50">
      {/* Header */}
      <section className="py-20 px-6 bg-white border-b border-zinc-100 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(13,74,69,0.2) 0%, transparent 70%)" }}
        />
        <div className="absolute -bottom-20 -left-10 w-[300px] h-[300px] rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(201,135,31,0.3) 0%, transparent 70%)" }}
        />

        <div className="max-w-[1200px] mx-auto relative z-10">
          <FadeUp>
            <span className="chip border-teal/30 text-teal bg-teal-50 mb-5 inline-flex">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              100% Free — No Account Required
            </span>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-zinc-900 mb-5 leading-tight">
              Free LinkedIn
              <br />
              <span className="text-gold gold-underline">Growth Tools</span>
            </h1>
            <p className="font-cormorant text-2xl italic text-zinc-500 max-w-2xl leading-relaxed mb-8">
              Six precision tools to help you write better, profile stronger, and grow faster — completely free, forever.
            </p>
            <div className="flex flex-wrap gap-3">
              {["No sign-up needed", "Instant results", "AI-powered", "Zero cost"].map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 text-sm text-zinc-600 bg-white border border-zinc-200 px-3 py-1.5 rounded-full">
                  <span className="text-teal text-xs">✓</span>
                  {tag}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Tools grid */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TOOLS.map((tool, i) => (
              <FadeUp key={tool.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{
                    y: -6,
                    boxShadow: "0 20px 48px rgba(13,74,69,0.12)",
                    borderColor: "#C9871F50",
                    transition: { duration: 0.22 },
                  }}
                  className="bg-white rounded-2xl border border-zinc-100 p-7 flex flex-col h-full shadow-sm"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-3xl">
                      {tool.icon}
                    </div>
                    {tool.badge && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tool.badgeColor}`}>
                        {tool.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-zinc-900 mb-2">{tool.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed flex-1 mb-6">{tool.desc}</p>

                  <motion.div whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      href={tool.href}
                      className="flex items-center justify-between px-5 py-3 rounded-xl bg-teal-50 text-teal font-semibold text-sm hover:bg-teal hover:text-white transition-all group"
                    >
                      Try Free
                      <motion.span
                        animate={{ x: [0, 3, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        className="text-base"
                      >
                        →
                      </motion.span>
                    </Link>
                  </motion.div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp>
            <div className="bg-teal rounded-2xl px-10 py-16 text-center relative overflow-hidden">
              <div
                className="absolute top-[-50%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none mesh-blob"
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)",
                  "--dur": "16s",
                } as React.CSSProperties}
              />
              <p className="text-teal-200 text-sm font-semibold uppercase tracking-widest mb-4">
                Want unlimited access?
              </p>
              <h2 className="text-4xl font-extrabold text-white mb-4">
                Unlock the full{" "}
                <span className="text-gold">Qalam platform</span>
              </h2>
              <p className="font-cormorant text-xl italic text-white/70 mb-8 max-w-lg mx-auto">
                Unlimited posts, Voice Fingerprint, scheduler, and analytics — starting at $19/month.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-white font-bold rounded-xl text-base shadow-lg hover:bg-gold-600 transition-colors"
                  >
                    Start Free Trial →
                  </Link>
                </motion.div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/25 text-white font-semibold rounded-xl text-base hover:bg-white/10 transition-colors"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
