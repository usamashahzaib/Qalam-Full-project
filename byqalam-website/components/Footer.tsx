import Link from "next/link"

const FOOTER_LINKS = {
  Product: [
    { label: "AI Post Writer", href: "/write" },
    { label: "Hook Generator", href: "/free-tools" },
    { label: "Voice Fingerprint", href: "/#features" },
    { label: "Post Scheduler", href: "/#features" },
    { label: "LinkedIn Analytics", href: "/#features" },
  ],
  "Use Cases": [
    { label: "Founders", href: "/#features" },
    { label: "Marketing Teams", href: "/#features" },
    { label: "HR Leaders", href: "/#features" },
    { label: "Consultants", href: "/#features" },
    { label: "Coaches", href: "/#features" },
  ],
  Resources: [
    { label: "Blog", href: "/blog" },
    { label: "Free Tools", href: "/free-tools" },
    { label: "Documentation", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
    { label: "Status", href: "/status" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Careers", href: "/careers" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  )
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-gold/40 hover:text-gold transition-all duration-200 hover:bg-gold/10"
    >
      {children}
    </a>
  )
}

export function Footer() {
  return (
    <footer className="bg-transparent border-t border-white/10">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 13 C3 13 5 11 8 7 C11 3 13 2 13 2"
                    stroke="#C9871F"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="13" cy="2" r="1.5" fill="#C9871F" />
                  <path d="M3 13 L2 14.5" stroke="#C9871F" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white">Qalam</span>
            </Link>
            <p className="text-sm text-white/40 leading-relaxed mb-5">
              The AI writing partner that learns your voice and turns ideas into viral LinkedIn content.
            </p>
            <div className="flex gap-2">
              <SocialLink href="https://www.instagram.com/byyqalam" label="Instagram">
                <InstagramIcon />
              </SocialLink>
              <SocialLink href="https://www.linkedin.com/company/byqalam" label="LinkedIn">
                <LinkedInIcon />
              </SocialLink>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-sm font-semibold text-white/80 mb-4">{section}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/35 hover:text-gold transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/25">
            © {new Date().getFullYear()} Qalam Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-sm text-white/25">
            <span>Made with</span>
            <span className="text-gold">♥</span>
            <span>for LinkedIn creators everywhere</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
