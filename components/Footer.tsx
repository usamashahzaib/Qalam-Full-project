import Link from "next/link"
import { SUPPORT_EMAIL } from "@/lib/contact"
import { InstagramIcon, LinkedInIcon } from "@/components/ui/qalam-icons"
import { QalamLogo } from "@/components/QalamLogo"

const FOOTER_LINKS = {
  Product: [
    { label: "Post Writer", href: "/product/post-writer" },
    { label: "Voice Profile", href: "/product/voice-profile" },
    { label: "Hook Generator", href: "/product/hook-generator" },
    { label: "Comment Generator", href: "/product/comment-generator" },
    { label: "Post Scheduler", href: "/product/post-scheduler" },
    { label: "Agency Workspaces", href: "/product/agency-workspaces" },
  ],
  "Use Cases": [
    { label: "Founders", href: "/use-cases/founders" },
    { label: "Marketing Teams", href: "/use-cases/marketing-teams" },
    { label: "HR Leaders", href: "/use-cases/hr-leaders" },
    { label: "Consultants", href: "/use-cases/consultants" },
    { label: "Agencies", href: "/use-cases/agencies" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Blog", href: "/blog" },
    { label: "Free Tools", href: "/free-tools" },
    { label: "Changelog", href: "/changelog" },
    { label: "System Status", href: "/status" },
  ],
  Company: [
    { label: "About", href: "/about" },
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
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white/40 transition-all duration-200 hover:border-gold/40 hover:bg-gold/10 hover:text-gold"
    >
      {children}
    </a>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-[#153a37] bg-[#041514]">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="mb-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <QalamLogo
              href="/"
              size={36}
              containerClassName="mb-4 flex items-center gap-2"
              textClassName="text-lg font-bold text-white"
            />
            <p className="mb-5 text-sm leading-relaxed text-white/55">
              The publishing system that learns your voice, stores your archive, and turns ideas into authority over time.
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
              <h4 className="mb-4 text-sm font-semibold text-white/90">{section}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="inline-flex min-h-7 items-center text-sm text-white/55 transition-colors hover:text-gold">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-white/35">© {new Date().getFullYear()} Qalam. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm text-white/35">
            <Link href="/legal/privacy" className="inline-flex min-h-7 items-center transition-colors hover:text-white/60">
              Privacy
            </Link>
            <Link href="/legal/terms" className="inline-flex min-h-7 items-center transition-colors hover:text-white/60">
              Terms
            </Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-7 items-center transition-colors hover:text-white/60">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
