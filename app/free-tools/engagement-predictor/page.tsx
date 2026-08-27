import { EngagementPredictorTool } from "@/components/tools/EngagementPredictorTool"

const engagementPredictorSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to review LinkedIn post readiness before publishing",
  description:
    "Score your LinkedIn post draft across hook quality, specificity, audience relevance, and discussion value before posting.",
  tool: { "@type": "HowToTool", name: "Qalam LinkedIn Post Readiness Review" },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Paste your LinkedIn draft",
      text: "Copy your draft post text and paste it into the readiness review.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Get your readiness score",
      text: "The AI scores your post across 5 dimensions: hook quality, clarity, specificity, audience relevance, and discussion potential.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Review risks and improvements",
      text: "Read the specific risks identified and the recommended edits to improve your post before publishing.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Use the stronger opening",
      text: "Apply the suggested stronger opening line to improve your hook and review the draft again.",
    },
  ],
}

export default function EngagementPredictorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(engagementPredictorSchema).replace(/</g, "\\u003c") }} />
      <EngagementPredictorTool />
    </>
  )
}
