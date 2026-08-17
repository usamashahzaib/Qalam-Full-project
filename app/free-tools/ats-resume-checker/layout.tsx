import type { Metadata } from "next"
import { buildOgImageUrl, SITE_URL } from "@/lib/seo"

const title = "Free ATS Resume Checker - Recruiter Review"
const description = "Check your resume free across ATS parsing, job fit, recruiter readability, achievement evidence, career progression, skills, clarity, and rejection risks. No account required."
const ogImage = buildOgImageUrl(title, description, "Free ATS Check")

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/free-tools/ats-resume-checker` },
  keywords: ["free ATS resume checker", "ATS score", "resume checker Pakistan", "recruiter resume review", "job description match"],
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/free-tools/ats-resume-checker`,
    type: "website",
    siteName: "Qalam",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "Qalam Free ATS Resume Checker scorecard" }],
  },
  twitter: { card: "summary_large_image", title, description, images: [ogImage], site: "@byqalam" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
}

export default function AtsResumeCheckerLayout({ children }: { children: React.ReactNode }) {
  return children
}
