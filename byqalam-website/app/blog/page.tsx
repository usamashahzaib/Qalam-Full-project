"use client"

import { motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import Link from "next/link"

const TEAM = [
  {
    name: "Aisha Malik",
    role: "Co-Founder & CEO",
    bio: "Former LinkedIn Top Voice with 80K+ followers. Built and sold a content agency before starting Qalam. Obsessed with helping people find their voice online.",
    initials: "AM",
    color: "#0D4A45",
  },
  {
    name: "Raza Hussain",
    role: "Co-Founder & CTO",
    bio: "Ex-Google engineer. Built AI systems at scale. Believes the next generation of writing tools should feel like thinking out loud — not filling out a form.",
    initials: "RH",
    color: "#C9871F",
  },
  {
    name: "Sara Khan",
    role: "Head of Product",
    bio: "Previously at Notion and Figma. Spent 6 years obsessing over how people actually use writing tools vs. how designers think they do. Huge gap.",
    initials: "SK",
    color: "#6366f1",
  },
  {
    name: "Omar Farooq",
    role: "Head of Growth",
    bio: "Grew three SaaS products from zero to six figures ARR. Knows what makes people click, stay, and tell their friends. Data-driven, but not soulless about it.",
    initials: "OF",
    color: "#ec4899",
  },
]

const VALUES = [
  {
    icon: "🎯",
    title: "Voice first, always",
    desc: "Every feature we build starts with one question: does this help the person sound more like themselves, or less? If the answer is less, we kill it.",
  },
  {
    icon: "⚡",
    title: "Speed is a feature",
    desc: "The best content ideas die in drafts. We build for the moment of inspiration — when you have 90 seconds between meetings and a thought that needs to exist.",
  },
  {
    icon: "🔍",
    title: "Radical transparency",
    desc: "We tell you exactly how our AI works, what data it uses, and what it can't do. No magic curtain. No black box. You deserve to understand the tool you're trusting.",
  },
  {
    icon: "🌍",
    title: "Built for everyone",
    desc: "LinkedIn isn't just for Silicon Valley. We price Qalam for founders in Lahore, creators in Lagos, and consultants in London. Great writing tools shouldn't be a luxury.",
  },
]

const STATS = [
  { number: "12,000+", label: "Active creators" },
  { number: "2.4M+", label: "Posts generated" },
  { number: "94%", label: "Retention rate" },
  { number: "4.9/5", label: "Average rating" },
]

export default function AboutPage() {
  return (
    <div className="pt-24 min-h-screen">

      {/* Hero */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-[900px] mx-auto text-center relative z-10">
          <FadeUp>
            <span className="chip border-white/20 text-white/70 bg-white/5 mb-6 inline-flex">
              Our Story
            </span>
            <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
              We got tired of<br />
              <span className="text-gold gold-underline">sounding like robots.</span>
            </h1>
            <p className="text-xl text-white/60 leading-relaxed max-w-2xl mx-auto">
              Qalam started because every AI writing tool we tried made us sound like everyone else. 
              Generic. Corporate. Forgettable. We knew the technology could do better — 
              so we built the tool we actually wanted to use.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-20 px-6">
        <div className="max-w-[800px] mx-auto">
          <FadeUp>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-10 md:p-14">
              <span className="text-gold text-sm font-semibold uppercase tracking-widest">The Origin</span>
              <h2 className="text-3xl font-bold text-white mt-4 mb-6">
                It started with a frustrating Monday morning.
              </h2>
              <div className="space-y-5 text-white/65 text-lg leading-relaxed">
                <p>
                  Our co-founder Aisha had spent 45 minutes trying to write a LinkedIn post about 
                  a lesson she&apos;d learned the hard way. She knew exactly what she wanted to say. 
                  She just couldn&apos;t get it out right.
                </p>
                <p>
                  She tried three different AI tools. Each one gave her something polished, 
                  professional, and completely lifeless. The kind of post that gets 12 likes from 
                  people who weren&apos;t really reading it.
                </p>
                <p>
                  So she called Raza. And they spent the next six months building something different — 
                  a tool that asks &quot;what do you actually sound like?&quot; before it writes a single word.
                </p>
                <p className="text-white font-medium">
                  That&apos;s Qalam. Named after the Arabic and Urdu word for &quot;pen&quot; — because the best 
                  writing tool should feel like an extension of your hand, not a replacement for your brain.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <FadeUp key={stat.label} delay={i * 0.1}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
                  <p className="text-4xl font-extrabold text-gold mb-2">{stat.number}</p>
                  <p className="text-white/50 text-sm font-medium">{stat.label}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp className="text-center mb-14">
            <span className="chip border-white/20 text-white/70 bg-white/5 mb-4">What We Believe</span>
            <h2 className="text-4xl font-bold text-white mt-3">
              The values that drive every decision
            </h2>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map((v, i) => (
              <FadeUp key={v.title} delay={i * 0.1}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 h-full hover:border-gold/30 transition-colors">
                  <span className="text-3xl mb-5 block">{v.icon}</span>
                  <h3 className="text-xl font-bold text-white mb-3">{v.title}</h3>
                  <p className="text-white/55 leading-relaxed">{v.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp className="text-center mb-14">
            <span className="chip border-white/20 text-white/70 bg-white/5 mb-4">The Team</span>
            <h2 className="text-4xl font-bold text-white mt-3">
              Built by people who&apos;ve <span className="text-gold">lived the problem</span>
            </h2>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TEAM.map((member, i) => (
              <FadeUp key={member.name} delay={i * 0.1}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex gap-5 hover:border-white/20 transition-colors">
                  <div
                    className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: member.color }}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{member.name}</h3>
                    <p className="text-gold text-sm font-medium mb-3">{member.role}</p>
                    <p className="text-white/55 text-sm leading-relaxed">{member.bio}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-[700px] mx-auto">
          <FadeUp>
            <div className="bg-gradient-to-br from-teal/40 to-teal-800/40 backdrop-blur-md border border-teal/30 rounded-3xl p-12 text-center">
              <h2 className="text-4xl font-extrabold text-white mb-4">
                Join us in changing how<br />
                <span className="text-gold">professionals write online.</span>
              </h2>
              <p className="text-white/60 mb-8 text-lg">
                We&apos;re hiring, and we&apos;re always looking for people who care about this problem as much as we do.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gold text-white font-bold rounded-xl text-base hover:bg-gold-600 transition-colors"
                >
                  Try Qalam Free →
                </Link>
                <Link
                  href="/careers"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-xl text-base hover:bg-white/10 transition-colors"
                >
                  View Open Roles
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

    </div>
  )
}
