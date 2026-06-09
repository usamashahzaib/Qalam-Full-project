"use client"

import { motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import Link from "next/link"

const OPEN_ROLES = [
  {
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "Remote (Worldwide)",
    type: "Full-time",
    description: "Own the architecture of features used by 12,000+ creators daily. You'll work directly with our CTO on the AI pipeline, editor experience, and publishing infrastructure.",
  },
  {
    title: "AI/ML Engineer",
    department: "Engineering",
    location: "Remote (Worldwide)",
    type: "Full-time",
    description: "You'll own the Voice Fingerprint model - the core of what makes Qalam different. Fine-tune LLMs, build feedback loops, and push the boundaries of personalized generation.",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Remote (Worldwide)",
    type: "Full-time",
    description: "Design the future of AI-assisted writing. You'll own the end-to-end product experience - from the first blank page to the moment someone hits publish.",
  },
  {
    title: "Content Marketing Lead",
    department: "Marketing",
    location: "Remote (Worldwide)",
    type: "Full-time",
    description: "Ironically, we need someone great at writing. You'll own the Qalam blog, newsletter, and content engine. This is a high-ownership role with direct impact on growth.",
  },
  {
    title: "Growth Marketer",
    department: "Marketing",
    location: "Remote (Worldwide)",
    type: "Full-time",
    description: "Run experiments across paid, SEO, partnerships, and product-led growth. If you've scaled a SaaS from $0 to $1M ARR, we want to talk.",
  },
  {
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Remote (APAC/EMEA)",
    type: "Full-time",
    description: "Be the reason our users stick around. You'll own onboarding, retention, and the relationship with our top 500 power users. High empathy required.",
  },
]

const PERKS = [
  { icon: "🌍", title: "Fully remote", desc: "Work from anywhere. We care about output, not office hours." },
  { icon: "💰", title: "Competitive pay", desc: "Top-of-market salary + meaningful equity. We share the upside." },
  { icon: "📚", title: "$2,000/yr learning budget", desc: "Books, courses, conferences - whatever makes you better at your craft." },
  { icon: "🏥", title: "Full health coverage", desc: "Medical, dental, and vision. For you and your dependents." },
  { icon: "🏖️", title: "Unlimited PTO", desc: "With a 20-day minimum. We actually mean it." },
  { icon: "🖥️", title: "Premium setup", desc: "MacBook Pro, external monitor, mechanical keyboard - whatever you need to do your best work." },
]

const deptColors: Record<string, string> = {
  Engineering: "bg-blue-500/20 text-blue-300 border-blue-500/20",
  Design: "bg-purple-500/20 text-purple-300 border-purple-500/20",
  Marketing: "bg-gold/20 text-gold border-gold/20",
  "Customer Success": "bg-teal/20 text-teal-300 border-teal/20",
}

export default function CareersPage() {
  return (
    <div className="pt-24 min-h-screen">

      {/* Hero */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-[800px] mx-auto">
          <FadeUp>
            <span className="chip border-white/20 text-white/70 bg-white/5 mb-6 inline-flex">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              We&apos;re hiring - {OPEN_ROLES.length} open roles
            </span>
            <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
              Help us give everyone<br />
              <span className="text-gold gold-underline">their voice back.</span>
            </h1>
            <p className="text-xl text-white/55 leading-relaxed mb-8">
              We&apos;re a small team building something that actually matters. 
              If you want ownership, not just a job description - you&apos;re going to like it here.
            </p>
            <a
              href="#open-roles"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-white font-bold rounded-xl text-base hover:bg-gold-600 transition-colors"
            >
              See open roles →
            </a>
          </FadeUp>
        </div>
      </section>

      {/* Values / What it's like */}
      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-10 md:p-14">
              <h2 className="text-3xl font-bold text-white mb-6">What it&apos;s actually like to work here</h2>
              <div className="space-y-5 text-white/60 text-lg leading-relaxed max-w-3xl">
                <p>
                  We&apos;re at the stage where every person has a huge impact. There&apos;s no bureaucracy, 
                  no six-week approval cycles, no &quot;let&apos;s circle back on this.&quot; You&apos;ll ship things 
                  that real users use within your first week.
                </p>
                <p>
                  We&apos;re honest about what we don&apos;t know. We share numbers with everyone - 
                  revenue, churn, what&apos;s working, what&apos;s broken. No information silos.
                </p>
                <p>
                  We work hard, but we&apos;re not martyrs about it. Great work comes from clear heads, 
                  not 80-hour weeks. We optimize for sustained output over heroic sprints.
                </p>
                <p className="text-white font-medium">
                  We&apos;re building a $100M company. That&apos;s not a fantasy - it&apos;s a plan. 
                  And the people who join now will have the equity and the story to show for it.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">The package</h2>
          </FadeUp>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PERKS.map((perk, i) => (
              <FadeUp key={perk.title} delay={i * 0.08}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
                  <span className="text-3xl block mb-4">{perk.icon}</span>
                  <h3 className="text-white font-bold mb-2">{perk.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{perk.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section id="open-roles" className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp className="mb-10">
            <h2 className="text-3xl font-bold text-white">Open Roles</h2>
            <p className="text-white/50 mt-2">All roles are remote. All roles include equity.</p>
          </FadeUp>
          <div className="flex flex-col gap-4">
            {OPEN_ROLES.map((role, i) => (
              <FadeUp key={role.title} delay={i * 0.07}>
                <motion.div
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-7 hover:border-gold/30 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-white group-hover:text-gold transition-colors">
                        {role.title}
                      </h3>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${deptColors[role.department]}`}>
                        {role.department}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/40 flex-shrink-0">
                      <span>🌍 {role.location}</span>
                      <span>· {role.type}</span>
                    </div>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed mb-4">{role.description}</p>
                  <span className="text-gold text-sm font-semibold group-hover:underline">
                    Apply now →
                  </span>
                </motion.div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={0.2}>
            <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-white/60 mb-2">Don&apos;t see the right role?</p>
              <p className="text-white font-semibold mb-4">
                We&apos;re always looking for exceptional people. Send us your story.
              </p>
              <a
                href="mailto:careers@byqalam.com"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white font-medium rounded-xl text-sm hover:bg-white/10 transition-colors"
              >
                careers@byqalam.com →
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

    </div>
  )
}
