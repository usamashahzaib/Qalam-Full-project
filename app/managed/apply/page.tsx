import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { FadeUp } from "@/components/FadeUp"
import { ManagedApplyForm } from "@/components/ManagedApplyForm"
import { buildPageMetadata } from "@/lib/seo"
import { AGENCY_PLAN_LIVE, MANAGED_PLANS, formatPrice } from "@/lib/pricing"

export const metadata: Metadata = buildPageMetadata({
  title: "Apply for Managed LinkedIn Services",
  description:
    "Apply for Qalam's done-for-you LinkedIn management - we write, design, and post on your behalf with client approval built in.",
  path: "/managed/apply",
  keywords: ["managed LinkedIn services", "done-for-you LinkedIn", "LinkedIn ghostwriting service"],
})

export default async function ManagedApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const requestedPlan = typeof params.plan === "string" ? params.plan : undefined
  const isAgency = requestedPlan === "Agency" && AGENCY_PLAN_LIVE
  if (requestedPlan === "Agency" && !AGENCY_PLAN_LIVE) {
    redirect("/pricing")
  }
  const defaultPackage = isAgency ? "Agency" : MANAGED_PLANS.find((p) => p.name === requestedPlan)?.name
  const defaultAccountType = params.type === "company" ? "company" : "individual"

  return (
    <div className="min-h-screen bg-zinc-50 pt-24">
      <section className="border-b border-zinc-100 bg-white px-6 py-16">
        <div className="mx-auto max-w-[980px]">
          <FadeUp>
            <span className="chip mb-5 inline-flex border-gold/40 bg-gold/5 text-gold">{isAgency ? "Agency Plan" : "Managed Services"}</span>
            <h1 className="mb-5 max-w-3xl text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
              {isAgency ? "Run five LinkedIn clients without mixing their voices." : "We write and post for you. You just approve."}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-zinc-600">
              {isAgency
                ? "Agency is $19/month and $38 billed quarterly. Apply below for workspace activation."
                : "For founders and executives who want a consistent LinkedIn presence without doing the writing. Discounted monthly pricing is shown below. Apply and we'll confirm fit and a start date within one business day."}
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto grid max-w-[980px] gap-8 md:grid-cols-[.9fr_1.1fr]">
          <FadeUp>
            <div className="space-y-4">
              {(isAgency ? [] : MANAGED_PLANS).map((plan) => (
                <div key={plan.name} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold-700">{plan.name}</p>
                  <p className="mt-2 text-sm text-zinc-400"><span className="line-through">{formatPrice(plan.originalMonthlyPrice)}</span> <span className="ml-1 font-semibold text-emerald-700">Discounted</span></p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">{formatPrice(plan.monthlyPrice)}<span className="text-sm font-medium text-zinc-500">/mo</span></p>
                  <p className="mt-2 text-sm text-zinc-600">{plan.description}</p>
                  <ul className="mt-4 space-y-1.5 text-xs text-zinc-500">
                    {plan.features.map((f) => <li key={f}>- {f}</li>)}
                  </ul>
                </div>
              ))}
              {isAgency && (
                <div className="rounded-2xl border border-teal/30 bg-teal/5 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gold-700">Agency</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">$19<span className="text-sm font-medium text-zinc-500">/month</span></p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">$38 quarterly - 1 month free</p>
                  <ul className="mt-4 space-y-1.5 text-xs text-zinc-600">
                    {["5 client workspaces", "5 seats and configurable voice profiles", "300 posts and 50 carousels/month", "Optional approvals, publishing, and per-workspace analytics", "20 JD-matched resumes/month"].map((item) => <li key={item}>- {item}</li>)}
                  </ul>
                </div>
              )}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-600 shadow-sm">
                <p className="font-semibold text-zinc-900">How it works</p>
                <p className="mt-2">We draft from your voice and goals, send drafts for your approval, then post on schedule. You keep full sign-off before anything goes live.</p>
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <ManagedApplyForm defaultPackage={defaultPackage} defaultAccountType={defaultAccountType} />
          </FadeUp>
        </div>
      </section>
    </div>
  )
}
