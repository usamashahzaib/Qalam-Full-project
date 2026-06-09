"use client"

import { motion } from "framer-motion"
import { FadeUp } from "@/components/FadeUp"
import Link from "next/link"

const FEATURED = {
  title: "The LinkedIn Algorithm in 2025: What Actually Works (We Tested 10,000 Posts)",
  excerpt:
    "We ran every format, every hook style, every posting time through our analytics engine. Here's what the data actually says - and why most LinkedIn advice is dead wrong.",
  category: "Research",
  readTime: "12 min read",
  date: "May 2, 2025",
  author: { name: "Aisha Malik", initials: "AM", color: "#0D4A45" },
}

const POSTS = [
  {
    title: "Why Your LinkedIn Posts Sound Fake (And How to Fix It in 10 Minutes)",
    excerpt: "Most people write LinkedIn posts the way they were taught to write emails - formal, structured, and completely devoid of personality. Here's the fix.",
    category: "Writing Tips",
    readTime: "6 min read",
    date: "Apr 28, 2025",
    author: { name: "Aisha Malik", initials: "AM", color: "#0D4A45" },
  },
  {
    title: "The 5-Part Hook Formula That Gets 3x More Impressions",
    excerpt: "Your first line is your entire post. If it doesn't stop the scroll, nothing else matters. We analyzed 500K hooks to find the 5 structures that consistently win.",
    category: "Hooks & Headlines",
    readTime: "8 min read",
    date: "Apr 21, 2025",
    author: { name: "Omar Farooq", initials: "OF", color: "#ec4899" },
  },
  {
    title: "From 800 to 40,000 Followers: A Founder's 90-Day LinkedIn Playbook",
    excerpt: "No hacks. No engagement pods. Just a clear, repeatable system for growing a real audience that actually buys from you.",
    category: "Growth",
    readTime: "15 min read",
    date: "Apr 14, 2025",
    author: { name: "Raza Hussain", initials: "RH", color: "#C9871F" },
  },
  {
    title: "The Voice Fingerprint Method: How to Train AI to Write Like You",
    excerpt: "Generic AI content is the new spam. Here's how to give any AI tool enough context to actually sound like a human being - specifically, you.",
    category: "AI & Tools",
    readTime: "7 min read",
    date: "Apr 7, 2025",
    author: { name: "Sara Khan", initials: "SK", color: "#6366f1" },
  },
  {
    title: "LinkedIn Carousels vs. Text Posts: The 2025 Data",
    excerpt: "Everyone says carousels are king. The data says something more nuanced. We break down when each format wins and when it kills your reach.",
    category: "Research",
    readTime: "9 min read",
    date: "Mar 31, 2025",
    author: { name: "Omar Farooq", initials: "OF", color: "#ec4899" },
  },
  {
    title: "How HR Leaders Are Using LinkedIn to Attract Top Talent (Without Spending on Ads)",
    excerpt: "The best talent isn't on job boards. They're on LinkedIn, deciding whether they'd want to work for you based on your content. Here's how to show up right.",
    category: "HR & Recruiting",
    readTime: "10 min read",
    date: "Mar 24, 2025",
    author: { name: "Aisha Malik", initials: "AM", color: "#0D4A45" },
  },
]

const CATEGORIES = ["All", "Research", "Writing Tips", "Growth", "AI & Tools", "Hooks & Headlines", "HR & Recruiting"]

const categoryColors: Record<string, string> = {
  "Research": "bg-purple-500/20 text-purple-300 border-purple-500/20",
  "Writing Tips": "bg-teal/20 text-teal-300 border-teal/20",
  "Growth": "bg-green-500/20 text-green-300 border-green-500/20",
  "AI & Tools": "bg-blue-500/20 text-blue-300 border-blue-500/20",
  "Hooks & Headlines": "bg-gold/20 text-gold border-gold/20",
  "HR & Recruiting": "bg-pink-500/20 text-pink-300 border-pink-500/20",
}

export default function BlogPage() {
  return (
    <div className="pt-24 min-h-screen">

      {/* Header */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="chip border-white/20 text-white/70 bg-white/5 mb-5 inline-flex">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              Fresh every week
            </span>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-5">
              The LinkedIn <span className="text-gold gold-underline">Playbook</span>
            </h1>
            <p className="text-xl text-white/55 max-w-2xl mx-auto leading-relaxed">
              Data-backed strategies, real breakdowns, and writing advice that actually works - 
              from a team obsessed with LinkedIn growth.
            </p>
          </FadeUp>

          {/* Category filters */}
          <FadeUp delay={0.1}>
            <div className="flex flex-wrap gap-2 justify-center mb-14">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    cat === "All"
                      ? "bg-gold text-white border-gold"
                      : "border-white/10 text-white/50 hover:border-white/30 hover:text-white/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </FadeUp>

          {/* Featured post */}
          <FadeUp delay={0.15}>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 mb-10 hover:border-gold/30 transition-colors cursor-pointer group">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${categoryColors[FEATURED.category]}`}>
                      {FEATURED.category}
                    </span>
                    <span className="text-white/30 text-sm">Featured</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-gold transition-colors leading-snug">
                    {FEATURED.title}
                  </h2>
                  <p className="text-white/55 leading-relaxed mb-6 text-lg">{FEATURED.excerpt}</p>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: FEATURED.author.color }}
                    >
                      {FEATURED.author.initials}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{FEATURED.author.name}</p>
                      <p className="text-white/40 text-xs">{FEATURED.date} · {FEATURED.readTime}</p>
                    </div>
                    <span className="ml-auto text-gold font-semibold text-sm group-hover:translate-x-1 transition-transform inline-block">
                      Read →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* Post grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {POSTS.map((post, i) => (
              <FadeUp key={post.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-7 flex flex-col h-full hover:border-white/20 transition-colors cursor-pointer group"
                >
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border w-fit mb-5 ${categoryColors[post.category]}`}>
                    {post.category}
                  </span>
                  <h3 className="text-lg font-bold text-white mb-3 leading-snug group-hover:text-gold transition-colors flex-1">
                    {post.title}
                  </h3>
                  <p className="text-white/45 text-sm leading-relaxed mb-6">{post.excerpt}</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ background: post.author.color }}
                    >
                      {post.author.initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-white/70 text-xs font-medium">{post.author.name}</p>
                      <p className="text-white/30 text-xs">{post.date} · {post.readTime}</p>
                    </div>
                  </div>
                </motion.div>
              </FadeUp>
            ))}
          </div>

          {/* Newsletter CTA */}
          <FadeUp delay={0.2}>
            <div className="mt-16 bg-gradient-to-br from-teal/30 to-transparent border border-teal/20 rounded-3xl p-10 text-center">
              <h3 className="text-2xl font-bold text-white mb-3">
                Get the best LinkedIn strategies, weekly.
              </h3>
              <p className="text-white/50 mb-6">No fluff. Just what&apos;s actually working right now - delivered every Tuesday.</p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-gold/50"
                />
                <button className="px-6 py-3 bg-gold text-white font-semibold rounded-xl text-sm hover:bg-gold-600 transition-colors whitespace-nowrap">
                  Subscribe Free
                </button>
              </div>
              <p className="text-white/30 text-xs mt-3">12,000+ readers. Unsubscribe anytime.</p>
            </div>
          </FadeUp>
        </div>
      </section>

    </div>
  )
}
