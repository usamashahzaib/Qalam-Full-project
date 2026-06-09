"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import { PricingCard } from "@/components/PricingCard"
import { TestimonialCard } from "@/components/TestimonialCard"
import GridGlowBackground from "@/components/ui/grid-glow-background"

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "https://app.byqalam.com").replace(
  /\/$/,
  ""
)

/* ─── Static data ─────────────────────────────────────────────── */

const PARTICLES = [
  { size: 80, x: 8, y: 15, dur: 6, delay: 0 },
  { size: 50, x: 88, y: 10, dur: 8, delay: 1 },
  { size: 120, x: 75, y: 70, dur: 10, delay: 2 },
  { size: 40, x: 20, y: 80, dur: 7, delay: 0.5 },
  { size: 65, x: 55, y: 25, dur: 9, delay: 1.5 },
  { size: 35, x: 40, y: 60, dur: 5, delay: 3 },
  { size: 90, x: 95, y: 45, dur: 11, delay: 0.8 },
  { size: 45, x: 5, y: 50, dur: 7, delay: 2.5 },
]

const FEATURES = [
  {
    icon: "✍️",
    title: "AI Post Writer",
    desc: "Generate compelling LinkedIn posts in seconds with AI trained on 10M+ viral content pieces.",
  },
  {
    icon: "🎣",
    title: "Hook Generator",
    desc: "Craft scroll-stopping first lines that demand attention before a single word is read.",
  },
  {
    icon: "🎙️",
    title: "Voice Fingerprint",
    desc: "Train Qalam on your past posts - it writes in your exact tone, style, and cadence every time.",
  },
  {
    icon: "💡",
    title: "Idea Library",
    desc: "Never run dry. Your personalized, ever-growing idea bank pulls from trending topics in your niche.",
  },
  {
    icon: "📅",
    title: "Post Scheduler",
    desc: "Plan and publish at peak times automatically. Your content works while you sleep.",
  },
  {
    icon: "📊",
    title: "LinkedIn Analytics",
    desc: "See exactly what formats and hooks drive the most reach, engagement, and followers.",
  },
]

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Enter a Topic",
    desc: "Type your idea or pick from AI-suggested trending topics tailored to your niche.",
    icon: "💬",
  },
  {
    step: "02",
    title: "Pick Your Tone",
    desc: "Choose from Witty, Professional, Bold, Storytelling, or Direct - or use your Voice Fingerprint.",
    icon: "🎚️",
  },
  {
    step: "03",
    title: "Generate & Publish",
    desc: "Review your AI post, choose your favorite hook, and push directly to LinkedIn in one click.",
    icon: "🚀",
  },
]

const TESTIMONIALS = [
  {
    quote:
      "Qalam 10x'd my LinkedIn engagement in 30 days. I went from 800 impressions per post to over 12,000 - without spending a single extra hour writing.",
    name: "Sarah Chen",
    title: "Head of Marketing",
    company: "Stripe",
    initials: "SC",
    color: "#0D4A45",
  },
  {
    quote:
      "The Voice Fingerprint is genuinely scary good. My audience can't tell the difference between my manual posts and Qalam-generated ones. That's the benchmark.",
    name: "Marcus Williams",
    title: "Founder",
    company: "DevPulse",
    initials: "MW",
    color: "#C9871F",
  },
  {
    quote:
      "I went from posting once a month to every single day. Our company page grew from 2K to 18K followers in one quarter. ROI is off the charts.",
    name: "Priya Patel",
    title: "HR Director",
    company: "Microsoft",
    initials: "PP",
    color: "#6366f1",
  },
]

const PRICING_PLANS = [
  {
    plan: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for testing the waters and building momentum.",
    features: [
      "5 AI posts per week",
      "3 hook variations per post",
      "Basic tone options",
      "Community support",
      "Post preview & copy",
    ],
    cta: "Start Free →",
    href: `${APP_ORIGIN}/login`,
    highlighted: false,
  },
  {
    plan: "Pro",
    price: "$19",
    period: "mo",
    description: "For creators and founders serious about LinkedIn growth.",
    features: [
      "Unlimited AI posts",
      "Voice Fingerprint training",
      "All 5 tone modes",
      "Hook Generator (unlimited)",
      "Post Scheduler (30 posts/mo)",
      "LinkedIn Analytics dashboard",
      "Priority support",
    ],
    cta: "Start Pro Trial →",
    href: `${APP_ORIGIN}/login?plan=pro`,
    highlighted: true,
    badge: "Most Popular",
  },
  {
    plan: "Team",
    price: "$49",
    period: "mo",
    description: "For marketing teams that want to dominate at scale.",
    features: [
      "Everything in Pro",
      "5 team seats",
      "Team analytics & reporting",
      "Custom voice profiles per seat",
      "Brand voice guidelines",
      "Unlimited scheduling",
      "Dedicated success manager",
    ],
    cta: "Start Team Trial →",
    href: `${APP_ORIGIN}/login?plan=team`,
    highlighted: false,
  },
]

