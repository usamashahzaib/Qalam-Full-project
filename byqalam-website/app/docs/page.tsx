"use client"

import { useState } from "react"
import { FadeUp } from "@/components/FadeUp"
import { motion } from "framer-motion"
import Link from "next/link"

const DOCS_SECTIONS = [
  {
    icon: "🚀",
    title: "Getting Started",
    articles: [
      { title: "Quick start: Your first post in 5 minutes", time: "3 min read" },
      { title: "Setting up your account and profile", time: "2 min read" },
      { title: "Choosing the right plan for you", time: "2 min read" },
      { title: "Connecting your LinkedIn account", time: "4 min read" },
    ],
  },
  {
    icon: "🎙️",
    title: "Voice Fingerprint",
    articles: [
      { title: "How Voice Fingerprint works", time: "5 min read" },
      { title: "Training your voice: step-by-step", time: "4 min read" },
      { title: "Improving your voice model over time", time: "3 min read" },
      { title: "Using multiple voices for different audiences", time: "3 min read" },
    ],
  },
  {
    icon: "✍️",
    title: "Writing & Generating Posts",
    articles: [
      { title: "Using the AI Post Writer", time: "4 min read" },
      { title: "Selecting and editing hooks", time: "3 min read" },
      { title: "Tone modes explained: Witty, Bold, Professional, Storytelling, Direct", time: "5 min read" },
      { title: "Editing and refining AI drafts", time: "3 min read" },
    ],
  },
  {
    icon: "📅",
    title: "Scheduling & Publishing",
    articles: [
      { title: "How to schedule a post", time: "2 min read" },
      { title: "Understanding optimal posting times", time: "4 min read" },
      { title: "Bulk scheduling: queuing multiple posts", time: "3 min read" },
      { title: "Publishing directly to LinkedIn", time: "2 min read" },
    ],
  },
  {
    icon: "📊",
    title: "Analytics",
    articles: [
      { title: "Reading your analytics dashboard", time: "5 min read" },
      { title: "Understanding impression vs. reach vs. engagement", time: "4 min read" },
      { title: "Tracking follower growth", time: "2 min read" },
      { title: "Identifying your best-performing formats", time: "3 min read" },
    ],
  },
  {
    icon: "👥",
    title: "Team Plan",
    articles: [
      { title: "Setting up your team workspace", time: "4 min read" },
      { title: "Inviting team members", time: "2 min read" },
      { title: "Brand voice guidelines: setup and use", time: "5 min read" },
      { title: "Team analytics and reporting", time: "3 min read" },
    ],
  },
]

const POPULAR = [
  "How Voice Fingerprint works",
  "How to schedule a post",
  "Using the AI Post Writer",
  "Connecting your LinkedIn account",
  "Understanding optimal posting times",
]

export default function DocsPage() {
  const [search, setSearch] = useState("")

  return (
    <div className="pt-24 min-h-screen">
      {/* Header */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-[700px] mx-auto">
          <FadeUp>
            <h1 className="text-5xl font-extrabold text-white mb-4">
              How can we <span className="text-gold">help?</span>
            </h1>
            <p className="text-white/50 text-lg mb-8">
              Everything you need to get the most out of Qalam — from setup to advanced features.
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="Search the docs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-base focus:outline-none focus:border-gold/50 pr-12"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 text-lg">⌕</span>
            </div>
          </FadeUp>

          {/* Popular articles */}
          <FadeUp delay={0.1}>
            <div className="mt-6">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Popular articles</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {POPULAR.map((article) => (
                  <button
                    key={article}
                    className="text-sm text-white/60 border border-white/10 px-3 py-1.5 rounded-full hover:border-gold/30 hover:text-white transition-colors"
                  >
                    {article}
                  </button>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Docs grid */}
      <section className="py-10 px-6 pb-24">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DOCS_SECTIONS.map((section, i) => (
              <FadeUp key={section.title} delay={i * 0.08}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-7 h-full hover:border-white/20 transition-colors">
                  <span className="text-3xl block mb-4">{section.icon}</span>
                  <h3 className="text-lg font-bold text-white mb-5">{section.title}</h3>
                  <ul className="space-y-3">
                    {section.articles.map((article) => (
                      <li key={article.title}>
                        <button className="text-left w-full flex items-start justify-between gap-2 group">
                          <span className="text-white/55 text-sm leading-snug group-hover:text-gold transition-colors">
                            {article.title}
                          </span>
                          <span className="text-white/25 text-xs flex-shrink-0 mt-0.5">{article.time}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* Support CTA */}
          <FadeUp delay={0.2}>
            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <span className="text-3xl block mb-4">💬</span>
                <h3 className="text-lg font-bold text-white mb-2">Talk to support</h3>
                <p className="text-white/50 text-sm mb-5 leading-relaxed">
                  Can&apos;t find what you&apos;re looking for? Our team typically responds in under 2 hours.
                </p>
                <a
                  href="mailto:support@byqalam.com"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-colors"
                >
                  support@byqalam.com →
                </a>
              </div>
              <div className="bg-gradient-to-br from-teal/30 to-transparent border border-teal/20 rounded-2xl p-8">
                <span className="text-3xl block mb-4">🎥</span>
                <h3 className="text-lg font-bold text-white mb-2">Video walkthroughs</h3>
                <p className="text-white/50 text-sm mb-5 leading-relaxed">
                  Prefer to watch? We have video guides for every major feature on our YouTube channel.
                </p>
                <a
                  href="https://www.instagram.com/byyqalam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-white text-sm font-semibold rounded-xl hover:bg-gold-600 transition-colors"
                >
                  Watch on Instagram →
                </a>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
