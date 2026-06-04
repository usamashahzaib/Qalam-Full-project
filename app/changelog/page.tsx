import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "Changelog",
  description: "Public product notes for Qalam changes that affect positioning, trust, workflow, or behavior.",
  path: "/changelog",
})

const UPDATES = [
  {
    date: "May 2026",
    title: "Security hardening and agency hub",
    items: [
      "LinkedIn access token removed from session cookie - stored exclusively in Supabase via server-side credentials table.",
      "Cron analytics endpoint redesigned: no longer relies on browser cookies, now queries all connected users from the database using CRON_SECRET verification.",
      "Agency Hub wired to real database (agency_clients table with RLS). Fake mock clients removed.",
      "Workspace save loop replaced with single batch upsert - eliminates N+1 write pattern at scale.",
      "Background Sync tag now registered in PWA so offline replay actually fires when connectivity returns.",
      "Service worker updated: replaced unreliable navigator.onLine check with try/catch fetch pattern.",
    ],
  },
  {
    date: "May 2026",
    title: "Infrastructure and dead route cleanup",
    items: [
      "Deleted dead /write redirect folder that competed with the config-level 308 redirect.",
      "Purged committed dev log files from the repository. *.log already excluded in .gitignore.",
      "Fixed import ordering violation in app-session.ts.",
      "Rate limiter WARNING comment added - known in-memory limitation pending Upstash/KV migration.",
    ],
  },
  {
    date: "May 2026",
    title: "Positioning and pricing cleanup",
    items: [
      "Synced plan data across landing, pricing, schema, and CTAs.",
      "Removed fabricated ratings and fake enterprise proof.",
      "Added honest plan comparison language around voice profile, archive, and agency workflows.",
    ],
  },
  {
    date: "May 2026",
    title: "Free tools and support surfaces",
    items: [
      "Shipped working public tools for hooks, headline analysis, profile scoring, viral checks, carousel outlines, and engagement heuristics.",
      "Replaced dead links with real routes or explicit current-state copy.",
    ],
  },
  {
    date: "May 2026",
    title: "Trust pass across brand surfaces",
    items: [
      "Standardized Qalam branding across major pages while keeping byqalam.com as the domain.",
      "Reworked auth, legal, and support surfaces to avoid invented company history or fake traction claims.",
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-teal-900 pt-24">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <FadeUp className="mb-14">
            <span className="chip mb-5 inline-flex border-white/20 bg-white/5 text-white/70">
              Product Notes
            </span>
            <h1 className="mb-4 text-5xl font-extrabold text-white">Changelog</h1>
            <p className="text-lg leading-relaxed text-white/55">
              Public-facing changes that affect positioning, trust, workflow, or product behavior.
            </p>
          </FadeUp>

          <div className="space-y-6">
            {UPDATES.map((update, i) => (
              <FadeUp key={update.title} delay={i * 0.08}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                  <p className="mb-3 text-sm font-semibold text-gold">{update.date}</p>
                  <h2 className="mb-4 text-2xl font-bold text-white">{update.title}</h2>
                  <ul className="space-y-3 text-sm leading-relaxed text-white/55">
                    {update.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="font-bold text-gold">-</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
