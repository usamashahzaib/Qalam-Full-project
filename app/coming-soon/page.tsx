import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { comingSoon } from "@/lib/frozen-surfaces"
import { UPGRADES_EMAIL } from "@/lib/contact"
import { APP_URL, buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Coming Soon to Qalam",
  description: "Qalam does one job right now: LinkedIn posts for one person. Agency workspaces, career tools and more are switched off until that job is done well.",
  path: "/coming-soon",
})

export default function ComingSoonPage() {
  const items = comingSoon()
  if (!items.length) notFound()

  return (
    <main className="min-h-screen bg-[#fafaf8] px-4 pb-20 pt-32 sm:px-6">
      <div className="mx-auto max-w-[800px]">
        <p className="t-eyebrow text-teal">Coming soon</p>
        <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-5xl">More is on the way. The writer comes first.</h1>
        <p className="mt-5 max-w-[62ch] text-base leading-8 text-zinc-600 sm:text-lg">
          Right now Qalam does one job: LinkedIn posts for one person, in that person&apos;s voice. These parts are built or partly built, and they are switched off until that job is done well. We have not set dates, so we won&apos;t quote any.
        </p>

        <div className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
          {items.map((item) => (
            <section key={item.surface} id={item.surface} className="scroll-mt-28 py-7">
              <h2 className="text-xl font-bold text-zinc-900">{item.name}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-600">{item.copy}</p>
              {item.ask ? (
                <p className="mt-3 text-sm leading-7 text-zinc-700">
                  {item.ask}{" "}
                  <a href={`mailto:${UPGRADES_EMAIL}?subject=${encodeURIComponent(item.name)}`} className="font-semibold text-teal underline underline-offset-2">{UPGRADES_EMAIL}</a>
                </p>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={`${APP_URL}/signup`} className="press rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white">Write a post free</Link>
          <Link href="/features" className="press rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700">See what works today</Link>
        </div>
      </div>
    </main>
  )
}
