import Link from "next/link"
import { SUPPORT_EMAIL } from "@/lib/contact"
import { InstagramIcon, LinkedInIcon } from "@/components/ui/qalam-icons"
import { QalamLogo } from "@/components/QalamLogo"
import { alphabetical } from "@/lib/sort"

const byLabel = (link: { label: string }) => link.label

// Grouped by the positioning hierarchy rather than one flat product list.
// Career and ATS surfaces keep their links and internal equity, but they no
// longer sit above the publishing product in the footer's reading order.
const FOOTER_LINKS = {
  Product: [
    { label: "All Features", href: "/features" },
    { label: "Content Studio", href: "/product/post-writer" },
    { label: "Voice Profile", href: "/product/voice-profile" },
    { label: "Hook Generator", href: "/product/hook-generator" },
    { label: "Comment Generator", href: "/product/comment-generator" },
    { label: "Post Scheduler", href: "/product/post-scheduler" },
    { label: "LinkedIn Extension", href: "/linkedin-extension" },
    { label: "Agency Workspaces", href: "/product/agency-workspaces" },
    { label: "LinkedIn Optimizer", href: "/linkedin-optimization" },
  ],
  "Career and ATS": alphabetical([
    { label: "ATS Resume Builder", href: "/ats-resume-builder" },
    { label: "ATS Resume Score", href: "/ats-resume-score" },
    { label: "ATS Scoring Methodology", href: "/methodology/ats-resume-readiness" },
    { label: "Career Visibility", href: "/career-visibility" },
    { label: "Free ATS Resume Checker", href: "/free-tools/ats-resume-checker" },
    { label: "Job Description Match", href: "/job-description-match" },
    { label: "Resume Keyword Match", href: "/resume-keyword-match" },
  ], byLabel),
  "Use Cases": alphabetical([
    { label: "All Industries", href: "/industries" },
    { label: "Agencies", href: "/use-cases/agencies" },
    { label: "Career Coaches", href: "/use-cases/career-coaches" },
    { label: "Consultants", href: "/use-cases/consultants" },
    { label: "Founders", href: "/use-cases/founders" },
    { label: "HR Leaders", href: "/use-cases/hr-leaders" },
    { label: "Job Seekers", href: "/use-cases/job-seekers" },
    { label: "Marketing Teams", href: "/use-cases/marketing-teams" },
    { label: "Recruiters", href: "/use-cases/recruiters" },
    { label: "Universities", href: "/use-cases/universities" },
  ], byLabel),
  Resources: [
    { label: "Free Tools", href: "/free-tools" },
    { label: "Interactive Demo", href: "/demo" },
    { label: "Documentation", href: "/docs" },
    { label: "Scoring Methodology", href: "/methodology/linkedin-authority-score" },
    { label: "LinkedIn Headline Examples", href: "/linkedin-headline-examples" },
    { label: "Blog", href: "/blog" },
    { label: "Changelog", href: "/changelog" },
    { label: "System Status", href: "/status" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Partnerships", href: "/partners" },
    { label: "Pricing", href: "/pricing" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Terms of Service", href: "/legal/terms" },
  ],
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white/60 transition-all duration-200 hover:border-white/20 hover:bg-white/8 hover:text-[oklch(0.85_0.05_85)]"
    >
      {children}
    </a>
  )
}

export function Footer() {
  return (
    <footer data-nav-ground="dark" className="qlx qlx-surface border-t border-white/10">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="mb-12 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-7">
          <div className="sm:col-span-3 lg:col-span-1">
            <QalamLogo
              href="/"
              size={36}
              containerClassName="mb-4 flex min-h-11 items-center gap-2"
              textClassName="text-lg font-bold text-white"
            />
            <p className="mb-5 text-sm leading-relaxed text-white/55">
              A LinkedIn publishing system with voice memory. Draft, review, approve, and schedule from writing examples you save.
            </p>
            <div className="flex gap-2">
              <SocialLink href="https://www.instagram.com/withqalam" label="Instagram">
                <InstagramIcon className="h-4 w-4" />
              </SocialLink>
              <SocialLink href="https://www.linkedin.com/company/withqalam" label="LinkedIn">
                <LinkedInIcon className="h-4 w-4" />
              </SocialLink>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <div className="hidden sm:block">
                {/* h2, not h4. These are the top-level headings inside the
                    footer landmark, and pages usually end on an h2, so h4
                    skipped a rank on every route in the site. */}
                <h2 className="mb-4 text-sm font-semibold text-white/90">{section}</h2>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="inline-flex min-h-11 min-w-11 items-center text-sm text-white/55 transition-colors hover:text-[oklch(0.85_0.05_85)]">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <details className="group border-t border-white/10 sm:hidden">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold text-white/90">
                  {section}
                  <span className="relative flex h-5 w-5 shrink-0 items-center justify-center text-white/70 transition-transform duration-300 group-open:rotate-180" aria-hidden="true"><span className="absolute h-0.5 w-2.5 rounded-full bg-current" /><span className="absolute h-2.5 w-0.5 rounded-full bg-current transition-transform duration-300 group-open:scale-y-0" /></span>
                </summary>
                <ul className="pb-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="inline-flex min-h-11 min-w-11 items-center text-sm text-white/55 transition-colors hover:text-[oklch(0.85_0.05_85)]">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-white/60">© {new Date().getFullYear()} Qalam. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <Link href="/legal/privacy" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/legal/terms" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-white">
              Terms
            </Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center transition-colors hover:text-white">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
