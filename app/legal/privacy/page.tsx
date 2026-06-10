import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy | Qalam",
  description: "Qalam Privacy Policy",
  robots: { index: false, follow: false },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-24">
      <div className="mx-auto max-w-[720px]">
        <Link href="/" className="mb-8 inline-block text-sm font-semibold text-teal hover:text-teal-700">
          &larr; Back to Qalam
        </Link>

        <h1 className="mb-3 text-4xl font-extrabold text-zinc-900">Privacy Policy</h1>
        <p className="mb-10 text-sm text-zinc-400">Last updated: June 2025</p>

        <div className="prose prose-zinc max-w-none space-y-8 text-zinc-700">
          <section>
            <h2 className="text-xl font-bold text-zinc-900">1. What We Collect</h2>
            <p>We collect your email address, name, and LinkedIn profile information (when you connect LinkedIn). We store drafts and posts you create inside Qalam.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">2. How We Use Your Data</h2>
            <p>Your data is used to power your Qalam workspace: AI writing, voice training, post history, and scheduling. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">3. Your Content Privacy</h2>
            <p>Your drafts are private. No one at Qalam reads your content. Your posts and ideas stay within your workspace unless you publish them.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">4. LinkedIn Data</h2>
            <p>LinkedIn data (profile info, publishing permissions) is used only to enable posting on your behalf. We request the minimum required permissions. You can revoke access from your LinkedIn settings at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">5. Cookies</h2>
            <p>We use session cookies to keep you signed in. No advertising or tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">6. Data Security</h2>
            <p>We use industry-standard encryption for data in transit and at rest. Access to your data is restricted to essential systems only.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">7. Data Deletion</h2>
            <p>You may request deletion of your account and all associated data by emailing <a href="mailto:hello@byqalam.com" className="text-teal underline">hello@byqalam.com</a>. We will process deletion requests within 7 business days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">8. Contact</h2>
            <p>For privacy questions, contact us at <a href="mailto:hello@byqalam.com" className="text-teal underline">hello@byqalam.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
