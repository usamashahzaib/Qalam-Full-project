import { AtsResumeCheckerTool } from "@/components/tools/AtsResumeCheckerTool"
import { ATS_DIRECT_ANSWER, ATS_FACTORS, ATS_FAQS, ATS_METHODOLOGY_PATH, ATS_METHODOLOGY_UPDATED, ATS_METHODOLOGY_VERSION, ATS_STEPS } from "@/lib/ats-methodology"
import { SITE_URL } from "@/lib/seo"

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/free-tools/ats-resume-checker#page`,
      url: `${SITE_URL}/free-tools/ats-resume-checker`,
      name: "Free ATS Resume Checker",
      description: ATS_DIRECT_ANSWER,
      dateModified: ATS_METHODOLOGY_UPDATED,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/free-tools/ats-resume-checker#app` },
      mainEntity: { "@id": `${SITE_URL}/free-tools/ats-resume-checker#app` },
      breadcrumb: { "@id": `${SITE_URL}/free-tools/ats-resume-checker#breadcrumb` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/free-tools/ats-resume-checker#app`,
      name: "Qalam Free ATS Resume Checker",
      url: `${SITE_URL}/free-tools/ats-resume-checker`,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Resume screening and career development",
      operatingSystem: "Web",
      browserRequirements: "JavaScript enabled",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      description: ATS_DIRECT_ANSWER,
      featureList: ATS_FACTORS.map((factor) => `${factor.name}: ${factor.definition}`),
      publisher: { "@id": `${SITE_URL}/#organization` },
      releaseNotes: `Methodology version ${ATS_METHODOLOGY_VERSION}`,
      subjectOf: { "@id": `${SITE_URL}${ATS_METHODOLOGY_PATH}#methodology` },
    },
    {
      "@type": "HowTo",
      name: "How to check a resume for ATS and recruiter readiness",
      description: "Paste a resume, optionally add a target job description, then review the evidence-first scorecard and correction plan.",
      totalTime: "PT3M",
      step: ATS_STEPS.map((step, index) => ({ "@type": "HowToStep", position: index + 1, name: step.name, text: step.text })),
    },
    {
      "@type": "FAQPage",
      mainEntity: ATS_FAQS.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/free-tools/ats-resume-checker#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Free Tools", item: `${SITE_URL}/free-tools` },
        { "@type": "ListItem", position: 3, name: "ATS Resume Checker", item: `${SITE_URL}/free-tools/ats-resume-checker` },
      ],
    },
  ],
}

export default function AtsResumeCheckerPage() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /><AtsResumeCheckerTool /></>
}
