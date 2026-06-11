import { ViralCheckerTool } from "@/components/tools/ViralCheckerTool"

const viralCheckerSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to check if your LinkedIn post will go viral",
  description:
    "Analyze any LinkedIn post draft for viral potential using AI scoring across hook quality, specificity, emotion, discussion value, and structure.",
  tool: { "@type": "HowToTool", name: "Qalam LinkedIn Viral Formula Checker" },
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
      name: "Get your viral score",
      text: "The AI scores your post across 5 dimensions: hook quality, specificity, emotional resonance, discussion trigger, and structure.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Read the specific feedback",
      text: "The tool identifies exactly which elements are weak and what is holding the post back from higher engagement.",
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
