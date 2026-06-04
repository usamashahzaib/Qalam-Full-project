import type { Metadata } from "next"
import { HookGeneratorTool } from "@/components/tools/HookGeneratorTool"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "LinkedIn Hook Generator - Free Tool | Qalam",
  description:
    "Generate 10 proven LinkedIn hook opening lines for any topic in seconds. No account required. Built on the highest-performing hook structures for the LinkedIn algorithm.",
  alternates: { canonical: `${SITE_URL}/free-tools/hook-generator` },
  openGraph: {
    title: "LinkedIn Hook Generator - Free | Qalam",
    description:
      "Generate 10 proven LinkedIn opening lines for any topic in seconds. No sign-in required.",
    url: `${SITE_URL}/free-tools/hook-generator`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkedIn Hook Generator - Free | Qalam",
    description:
      "10 proven hook patterns for any LinkedIn topic. No account required.",
  },
}

const hookGeneratorSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to write a LinkedIn hook",
  description:
    "Generate ten attention-grabbing opening lines for any LinkedIn post topic in seconds - no account required.",
  tool: { "@type": "HowToTool", name: "Qalam LinkedIn Hook Generator" },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Enter your topic",
      text: "Type the topic, idea, or insight you want to post about on LinkedIn.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Generate ten hooks",
      text: "Click Generate to instantly see ten different opening lines structured around your topic.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Copy your best hook",
      text: "Select the opening that fits your tone, then paste it into your LinkedIn post draft.",
    },
  ],
}

export default function HookGeneratorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hookGeneratorSchema) }}
      />
      <HookGeneratorTool />
    </>
  )
}
