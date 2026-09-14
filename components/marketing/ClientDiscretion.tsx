import Link from "next/link"

// Why no client names, faces, or logos appear anywhere on the site.
// CLIENT_WORDS is intentionally empty: only add feedback a real client actually
// gave, in their words, with their OK. Never write it on their behalf.

export type ClientWord = {
  quote: string
  /** Kind of work, never a name or company. e.g. "LinkedIn ghostwriter" */
  role: string
  country: string
  /** Optional, e.g. "Using Qalam for 4 months" */
  tenure?: string
}

export const CLIENT_WORDS: ClientWord[] = []

export const CLIENT_DISCRETION_NOTE =
  "Most people who use Qalam publish under their own name. Some are founders, some write for executives, some run agencies for clients who never want it known that anyone helps them write. So we keep it simple: we never show who our clients are, and we never show whose content was written with Qalam. Not on this site, not in sales calls, not in case studies."

const promises = [
  [
    "No names, faces, or logos",
    "You will not find a client list here, and you will not hear one from us on a call. That applies to every plan, including free.",
  ],
  [
    "We do not point people to your posts",
    "We do not identify your posts as work made with Qalam. If you write for someone else, we keep their name and work out of our marketing too.",
  ],
  [
    "Your work is never our example",
    "We do not turn your drafts into case studies, screenshots, or samples for other clients. Every example on this site is labelled demo or sample data.",
  ],
]

function initials(role: string) {
  return role
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
}

export function ClientDiscretion({ variant = "full" }: { variant?: "full" | "compact" }) {
  const hasWords = CLIENT_WORDS.length > 0

  return (
    <section className="border-y border-zinc-200 bg-white px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">Why you will not see client names</p>
            <h2 className="t-h2 mt-4 max-w-md text-teal">Your name and your work stay out of our marketing.</h2>
            <p className="t-lead mt-5 max-w-lg text-zinc-600">{CLIENT_DISCRETION_NOTE}</p>
            {hasWords ? (
              <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-500">
                The words below are theirs. The names stay with them.
              </p>
            ) : null}
          </div>

          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {promises.map(([title, copy]) => (
              <div key={title} className="py-6">
                <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-teal/15 bg-teal/5 p-6 sm:p-8">
          <h3 className="text-lg font-bold text-teal">What we have heard from clients</h3>
          <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-700">
            Clients in Russia, the UK, Canada, Australia, and the US have shared positive feedback with us in conversation. They prefer to keep their identities private, and we respect that.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            These conversations were oral, so we are sharing a summary rather than putting words in quotation marks. You can try the demo and judge the writing for yourself.
          </p>
        </div>

        {hasWords ? (
          <ul className={`mt-14 grid gap-5 ${variant === "compact" ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {(variant === "compact" ? CLIENT_WORDS.slice(0, 2) : CLIENT_WORDS).map((item) => (
              <li key={item.quote} className="panel-raised flex flex-col p-7">
                <blockquote className="flex-1 text-base leading-7 text-zinc-800">&ldquo;{item.quote}&rdquo;</blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                    {initials(item.role)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{item.role}</p>
                    <p className="text-xs text-zinc-500">
                      {item.country}
                      {item.tenure ? `, ${item.tenure}` : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {variant === "full" ? (
          <p className="mt-10 text-sm leading-6 text-zinc-600">
            Want to check the product without taking anyone&apos;s word for it?{" "}
            <Link href="/demo" className="inline-flex min-h-11 items-center font-bold text-teal underline decoration-gold decoration-2 underline-offset-4">
              Open the demo
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}