const FAQ_ITEMS = [
  {
    q: "What is Qalam?",
    a: "Qalam is an AI-powered LinkedIn content platform that helps creators, founders, and marketing teams write and publish high-performing posts in a fraction of the time. It learns your unique writing voice to generate content that sounds exactly like you.",
  },
  {
    q: "How does the Voice Fingerprint work?",
    a: "You paste in 5-10 of your existing LinkedIn posts, and Qalam analyzes your sentence structure, vocabulary, tone, and cadence. It then mirrors your style in every piece of content it generates - so your audience always hears your authentic voice.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Absolutely. There are no long-term contracts. Cancel from your account settings at any time with one click. You'll retain access until the end of your billing period.",
  },
  {
    q: "How many posts can I generate per month?",
    a: "Free plan users can generate 5 posts per week (20/month). Pro and Team plan subscribers enjoy unlimited post generation with no caps on creativity.",
  },
  {
    q: "Does Qalam work for any LinkedIn niche?",
    a: "Yes. Qalam has been tested across SaaS, finance, HR, consulting, coaching, engineering, and 40+ other niches. The AI adapts to your industry's language and trending topics automatically.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes - Pro and Team plans include a 7-day free trial. No credit card required to start. Experience the full power of Qalam before committing.",
  },
]

const AVATARS = [
  { initials: "SC", bg: "#0D4A45" },
  { initials: "MW", bg: "#C9871F" },
  { initials: "PP", bg: "#6366f1" },
  { initials: "JK", bg: "#ec4899" },
  { initials: "RN", bg: "#14b8a6" },
]

