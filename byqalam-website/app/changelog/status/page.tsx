"use client"

import { FadeUp } from "@/components/FadeUp"

const SERVICES = [
  { name: "AI Post Generation", status: "operational", uptime: "99.98%" },
  { name: "Voice Fingerprint Engine", status: "operational", uptime: "99.95%" },
  { name: "Post Scheduler", status: "operational", uptime: "99.99%" },
  { name: "LinkedIn Publishing", status: "operational", uptime: "99.91%" },
  { name: "Analytics Dashboard", status: "operational", uptime: "99.97%" },
  { name: "Authentication", status: "operational", uptime: "100%" },
  { name: "API", status: "operational", uptime: "99.96%" },
  { name: "Web App", status: "operational", uptime: "99.99%" },
]

const INCIDENTS = [
  {
    date: "April 14, 2025",
    title: "Post Scheduler delay — resolved",
    severity: "Minor",
    severityColor: "bg-yellow-500/20 text-yellow-400",
    description: "Scheduled posts were delayed by 15–40 minutes for approximately 2 hours. The issue was traced to a third-party queue provider and has been resolved. All affected posts were sent.",
    duration: "2h 14m",
    resolved: true,
  },
  {
    date: "March 3, 2025",
    title: "Analytics data sync delay — resolved",
    severity: "Minor",
    severityColor: "bg-yellow-500/20 text-yellow-400",
    description: "Analytics data was not refreshing for some users. The issue was resolved with a database cache flush. No data was lost.",
    duration: "45m",
    resolved: true,
  },
]

const UPTIME_DAYS = Array.from({ length: 90 }, (_, i) => {
  const rand = Math.random()
  if (rand > 0.97) return "incident"
  if (rand > 0.94) return "degraded"
  return "operational"
})

const dayColors: Record<string, string> = {
  operational: "bg-green-400",
  degraded: "bg-yellow-400",
  incident: "bg-red-400",
}

export default function StatusPage() {
  const allOperational = SERVICES.every(s => s.status === "operational")

  return (
    <div className="pt-24 min-h-screen">
      <section className="py-20 px-6">
        <div className="max-w-[800px] mx-auto">

          {/* Header */}
          <FadeUp className="text-center mb-14">
            <h1 className="text-5xl font-extrabold text-white mb-4">System Status</h1>
            <p className="text-white/50">Real-time status of all Qalam services. Updated every 60 seconds.</p>
          </FadeUp>

          {/* Overall status banner */}
          <FadeUp delay={0.1}>
            <div className={`rounded-2xl p-6 flex items-center gap-4 mb-10 ${
              allOperational
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-yellow-500/10 border border-yellow-500/20"
            }`}>
              <div className={`w-4 h-4 rounded-full flex-shrink-0 ${allOperational ? "bg-green-400" : "bg-yellow-400"}`} />
              <div>
                <p className={`font-bold text-lg ${allOperational ? "text-green-400" : "text-yellow-400"}`}>
                  {allOperational ? "All systems operational" : "Partial service disruption"}
                </p>
                <p className="text-white/50 text-sm">Last checked: just now</p>
              </div>
            </div>
          </FadeUp>

          {/* Services */}
          <FadeUp delay={0.15}>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden mb-10">
              <div className="px-7 py-4 border-b border-white/10">
                <h2 className="text-white font-bold">Services</h2>
              </div>
              {SERVICES.map((service, i) => (
                <div
                  key={service.name}
                  className={`px-7 py-4 flex items-center justify-between ${
                    i < SERVICES.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="text-white/80 text-sm font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-white/30 text-xs hidden sm:block">{service.uptime} uptime</span>
                    <span className="text-green-400 text-xs font-semibold capitalize">{service.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>

          {/* 90-day uptime */}
          <FadeUp delay={0.2}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7 mb-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold">90-day uptime</h2>
                <span className="text-green-400 text-sm font-semibold">99.97% avg</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {UPTIME_DAYS.map((day, i) => (
                  <div
                    key={i}
                    className={`w-2 h-8 rounded-sm opacity-80 ${dayColors[day]}`}
                    title={day}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-3 text-white/25 text-xs">
                <span>90 days ago</span>
                <span>Today</span>
              </div>
              <div className="flex gap-5 mt-4">
                {Object.entries(dayColors).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-sm ${color}`} />
                    <span className="text-white/30 text-xs capitalize">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          {/* Past incidents */}
          <FadeUp delay={0.25}>
            <h2 className="text-white font-bold text-xl mb-5">Past Incidents</h2>
            {INCIDENTS.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/40">
                No incidents in the past 90 days. 🎉
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {INCIDENTS.map((incident, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-7">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${incident.severityColor}`}>
                            {incident.severity}
                          </span>
                          {incident.resolved && (
                            <span className="text-xs text-green-400 font-medium">✓ Resolved</span>
                          )}
                        </div>
                        <h3 className="text-white font-semibold">{incident.title}</h3>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white/30 text-xs">{incident.date}</p>
                        <p className="text-white/30 text-xs">Duration: {incident.duration}</p>
                      </div>
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed">{incident.description}</p>
                  </div>
                ))}
              </div>
            )}
          </FadeUp>

          {/* Subscribe */}
          <FadeUp delay={0.3}>
            <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-7 text-center">
              <p className="text-white font-semibold mb-1">Get notified of incidents</p>
              <p className="text-white/40 text-sm mb-4">Subscribe to email or SMS updates for any service disruption.</p>
              <div className="flex gap-3 max-w-sm mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-gold/50"
                />
                <button className="px-4 py-2.5 bg-teal text-white text-sm font-semibold rounded-xl hover:bg-teal-600 transition-colors whitespace-nowrap">
                  Subscribe
                </button>
              </div>
            </div>
          </FadeUp>

        </div>
      </section>
    </div>
  )
}
