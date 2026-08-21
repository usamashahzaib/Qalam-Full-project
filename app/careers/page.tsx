import { FadeUp } from "@/components/FadeUp"
import { buildPageMetadata } from "@/lib/seo"
import { UPGRADES_EMAIL } from "@/lib/contact"

export const metadata = buildPageMetadata({
  title: "Careers",
  description: "Public careers contact for Qalam while a formal hiring portal is not active.",
  path: "/careers",
})

export default function CareersPage() {
  return (
    <div data-nav-ground="dark" data-nav-hero="dark" className="min-h-screen bg-teal-900 pt-24">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          <FadeUp className="mb-10 text-center">
            <span className="chip mb-5 inline-flex border-white/20 bg-white/5 text-white/70">
              Careers
            </span>
            <h1 className="mb-4 text-5xl font-extrabold text-white">Careers</h1>
            <p className="text-lg leading-relaxed text-white/55">
              Formal public hiring is not active. This page stays minimal rather than inventing roles,
              perks, or traction.
            </p>
          </FadeUp>

          <FadeUp>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="mb-3 font-semibold text-white">Interested anyway?</p>
              <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-white/55">
                Send a concise note, your role focus, and links to relevant work.
              </p>
              <a
                href={`mailto:${UPGRADES_EMAIL}`}
                className="inline-flex items-center justify-center rounded-xl bg-teal px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-600"
              >
                {UPGRADES_EMAIL}
              </a>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
