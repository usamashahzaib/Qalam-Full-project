import { EngagementPredictorTool } from "@/components/tools/EngagementPredictorTool"

const engagementPredictorSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to predict LinkedIn post engagement before publishing",
  description:
    "Score your LinkedIn post draft across hook quality, specificity, audience relevance, and discussion value to predict real engagement before posting.",
  tool: { "@type": "HowToTool", name: "Qalam LinkedIn Engagement Predictor" },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Paste your LinkedIn draft",
      text: "Copy your draft post text and paste it into the engagement predictor.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Get your engagement score",
      text: "The AI scores your post across 5 dimensions: hook quality, specificity, audience relevance, discussion trigger, and emotional resonance.",
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
      text: "Apply the AI-suggested stronger opening line to improve your hook and re-score until you reach a strong engagement prediction.",
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
