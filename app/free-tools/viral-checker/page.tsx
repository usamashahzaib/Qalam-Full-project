import { ViralCheckerTool } from "@/components/tools/ViralCheckerTool"

const viralCheckerSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to review the quality of a LinkedIn post",
  description:
    "Review any LinkedIn post draft across hook quality, clarity, specificity, usefulness, and discussion value.",
  tool: { "@type": "HowToTool", name: "Qalam LinkedIn Post Quality Checker" },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Paste your LinkedIn post draft",
      text: "Copy your draft post and paste it into the analyzer.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Get your quality score",
      text: "The AI scores your post across 5 dimensions: hook quality, clarity, specificity, usefulness, and discussion potential.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Read the specific feedback",
      text: "The tool identifies which elements are weak and what is reducing the draft's clarity or usefulness.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Apply the stronger opening",
      text: "Use the AI-suggested improved opening line to rewrite your hook and re-analyze until the score improves.",
    },
  ],
}

export default function ViralCheckerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(viralCheckerSchema).replace(/</g, "\\u003c") }} />
      <ViralCheckerTool />
    </>
  )
}
