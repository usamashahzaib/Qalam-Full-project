import type { Metadata } from "next"
import Link from "next/link"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Qalam terms of service for AI LinkedIn writing, content ownership, payments, account use, and publishing responsibilities.",
  path: "/legal/terms",
  keywords: ["Qalam terms", "Qalam terms of service", "AI LinkedIn writer terms", "Qalam legal"],
})

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-24">
      <div className="mx-auto max-w-[720px]">
        <Link href="/" className="mb-8 inline-block text-sm font-semibold text-teal hover:text-teal-700">
          &larr; Back to Qalam
        </Link>

        <h1 className="mb-3 text-4xl font-extrabold text-zinc-900">Terms of Service</h1>
        <p className="mb-10 text-sm text-zinc-400">Last updated: June 2026</p>

        <div className="space-y-8 text-zinc-700">

          <section>
            <h2 className="text-xl font-bold text-zinc-900">1. Acceptance</h2>
            <p>By accessing or using Qalam (byqalam.com), you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to any part of these terms, you must not use the service. These terms constitute a legally binding agreement between you and Qalam.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">2. Service Description</h2>
            <p>Qalam is an AI-assisted content drafting and publishing workflow tool designed for LinkedIn professionals. The service provides AI writing assistance, voice profile configuration, draft storage, hook management, content scheduling, and workspace tools. Qalam is a software tool that assists human writers - it does not publish content autonomously, scrape data, or perform automated actions on any platform without explicit, real-time user authorization.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">3. Third-Party Platforms - LinkedIn Disclaimer</h2>
            <p className="font-semibold text-zinc-900">Qalam is an independent product. It is not affiliated with, endorsed by, sponsored by, or in any way officially connected to LinkedIn Corporation or its parent company Microsoft.</p>
            <p className="mt-3">When you connect your LinkedIn account, you authorize Qalam to act on your behalf using LinkedIn&apos;s official API and only for the specific actions you initiate within the app (such as posting a draft you have reviewed and approved).</p>
            <p className="mt-3">You are solely responsible for ensuring that your use of Qalam complies with LinkedIn&apos;s <a href="https://www.linkedin.com/legal/user-agreement" target="_blank" rel="noopener noreferrer" className="text-teal underline">User Agreement</a>, <a href="https://www.linkedin.com/legal/professional-community-policies" target="_blank" rel="noopener noreferrer" className="text-teal underline">Professional Community Policies</a>, and all other LinkedIn platform rules. Qalam has no control over LinkedIn&apos;s decisions regarding your account.</p>
            <p className="mt-3 font-semibold text-zinc-900">Qalam is not responsible - in any way - for any LinkedIn account restriction, suspension, ban, or removal of features, whether or not you were using Qalam at the time. LinkedIn independently enforces its own policies and may take action on any account at its discretion.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">4. AI-Generated Content</h2>
            <p>Qalam uses AI models to generate draft content based on your inputs. You acknowledge and agree that:</p>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>All AI-generated output is a draft for your review. You are responsible for reading, editing, and approving any content before it is published.</li>
              <li>Qalam does not guarantee that AI-generated content is accurate, factually correct, original, or free from bias.</li>
              <li>You own the content you publish. You are solely responsible for what you choose to post publicly, including any legal liability arising from that content.</li>
              <li>You must not use Qalam to generate content that is defamatory, fraudulent, misleading, harassing, or in violation of any applicable law or platform policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">5. Acceptable Use</h2>
            <p>You agree not to use Qalam to:</p>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Generate or distribute spam, unsolicited messages, or bulk outreach content.</li>
              <li>Impersonate any person, organization, or entity.</li>
              <li>Violate any applicable law, regulation, or third-party platform policy.</li>
              <li>Attempt to reverse-engineer, scrape, or extract any part of the Qalam platform or its underlying AI systems.</li>
              <li>Use the service to create content that harasses, threatens, or harms any individual or group.</li>
              <li>Share account credentials or allow unauthorized access to your workspace.</li>
            </ul>
            <p className="mt-3">We may suspend or permanently terminate accounts that violate this section without prior notice or refund.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">6. Your Content</h2>
            <p>You retain full ownership of all content you create using Qalam. Qalam does not claim any intellectual property rights over your drafts, posts, or voice data. Your content is private to your workspace and is never sold or shared with third parties. LinkedIn data obtained through your authorization is used solely to fulfill the specific publishing actions you initiate.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">7. Account Responsibility</h2>
            <p>You are responsible for maintaining the security of your Qalam account credentials. You must not share your account with other individuals. You are responsible for all activity that occurs under your account. Notify us immediately at <a href="mailto:info@byqalam.com" className="text-teal underline">info@byqalam.com</a> if you suspect unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">8. Payments and Refunds</h2>
            <p>Paid plans are sold as recurring subscriptions and are processed by our payment provider, Lemon Squeezy, which acts as merchant of record. Card payments activate the plan automatically. Where payment is instead made by JazzCash, Easypaisa, or bank transfer, the plan is activated manually after we verify receipt. Prices and card transactions are charged in Pakistani Rupees (PKR). Subscriptions renew on the cycle agreed at the time of purchase until cancelled.</p>
            <p className="mt-3">Refunds are not automatically guaranteed. We will consider refund requests on a case-by-case basis for documented technical failures on our part. Contact <a href="mailto:info@byqalam.com" className="text-teal underline">info@byqalam.com</a> within 7 days of a payment dispute. Dissatisfaction with AI output quality or a decision to stop using the service does not entitle you to a refund.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">9. Service Availability</h2>
            <p>We aim to keep Qalam available at all times but do not guarantee uninterrupted access. Planned and unplanned maintenance, third-party API outages (including LinkedIn, AI providers), or infrastructure incidents may cause temporary unavailability. We are not liable for any losses resulting from service downtime.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">10. Termination</h2>
            <p>You may terminate your account at any time by contacting us. We reserve the right to suspend or terminate accounts that violate these terms, engage in abusive behavior, or are used to harm other users or the platform. Upon termination, your data will be retained for up to 30 days before deletion unless an earlier deletion is requested.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">11. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless Qalam and its operators, employees, and service providers from and against any and all claims, damages, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to: (a) your use of the service; (b) content you create or publish using Qalam; (c) your violation of these terms; or (d) your violation of any third-party rights, including LinkedIn&apos;s platform policies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">12. Limitation of Liability</h2>
            <p>Qalam is provided &ldquo;as is&rdquo; without warranties of any kind, whether express or implied. To the maximum extent permitted by applicable law:</p>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Qalam is not liable for any indirect, incidental, special, consequential, or punitive damages.</li>
              <li>Qalam is not liable for any loss of data, revenue, business, or goodwill.</li>
              <li>Qalam is not liable for any action taken by LinkedIn or any other third-party platform against your account.</li>
              <li>Qalam&apos;s total liability to you for any claim arising from these terms or your use of the service shall not exceed the total amount you paid to Qalam in the three months preceding the claim.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">13. Changes to These Terms</h2>
            <p>We may update these terms from time to time. The updated version will be posted at this URL with a revised date. Your continued use of Qalam after any changes constitutes your acceptance of the new terms. For material changes, we will make a reasonable effort to notify active users by email.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">14. Governing Law</h2>
            <p>These terms are governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. Any dispute arising from these terms shall be subject to the exclusive jurisdiction of the courts of Karachi, Pakistan.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900">15. Contact</h2>
            <p>For any questions about these terms, contact us at <a href="mailto:info@byqalam.com" className="text-teal underline">info@byqalam.com</a>.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
