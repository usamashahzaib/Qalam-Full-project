import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "Status: Service Reliability and Incident History",
  description: "Current public operating note for Qalam reliability, incidents, and support escalation.",
  path: "/status",
})

export default function StatusPage() {
  return (
    <div data-nav-ground="dark" data-nav-hero="dark" className="min-h-screen bg-teal-900 pt-24">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <FadeUp className="mb-10 text-center">
            <span className="chip mb-5 inline-flex border-white/20 bg-white/5 text-white/70">
              Status
            </span>
            <h1 className="mb-4 text-5xl font-extrabold text-white">System Status</h1>
            <p className="text-lg leading-relaxed text-white/55">
              Public status is manual right now. We do not publish invented uptime charts or fake
              incident history.
            </p>
          </FadeUp>

          <div className="space-y-4">
            <FadeUp>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <p className="mb-2 font-semibold text-white">Current public note</p>
                <p className="text-sm leading-relaxed text-white/55">
                  No active public incident is being announced from this route at the moment.
                </p>
              </div>
            </FadeUp>
            <FadeUp delay={0.05}>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <p className="mb-2 font-semibold text-white">How updates work today</p>
                <p className="text-sm leading-relaxed text-white/55">
                  If a production issue affects customers, updates should go through direct support or
                  customer channels until an automated status pipeline is live.
                </p>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>
    </div>
  )
}
