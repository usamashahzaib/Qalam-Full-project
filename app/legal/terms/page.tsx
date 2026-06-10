import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service | Qalam",
  description: "Qalam Terms of Service",
  robots: { index: false, follow: false },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-24">
      <div className="mx-auto max-w-[720px]">
        <Link href="/" className="mb-8 inline-block text-sm font-semibold text-teal hover:text-teal-700">
          &larr; Back to Qalam
        </Link>

        <h1 className="mb-3 text-4xl font-extrabold text-zinc-900">Terms of Service</h1>
        <p className="mb-10 text-sm text-zinc-400">Last updated: June 2025</p>

        <div className="prose prose-zinc max-w-none space-y-8 text-zinc-700">
          <section>
            <h2 className="text-xl font-bold text-zinc-900">1. Acceptance</h2>
            <p>By using Qalam (byqalam.com), you agree to these terms. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">2. Service Description</h2>
            <p>Qalam is a LinkedIn content creation and publishing tool. Features include AI writing, voice training, scheduling, carousels, and analytics.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">3. Your Content</h2>
            <p>You own all content you create. Qalam does not read, share, or sell your drafts or posts. LinkedIn data is used solely for publishing actions you authorize.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">4. Account Responsibility</h2>
            <p>You are responsible for keeping your account credentials secure. Do not share your account with others.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">5. Payments</h2>
            <p>Paid plans are activated upon receipt of payment via JazzCash, Easypaisa, or bank transfer. Refunds are not guaranteed but considered on a case-by-case basis. Contact hello@byqalam.com for payment issues.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">6. Termination</h2>
            <p>We may suspend accounts that violate these terms or are used for spam. You may cancel your account at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">7. Limitation of Liability</h2>
            <p>Qalam is provided as-is. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">8. Contact</h2>
            <p>For any questions about these terms, contact us at <a href="mailto:hello@byqalam.com" className="text-teal underline">hello@byqalam.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
