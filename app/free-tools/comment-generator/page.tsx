import type { Metadata } from "next"
import { CommentGeneratorTool } from "@/components/tools/CommentGeneratorTool"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Free LinkedIn Comment Generator - On-Voice Replies",
  description:
    "Draft sharp, on-voice LinkedIn comments for any post in seconds. AI-powered comment generator with 3 tailored styles per post. Free sign-in required.",
  alternates: { canonical: `${SITE_URL}/free-tools/comment-generator` },
  openGraph: {
    title: "Free LinkedIn Comment Generator - On-Voice Replies | Qalam",
    description:
      "Paste a post, pick your professional angle, and get 3 tailored comment styles ready to post. Free sign-in required. Built by Qalam, the AI LinkedIn writer.",
    url: `${SITE_URL}/free-tools/comment-generator`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free LinkedIn Comment Generator | Qalam",
    description:
      "3 tailored comment styles for any LinkedIn post. Free sign-in required. Built by Qalam.",
  },
}

const commentGeneratorSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to write a LinkedIn comment",
  description:
    "Generate three on-voice comment styles for any LinkedIn post in seconds. Free sign-in required.",
  tool: { "@type": "HowToTool", name: "Qalam LinkedIn Comment Generator" },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Paste the post",
      text: "Copy the LinkedIn post text you want to comment on and paste it into the tool.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Pick your profile",
      text: "Choose the professional angle that matches how you want to sound in the comment.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Copy your comment",
      text: "Select the comment style that fits your voice, then paste it into LinkedIn.",
    },
  ],
}

export default function CommentGeneratorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(commentGeneratorSchema).replace(/</g, "\\u003c") }}
      />
      <CommentGeneratorTool />
    </>
  )
}
