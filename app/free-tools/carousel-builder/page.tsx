import { CarouselBuilderTool } from "@/components/tools/CarouselBuilderTool"

const carouselBuilderSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to create a LinkedIn carousel from any post",
  description:
    "Turn any LinkedIn post, thread, or outline into a professional branded carousel using AI - no design skills or software needed.",
  tool: { "@type": "HowToTool", name: "Qalam LinkedIn Carousel Builder" },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Paste your source content",
      text: "Copy any LinkedIn post, article, or outline into the carousel builder. Each paragraph becomes a slide.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Add your branding",
      text: "Enter your name, handle, and accent label to personalize each slide with your brand.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Build with AI",
      text: "Click 'Build Carousel with AI' and the tool structures your content into a cover slide, content slides, and a CTA close.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Preview and export",
      text: "Preview each slide, navigate through the deck, then export as a PNG ZIP - one 1080x1080 image per slide, ready to upload to LinkedIn.",
    },
  ],
}

export default function CarouselBuilderPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(carouselBuilderSchema).replace(/</g, "\\u003c") }} />
      <CarouselBuilderTool />
    </>
  )
}