/* ─── Hero particle background ─────────────────────────────────── */
function HeroBG() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Mesh gradient blobs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-25 mesh-blob"
        style={{
          background: "radial-gradient(circle, rgba(13,74,69,0.35) 0%, transparent 70%)",
          "--dur": "16s",
        } as React.CSSProperties}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20 mesh-blob"
        style={{
          background: "radial-gradient(circle, rgba(201,135,31,0.3) 0%, transparent 70%)",
          "--dur": "20s",
          animationDelay: "3s",
        } as React.CSSProperties}
      />
      {/* Ink-drop particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="particle absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background:
              i % 2 === 0
                ? "rgba(13,74,69,0.12)"
                : "rgba(201,135,31,0.1)",
            "--dur": `${p.dur}s`,
            "--delay": `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

/* ─── Product mockup card ────────────────────────────────────────── */
function ProductMockup() {
  return (
    <div
      className="relative"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        initial={{ opacity: 0, rotateX: 8, rotateY: -8, y: 30 }}
        animate={{ opacity: 1, rotateX: 4, rotateY: -4, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        style={{ transformStyle: "preserve-3d" }}
        whileHover={{ rotateX: 2, rotateY: -2, y: -4, transition: { duration: 0.4 } }}
        className="bg-teal-800 rounded-2xl shadow-[0_32px_80px_rgba(13,74,69,0.45)] overflow-hidden w-full max-w-[420px]"
      >
        {/* Mockup header */}
        <div className="bg-teal px-5 py-3 flex items-center justify-between border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-gold opacity-90" />
            <span className="text-zinc-800 text-sm font-semibold">Qalam AI · Post Preview</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="w-3 h-3 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Tone selector pills */}
        <div className="px-5 pt-4 pb-2 flex gap-2">
          {["Witty", "Professional", "Bold"].map((t, i) => (
            <span
              key={t}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                i === 0
                  ? "bg-gold text-white border-gold"
                  : "border-zinc-300/60 text-zinc-500"
              }`}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Post content area */}
        <div className="mx-5 mb-4 p-4 rounded-xl bg-zinc-900/5 border border-zinc-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-white text-xs font-bold">
              SC
            </div>
            <div>
              <p className="text-zinc-900 text-xs font-semibold">Sarah Chen</p>
              <p className="text-zinc-500 text-[10px]">Head of Marketing · Just now</p>
            </div>
          </div>
          <p className="text-zinc-800 text-xs leading-relaxed">
            I spent 3 years trying every LinkedIn strategy out there.<br /><br />
            None of them worked until I discovered this one counterintuitive truth:<br /><br />
            <span className="text-gold font-medium">Stop writing for your audience. Start writing for yourself.</span>
          </p>
          <div className="mt-3 pt-3 border-t border-zinc-200 flex gap-4 text-zinc-500 text-[10px]">
            <span>👍 1.2K reactions</span>
            <span>💬 148 comments</span>
            <span>↗ 3.4K reposts</span>
          </div>
        </div>

        {/* Copy/Save bar */}
        <div className="px-5 pb-4 flex gap-2">
          <button className="flex-1 py-2 rounded-lg bg-gold text-white text-xs font-semibold text-center">
            Copy to Clipboard
          </button>
          <button className="px-3 py-2 rounded-lg bg-zinc-900/5 text-zinc-600 text-xs font-medium">
            Save
          </button>
        </div>
      </motion.div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="absolute -right-4 top-8 bg-white rounded-xl shadow-xl px-4 py-2.5 border border-zinc-100"
      >
        <p className="text-[10px] text-zinc-500 font-medium">Impressions this week</p>
        <p className="text-xl font-bold text-teal">+12,480</p>
        <p className="text-[10px] text-green-600 font-medium">↑ 340% vs last week</p>
      </motion.div>
    </div>
  )
}

/* ─── FAQ Accordion ──────────────────────────────────────────────── */
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="py-24 px-6 bg-transparent" id="faq">
      <div className="max-w-[760px] mx-auto">
        <FadeUp className="text-center mb-14">
          <span className="chip border-teal/30 text-teal mb-4">FAQ</span>
          <h2 className="text-4xl font-bold text-zinc-900 mt-3 mb-4">
            Questions we get <span className="text-gold">all the time</span>
          </h2>
          <p className="text-zinc-600 text-lg">
            Can&apos;t find what you&apos;re looking for?{" "}
            <a href="mailto:hello@qalam.ai" className="text-teal underline underline-offset-2">
              Email us →
            </a>
          </p>
        </FadeUp>

        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => (
            <FadeUp key={i} delay={i * 0.05}>
              <div className="border border-zinc-200 bg-white/5 rounded-xl overflow-hidden hover:border-teal/30 transition-colors">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className="font-semibold text-zinc-900 text-base">{item.q}</span>
                  <motion.span
                    animate={{ rotate: open === i ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 ml-4 w-5 h-5 rounded-full border border-zinc-300/60 flex items-center justify-center text-zinc-500 text-lg font-light"
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-zinc-600 text-sm leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-28 pb-16">
        <GridGlowBackground glowColors={["#0D4A45", "#C9871F", "#0a3c38"]} backgroundColor="#030f0e" gridColor="rgba(13,74,69,0.08)" glowCount={12}>
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text column */}
            <div>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <span className="chip border-teal/30 text-teal bg-teal/10 mb-6 inline-flex">
                  <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                  AI Voice Fingerprint - Now Live
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-zinc-900 leading-[1.05] tracking-tight mb-5"
              >
                Write Less.
                <br />
                Post More.
                <br />
                <span className="text-gold gold-underline">Grow Faster.</span>
              </motion.h1>

              {/* Subheading */}
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="font-cormorant text-2xl italic text-zinc-600 leading-relaxed mb-8 max-w-xl"
              >
                Your AI writing partner that learns your voice and turns raw ideas into scroll-stopping LinkedIn content - in seconds.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: "easeOut", delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 mb-10"
              >
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href={`${APP_ORIGIN}/login`}
                    className="pulse-gold inline-flex items-center gap-2 px-7 py-4 bg-teal text-white font-semibold rounded-xl text-base shadow-[0_4px_24px_rgba(13,74,69,0.35)] hover:bg-teal-600 transition-colors"
                  >
                    Start Writing Free
                    <span>→</span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 px-7 py-4 border-2 border-zinc-300/60 text-zinc-600 font-semibold rounded-xl text-base hover:border-teal/40 hover:bg-teal/10 transition-all"
                  >
                    <span>▶</span> See How It Works
                  </Link>
                </motion.div>
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <div className="flex -space-x-2.5">
                  {AVATARS.map((a, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full border-2 border-zinc-300 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: a.bg }}
                    >
                      {a.initials}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-gold text-sm">★</span>
                    ))}
                    <span className="text-zinc-700 text-sm font-semibold ml-1">4.9/5</span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    Join <strong className="text-zinc-900">12,000+</strong> creators, founders &amp; HR leaders
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Mockup column */}
            <div className="flex justify-center lg:justify-end">
              <ProductMockup />
            </div>
          </div>
        </div>
        </GridGlowBackground>
      </section>

      {/* ── LOGO / SOCIAL PROOF BAR ──────────────────────────────── */}
      <section className="py-8 border-y border-zinc-200 bg-white/5 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 text-center mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Trusted by teams at
          </p>
        </div>
        <div className="overflow-hidden">
          <div className="marquee-track">
            {["LinkedIn", "Stripe", "Notion", "OpenAI", "Microsoft", "HubSpot", "Figma", "Vercel", "Shopify", "Atlassian"].concat(
              ["LinkedIn", "Stripe", "Notion", "OpenAI", "Microsoft", "HubSpot", "Figma", "Vercel", "Shopify", "Atlassian"]
            ).map((name, i) => (
              <span
                key={i}
                className="shrink-0 px-10 text-zinc-500 font-semibold text-lg opacity-60 hover:opacity-100 transition-opacity"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6 grid-bg">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="chip border-teal/30 text-teal bg-teal/10 mb-4">Features</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 mt-3 mb-4">
              Everything you need to{" "}
              <span className="text-gold gold-underline">own LinkedIn</span>
            </h2>
            <p className="text-zinc-600 text-xl max-w-2xl mx-auto leading-relaxed">
              Six precision-built tools that work together to make you the most consistent, authentic voice in your feed.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{
                    y: -6,
                    boxShadow: "0 20px 48px rgba(13,74,69,0.12)",
                    borderColor: "#C9871F",
                    transition: { duration: 0.22 },
                  }}
                  className="bg-white/5 backdrop-blur-md border border-zinc-200 rounded-2xl p-7 h-full transition-colors cursor-default"
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-900/5 flex items-center justify-center text-2xl mb-5">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">{f.title}</h3>
                  <p className="text-zinc-600 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6 bg-transparent">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="chip border-teal/30 text-teal bg-teal/10 mb-4">How It Works</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 mt-3 mb-4">
              From idea to publish in{" "}
              <span className="text-gold gold-underline">60 seconds</span>
            </h2>
            <p className="text-zinc-600 text-xl max-w-xl mx-auto">
              Three steps. That&apos;s all it takes to go from blank page to LinkedIn-ready post.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[calc(33%+24px)] right-[calc(33%+24px)] h-px bg-gradient-to-r from-teal-200 to-teal-200 via-gold/40" />

            {HOW_IT_WORKS.map((step, i) => (
              <FadeUp key={step.step} delay={i * 0.12}>
                <div className="relative flex flex-col items-center text-center">
                  {/* Number badge */}
                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border-2 border-teal/20 flex flex-col items-center justify-center">
                      <span className="text-2xl mb-0.5">{step.icon}</span>
                      <span className="text-teal text-xs font-bold">{step.step}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-3">{step.title}</h3>
                  <p className="text-zinc-600 text-sm leading-relaxed max-w-[260px]">{step.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-transparent grid-bg">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp className="text-center mb-14">
            <span className="chip border-teal/30 text-teal bg-teal/10 mb-4">Testimonials</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 mt-3 mb-4">
              Real results from{" "}
              <span className="text-gold gold-underline">real creators</span>
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={t.name} {...t} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-6 bg-transparent">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp className="text-center mb-14">
            <span className="chip border-teal/30 text-teal bg-teal/10 mb-4">Pricing</span>
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 mt-3 mb-4">
              Simple, transparent{" "}
              <span className="text-gold gold-underline">pricing</span>
            </h2>
            <p className="text-zinc-600 text-xl max-w-xl mx-auto">
              Start free. Upgrade when you&apos;re ready. Cancel anytime.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {PRICING_PLANS.map((plan, i) => (
              <FadeUp key={plan.plan} delay={i * 0.1}>
                <PricingCard {...plan} />
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-teal relative overflow-hidden">
        {/* Background blobs */}
        <div
          className="absolute top-[-30%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-30 mesh-blob"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
            "--dur": "18s",
          } as React.CSSProperties}
        />
        <div
          className="absolute bottom-[-20%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-20 mesh-blob"
          style={{
            background: "radial-gradient(circle, rgba(201,135,31,0.4) 0%, transparent 70%)",
            "--dur": "22s",
            animationDelay: "5s",
          } as React.CSSProperties}
        />

        <FadeUp className="relative z-10 text-center max-w-[680px] mx-auto">
          <span className="chip border-white/30 text-gold-200 bg-zinc-900/5 mb-6 inline-flex">
            Ready to level up?
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-zinc-900 mb-6 leading-tight">
            Ready to dominate{" "}
            <span className="text-gold">LinkedIn?</span>
          </h2>
          <p className="font-cormorant text-2xl italic text-zinc-700 mb-10 leading-relaxed">
            Join 12,000+ creators already growing their audience with Qalam.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href={`${APP_ORIGIN}/login`}
                className="pulse-gold inline-flex items-center gap-2 px-8 py-4 bg-gold text-white font-bold rounded-xl text-lg shadow-[0_8px_32px_rgba(201,135,31,0.45)] hover:bg-gold-600 transition-colors"
              >
                Start Writing Free
                <span>→</span>
              </Link>
            </motion.div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-zinc-300/70 text-zinc-800 font-semibold rounded-xl text-lg hover:bg-zinc-900/5 transition-colors"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-zinc-500 text-sm mt-5">No credit card required · Free forever plan available</p>
        </FadeUp>
      </section>
    </>
  )
}
