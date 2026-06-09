"use client"

import { FadeUp } from "@/components/FadeUp"

const UPDATES = [
  {
    version: "v2.4.0",
    date: "May 2, 2025",
    tag: "Major Release",
    tagColor: "bg-gold/20 text-gold border-gold/20",
    title: "Voice Fingerprint 2.0 - Now 3x More Accurate",
    updates: [
      { type: "new", text: "Completely rebuilt voice model with 500M+ LinkedIn post training data" },
      { type: "new", text: "Vocabulary analysis: Qalam now learns your specific word choices, not just tone" },
      { type: "new", text: "Sentence rhythm detection - shorter posts, longer posts, mixed? We match it." },
      { type: "improved", text: "Voice training now requires only 3 posts (down from 10)" },
      { type: "improved", text: "Generation speed reduced from 8s to under 2s" },
    ],
  },
  {
    version: "v2.3.2",
    date: "April 18, 2025",
    tag: "Update",
    tagColor: "bg-teal/20 text-teal-300 border-teal/20",
    title: "Post Scheduler Upgrades + Bug Fixes",
    updates: [
      { type: "new", text: "Optimal time suggestions based on your personal audience activity patterns" },
      { type: "new", text: "Bulk schedule: queue up to 30 posts in one session" },
      { type: "fixed", text: "Scheduler timezone bug affecting users in UTC+5 and UTC+5:30" },
      { type: "fixed", text: "Occasional duplicate post issue when refreshing the editor" },
    ],
  },
  {
    version: "v2.3.0",
    date: "April 3, 2025",
    tag: "Feature",
    tagColor: "bg-purple-500/20 text-purple-300 border-purple-500/20",
    title: "Idea Library Goes Live",
    updates: [
      { type: "new", text: "Personalized idea feed based on your niche, past topics, and trending content" },
      { type: "new", text: "Save and organize ideas with custom tags" },
      { type: "new", text: "One-click: turn any idea into a full post draft" },
      { type: "improved", text: "Trending topics now refresh every 6 hours (was 24 hours)" },
    ],
  },
  {
    version: "v2.2.1",
    date: "March 20, 2025",
    tag: "Improvement",
    tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/20",
    title: "Analytics Dashboard Overhaul",
    updates: [
      { type: "new", text: "Follower growth chart with week-over-week comparison" },
      { type: "new", text: "Post performance breakdown: impressions, reactions, comments, reposts" },
      { type: "new", text: "Best-performing hook format analysis" },
      { type: "improved", text: "Data now syncs every 15 minutes instead of hourly" },
      { type: "fixed", text: "Analytics not loading for accounts with 0 posts on Qalam" },
    ],
  },
  {
    version: "v2.0.0",
    date: "February 14, 2025",
    tag: "Major Release",
    tagColor: "bg-gold/20 text-gold border-gold/20",
    title: "Qalam 2.0 - Complete Rebuild",
    updates: [
      { type: "new", text: "Fully redesigned editor with distraction-free mode" },
      { type: "new", text: "Team workspaces: collaborate on content with up to 5 seats" },
      { type: "new", text: "Custom brand voice guidelines for Team plan" },
      { type: "new", text: "LinkedIn direct publishing (no more copy-paste)" },
      { type: "improved", text: "50% faster load times across the entire platform" },
      { type: "improved", text: "Mobile experience completely rebuilt from scratch" },
    ],
  },
]

const typeConfig: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-green-500/20 text-green-400" },
  improved: { label: "Improved", color: "bg-blue-500/20 text-blue-400" },
  fixed: { label: "Fixed", color: "bg-orange-500/20 text-orange-400" },
}

export default function ChangelogPage() {
  return (
    <div className="pt-24 min-h-screen">
      <section className="py-20 px-6">
        <div className="max-w-[760px] mx-auto">

          <FadeUp className="mb-16">
            <span className="chip border-white/20 text-white/70 bg-white/5 mb-5 inline-flex">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Always improving
            </span>
            <h1 className="text-5xl font-extrabold text-white mb-4">Changelog</h1>
            <p className="text-white/50 text-lg leading-relaxed">
              Every update, fix, and new feature - documented. We ship every two weeks and 
              we&apos;re transparent about exactly what changed and why.
            </p>
          </FadeUp>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10 ml-[7px] hidden sm:block" />

            <div className="flex flex-col gap-12">
              {UPDATES.map((update, i) => (
                <FadeUp key={update.version} delay={i * 0.1}>
                  <div className="sm:pl-10 relative">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-2 w-4 h-4 rounded-full border-2 border-gold bg-teal-900 hidden sm:block" />

                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-white font-mono font-bold">{update.version}</span>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${update.tagColor}`}>
                        {update.tag}
                      </span>
                      <span className="text-white/30 text-sm">{update.date}</span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-5">{update.title}</h3>

                    <div className="flex flex-col gap-3">
                      {update.updates.map((item, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5 ${typeConfig[item.type].color}`}>
                            {typeConfig[item.type].label}
                          </span>
                          <p className="text-white/60 text-sm leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>

          <FadeUp delay={0.2}>
            <div className="mt-16 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-white font-semibold mb-2">Have a feature request?</p>
              <p className="text-white/50 text-sm mb-4">
                We read every submission. The best ideas end up in production.
              </p>
              <a
                href="mailto:feedback@byqalam.com"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/10 transition-colors"
              >
                Send feedback →
              </a>
            </div>
          </FadeUp>

        </div>
      </section>
    </div>
  )
}
