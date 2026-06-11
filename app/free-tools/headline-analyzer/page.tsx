import type { Metadata } from "next"
import { HeadlineAnalyzerTool } from "@/components/tools/HeadlineAnalyzerTool"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "LinkedIn Headline Analyzer - Free Tool",
  description:
    "Score your LinkedIn headline instantly across 5 proven dimensions: length, power words, specificity, structure, and role clarity. Free, no account required.",
  alternates: { canonical: `${SITE_URL}/free-tools/headline-analyzer` },
  openGraph: {
    title: "LinkedIn Headline Analyzer - Free | Qalam",
    description:
      "Score your LinkedIn headline across 5 proven dimensions with specific improvement suggestions. No sign-in required.",
    url: `${SITE_URL}/free-tools/headline-analyzer`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Headline Analyzer - Free | Qalam",
    description:
      "Instant LinkedIn headline score across 5 dimensions. No account required.",
  },
}

const headlineAnalyzerSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to improve your LinkedIn headline",
  description:
    "Score your LinkedIn headline for visibility, keyword strength, and clarity using Qalam's free analyzer - no account required.",
  tool: { "@type": "HowToTool", name: "Qalam LinkedIn Headline Analyzer" },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Paste your current headline",
      text: "Enter your existing LinkedIn headline into the analyzer.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Get your score",
      text: "The tool evaluates your headline across five criteria: length, power words, specificity, structure, and role clarity.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Read the signal breakdown",
      text: "Each check shows whether your headline passes or fails, with a specific suggestion for improvement.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Rewrite and re-score",
      text: "Update your headline based on the feedback and run it again until you hit a strong score.",
    },
  ],
}

export default function HeadlineAnalyzerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(headlineAnalyzerSchema) }}
      />
      <HeadlineAnalyzerTool />
    </>
  )
}
