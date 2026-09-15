import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata } from "@/lib/seo"

export const metadata = buildPageMetadata({
  title: "Changelog: Product Updates and Release Notes",
  description: "Public product notes for Qalam changes that affect positioning, trust, workflow, or behavior.",
  path: "/changelog",
})

const UPDATES = [
  {
    date: "September 2026",
    title: "Agency operations: client links, My Desk, Voice Passport, and proof reports",
    items: [
      "Clients connect LinkedIn through a private, single-use link and approve access on LinkedIn's own page. No password sharing and no Qalam account needed.",
      "Seven days before a client's LinkedIn access expires, the client is emailed a fresh connect link and workspace managers are alerted.",
      "My Desk gives writers one queue across every assigned client: failed posts, client change requests, approved drafts, fresh client answers, and what goes out this week.",
      "The Agency Hub Control Room shows posting cadence, weekly streaks, approval waits, and LinkedIn status per client, with problems sorted to the top.",
      "Clients can comment on the exact line of a draft. Agencies can agree an optional no-reply approval window, and the client always gets a heads-up two hours before a draft is treated as approved.",
      "Voice Passport stores the rules a team saves for each client (always, never, banned words, corrections), and every generation in that workspace follows them. Qalam does not add rules on its own.",
      "Voice Drop sends a client one question by email; they answer by typing or recording a voice note, which is transcribed and the audio discarded.",
      "Proof reports share a frozen, private summary of posts published through Qalam and their synced LinkedIn metrics. Posts without synced metrics are listed but never estimated.",
      "Pitch Mode turns a prospect's pasted public posts into three sample drafts behind a private preview link. The pasted posts are not stored.",
    ],
  },
  {
    date: "September 2026",
    title: "ATS resume fixes now apply, and scoring is calibrated against a real test resume",
    items: [
      "Fixed the Review and Apply Fix flow: it was rendering blank fields and doing nothing. It now shows the exact line costing points, three AI rewrites scored for their real point impact, and a bracketed prompt for any figure only the candidate knows - Qalam never invents a number.",
      "Recalibrated the readiness score against a resume scored 76/100 by a competitor's checker. A resume with no measurable results, no job-description match, or no reachable contact details is now capped well below the competitive band, regardless of how clean the formatting is. The cap and its reason are shown next to the score.",
      "Fixed keyword extraction dropping multi-word requirements such as \"labour law compliance\" into disconnected fragments, and fixed bullets with a real count (\"18 contracts\", \"450 workers\") not being recognized as quantified evidence.",
      "Job-description tailoring now rewrites the headline, summary, skills, and bullets around the posting instead of returning the source resume nearly untouched with only the headline changed.",
      "Added public documentation of what each score band means, when a score is capped and why, and the outside standards and research (HR Open Standards, Europass CV, ISO 24495-1 Plain Language, O*NET/ESCO, the Ladders eye-tracking study, STAR/XYZ) each scoring factor is written against.",
    ],
  },
  {
    date: "July 2026",
    title: "Career Hub, publishing hardening, and plan gating",
    items: [
      "Shipped Career Hub inside the app: LinkedIn positioning audits, ATS resume reviews, and JD-matched resume generation, all plan-gated per the pricing table.",
      "Added DOCX and PDF resume parsing on upload so users can bring existing resumes without retyping.",
      "Fixed marketing navbar and footer leaking into the Career Hub app route.",
      "Introduced plan priority resolution and identity helper so downgrades, complimentary trials, and admin grants resolve to the correct active plan across every surface.",
      "Tightened carousel plan gating so Free and Solo cannot bypass the per-plan slide and monthly limits.",
      "Repaired LinkedIn profile fetch and publishing edge cases surfaced during the visibility suite rollout.",
      "Added quarterly billing pricing across Solo, Pro, and Agency, with the pricing page and comparison table sourcing values from a single config.",
      "Lemon Squeezy checkout wired end-to-end with signed custom tokens so webhook attribution cannot be spoofed by editing checkout query params.",
    ],
  },
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
      "Rate limiting migrated to Upstash Redis so limits persist across instances and restarts.",
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
    <div data-nav-ground="dark" data-nav-hero="dark" className="min-h-screen bg-teal-900 pt-24">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <FadeUp className="mb-14">
            <span className="chip mb-5 inline-flex border-white/20 bg-white/5 text-white/70">
              Product Notes
            </span>
            <h1 className="mb-4 text-5xl font-extrabold text-white">Changelog</h1>
            <p className="text-lg leading-relaxed text-white/65">
              Public-facing changes that affect positioning, trust, workflow, or product behavior.
            </p>
          </FadeUp>

          <div className="space-y-6">
            {UPDATES.map((update, i) => (
              <FadeUp key={update.title} delay={i * 0.08}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                  <p className="mb-3 text-sm font-semibold text-gold-200">{update.date}</p>
                  <h2 className="mb-4 text-2xl font-bold text-white">{update.title}</h2>
                  <ul className="space-y-3 text-sm leading-relaxed text-white/65">
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
