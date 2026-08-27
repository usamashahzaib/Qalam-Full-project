export type ProductFaq = {
  question: string
  answer: string
}

export type ProductStage = {
  number: string
  title: string
  description: string
}

export type ProductFoundationPage = {
  path: string
  eyebrow: string
  title: string
  summary: string
  answer: string
  status: string
  statusDetail: string
  problemTitle: string
  problem: string
  stages: ProductStage[]
  includedTitle: string
  included: string[]
  notIncludedTitle: string
  notIncluded: string[]
  evidenceTitle: string
  evidence: string
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
  related: { label: string; href: string; description: string }[]
  faqs: ProductFaq[]
  updatedAt: string
}

export const CAREER_AUTHORITY_PAGES = {
  linkedinOptimization: {
    path: "/linkedin-optimization",
    eyebrow: "LinkedIn authority engine",
    title: "LinkedIn optimization that ends with specific changes",
    summary:
      "Qalam is building a profile optimization workflow that connects positioning, recruiter visibility, proof, and content direction instead of returning a vanity score.",
    answer:
      "LinkedIn optimization is the process of making your profile easier to understand, easier to find, and more credible to the people you want to reach. Qalam’s planned workflow will audit the information you provide, explain what weakens the profile, and turn the findings into section-by-section improvements.",
    status: "Planned product",
    statusDetail:
      "The full profile audit, authority score, and rewrite workflow are not available yet. Today, you can use Qalam’s free profile tools while the connected product is being built.",
    problemTitle: "A polished profile can still be unclear",
    problem:
      "Most profile advice treats the headline, About section, experience, and content as separate writing tasks. Recruiters and buyers do not read them separately. They look for one coherent professional story: what you do, who it helps, what you have achieved, and why they should trust you.",
    stages: [
      {
        number: "01",
        title: "Collect your current evidence",
        description:
          "You will provide profile text, goals, target roles, achievements, and optional LinkedIn export data. Qalam will not claim access to information you did not supply or authorize.",
      },
      {
        number: "02",
        title: "Diagnose visibility and credibility",
        description:
          "The audit will separate keyword coverage, positioning clarity, proof, completeness, and content alignment so one high number cannot hide a weak section.",
      },
      {
        number: "03",
        title: "Rewrite the priority sections",
        description:
          "Recommendations will show the original issue, why it matters, and a proposed replacement for the headline, About section, experience, skills, or Featured section.",
      },
      {
        number: "04",
        title: "Turn the profile into a working plan",
        description:
          "The planned output is a focused 30, 60, and 90-day plan linking profile changes to content topics and recruiter-ready career assets.",
      },
    ],
    includedTitle: "What the planned audit will assess",
    included: [
      "Positioning clarity and target-audience fit",
      "Headline relevance and keyword coverage",
      "About-section structure, proof, and next action",
      "Experience progression and achievement evidence",
      "Skills, Featured section, and profile completeness",
      "Alignment between profile, content, and target role",
    ],
    notIncludedTitle: "What the score will not mean",
    notIncluded: [
      "It will not be an official LinkedIn rating.",
      "It will not predict a guaranteed job, reach, or revenue result.",
      "It will not infer private profile analytics or recruiter activity.",
      "It will not reward keyword stuffing or invented achievements.",
    ],
    evidenceTitle: "Your source data stays visible",
    evidence:
      "Every finding is planned to carry a source label: supplied profile text, user-entered goal, uploaded export, or Qalam recommendation. Where the evidence is incomplete, the report will say so rather than manufacture certainty.",
    primaryCta: { label: "Use the free profile tools", href: "/free-tools" },
    secondaryCta: { label: "See planned pricing", href: "/pricing" },
    related: [
      {
        label: "LinkedIn Authority Score",
        href: "/methodology/linkedin-authority-score",
        description: "Read the proposed dimensions, evidence rules, and limitations.",
      },
      {
        label: "ATS Resume Builder",
        href: "/ats-resume-builder",
        description: "Build the same professional story for applicant tracking systems.",
      },
      {
        label: "Job Description Match",
        href: "/job-description-match",
        description: "Compare a resume with the requirements of one target role.",
      },
    ],
    faqs: [
      {
        question: "Is Qalam’s LinkedIn optimizer live?",
        answer:
          "Not yet. The connected audit and rewrite workflow is planned. Current free tools remain available from the Free Tools page.",
      },
      {
        question: "Will Qalam scrape my LinkedIn profile?",
        answer:
          "The initial product is planned around information you paste, upload, or authorize. Any future browser-assisted import or API access will be described before you use it.",
      },
      {
        question: "Can optimization guarantee more profile views?",
        answer:
          "No. Qalam can improve clarity, evidence, and search relevance, but LinkedIn distribution, hiring decisions, and buyer behaviour remain outside Qalam’s control.",
      },
    ],
    updatedAt: "2026-04-06",
  },
  atsResumeBuilder: {
    path: "/ats-resume-builder",
    eyebrow: "Career engine",
    title: "An ATS resume builder built around career progression",
    summary:
      "Qalam is building an ATS-safe resume workflow that turns experience into clear progression, evidence, and a role-specific version without decorative formatting that breaks parsing.",
    answer:
      "An ATS resume is a plainly structured resume that applicant tracking systems can parse and recruiters can scan quickly. Qalam’s planned builder will focus on accurate chronology, relevant keywords, measurable evidence, and clear progression—not templates designed mainly to look impressive.",
    status: "Planned product",
    statusDetail:
      "Resume building, file export, ATS analysis, and subscription allowances are not live yet. The page describes the product contract being designed, not a currently available tool.",
    problemTitle: "ATS-safe is necessary, but not sufficient",
    problem:
      "A document can parse correctly and still fail to explain why a candidate is ready for the next role. Qalam will treat formatting as the baseline, then test whether responsibilities, achievements, scope, and promotions form a credible career narrative.",
    stages: [
      {
        number: "01",
        title: "Build one verified career record",
        description:
          "Enter roles, dates, responsibilities, skills, education, and achievements once. Missing dates, unexplained overlaps, and unsupported claims will be flagged for review.",
      },
      {
        number: "02",
        title: "Choose the target level",
        description:
          "The planned workflow will adjust emphasis for graduate, specialist, manager, director, executive, technical, and career-transition applications.",
      },
      {
        number: "03",
        title: "Tailor without changing the truth",
        description:
          "Qalam will reorder and rewrite relevant evidence for a job description while preserving the facts in your career record.",
      },
      {
        number: "04",
        title: "Export and verify",
        description:
          "The release target includes readable PDF and DOCX files, plain section structure, version history, and a final checklist before download.",
      },
    ],
    includedTitle: "What the planned builder will prioritize",
    included: [
      "ATS-readable section order and typography",
      "Career progression across role, scope, and seniority",
      "Achievement statements grounded in supplied evidence",
      "Skills and keywords tied to a target role",
      "Chronology, consistency, and missing-information checks",
      "Role-specific PDF and DOCX versions",
    ],
    notIncludedTitle: "What Qalam will not promise",
    notIncluded: [
      "No universal ATS pass score exists across every employer.",
      "A high match will not guarantee an interview.",
      "Qalam will not invent metrics, employers, skills, or qualifications.",
      "Visual templates will not take priority over parsing and readability.",
    ],
    evidenceTitle: "One source of truth for every version",
    evidence:
      "The planned career record separates facts you supplied from wording Qalam recommends. A tailored resume may change emphasis and order, but it should never silently change dates, qualifications, employers, or claimed results.",
    primaryCta: { label: "Explore current free tools", href: "/free-tools" },
    secondaryCta: { label: "Review planned pricing", href: "/pricing" },
    related: [
      {
        label: "Job Description Match",
        href: "/job-description-match",
        description: "See how a dedicated resume version will be compared with one role.",
      },
      {
        label: "LinkedIn Optimization",
        href: "/linkedin-optimization",
        description: "Carry the same positioning and evidence into your public profile.",
      },
      {
        label: "Authority Score Methodology",
        href: "/methodology/linkedin-authority-score",
        description: "See how Qalam plans to distinguish evidence from recommendations.",
      },
    ],
    faqs: [
      {
        question: "Is the ATS resume builder available now?",
        answer:
          "No. The builder, exports, and resume allowances are planned. Qalam will update this page when a usable release is available.",
      },
      {
        question: "Will there be a free resume?",
        answer:
          "A free first-resume allowance is part of the current product plan, but the final entitlement will only be confirmed when the workflow and pricing are live.",
      },
      {
        question: "Does an ATS score guarantee an interview?",
        answer:
          "No. A score can highlight structure, relevance, and evidence gaps. Employers use different systems and make human hiring decisions.",
      },
    ],
    updatedAt: "2026-04-06",
  },
  jobDescriptionMatch: {
    path: "/job-description-match",
    eyebrow: "Role-specific matching",
    title: "Match your resume to one job description without keyword stuffing",
    summary:
      "Qalam is building a job-description match workflow that separates required evidence, useful keywords, experience gaps, and rewrite opportunities.",
    answer:
      "Job-description matching compares a specific role with the evidence in your resume. A useful match does more than count repeated words: it identifies requirements, checks whether your experience supports them, and shows what to clarify without suggesting claims you cannot prove.",
    status: "Planned product",
    statusDetail:
      "Job parsing, resume comparison, gap analysis, and dedicated exports are not live yet. No match score is currently being offered on this page.",
    problemTitle: "Matching words is not matching evidence",
    problem:
      "A resume can repeat the language of a job description and still lack the scope, outcomes, or seniority the employer expects. Qalam’s planned model will distinguish a missing phrase from a missing qualification so candidates know what can be rewritten and what requires real experience.",
    stages: [
      {
        number: "01",
        title: "Parse the role",
        description:
          "Qalam will separate responsibilities, required qualifications, preferred criteria, tools, domain knowledge, and signals of seniority.",
      },
      {
        number: "02",
        title: "Map your evidence",
        description:
          "Each material requirement will be connected to a resume statement, marked as unclear, or identified as unsupported.",
      },
      {
        number: "03",
        title: "Prioritize honest changes",
        description:
          "The report will distinguish wording improvements from genuine gaps so a candidate does not mistake optimization for qualification.",
      },
      {
        number: "04",
        title: "Create a dedicated version",
        description:
          "The planned output is one resume version for one job description, with changes traceable to the verified career record.",
      },
    ],
    includedTitle: "What the planned match report will show",
    included: [
      "Required and preferred criteria",
      "Evidence-backed requirement coverage",
      "Missing or weakly supported skills",
      "Seniority and scope alignment",
      "Priority rewrites with reasons",
      "Questions to resolve before applying",
    ],
    notIncludedTitle: "What the match will not decide",
    notIncluded: [
      "It will not declare a candidate employable or unemployable.",
      "It will not treat every phrase in a posting as equally important.",
      "It will not invent experience to close a gap.",
      "It will not represent an employer’s private screening rules.",
    ],
    evidenceTitle: "Coverage and confidence are different",
    evidence:
      "A future report will distinguish requirement coverage from confidence in the supporting evidence. A keyword may be present while the proof is weak; a strong achievement may also support a requirement without using the exact phrase.",
    primaryCta: { label: "Explore current free tools", href: "/free-tools" },
    secondaryCta: { label: "See planned pricing", href: "/pricing" },
    related: [
      {
        label: "ATS Resume Builder",
        href: "/ats-resume-builder",
        description: "Create the verified career record and role-specific resume version.",
      },
      {
        label: "LinkedIn Optimization",
        href: "/linkedin-optimization",
        description: "Align the public profile with the same target role and evidence.",
      },
      {
        label: "Authority Score Methodology",
        href: "/methodology/linkedin-authority-score",
        description: "Understand Qalam’s evidence-led scoring principles.",
      },
    ],
    faqs: [
      {
        question: "Can I match one resume against several jobs?",
        answer:
          "The planned workflow treats each job description as a separate target. This prevents one generic match score from hiding important differences between roles.",
      },
      {
        question: "Will Qalam add missing keywords automatically?",
        answer:
          "Only when your verified career evidence supports them. Unsupported requirements should remain visible as gaps, not be inserted as claims.",
      },
      {
        question: "Is the match score the same as an employer’s ATS score?",
        answer:
          "No. Employers use different systems and private rules. Qalam’s planned report is an independent preparation aid.",
      },
    ],
    updatedAt: "2026-04-06",
  },
} satisfies Record<string, ProductFoundationPage>

export const LINKEDIN_AUTHORITY_METHOD = {
  path: "/methodology/linkedin-authority-score",
  title: "How the planned LinkedIn Authority Score will work",
  description:
    "Qalam’s proposed LinkedIn Authority Score will be an explainable profile diagnostic based on supplied evidence. It will not be an official LinkedIn score or a promise of reach.",
  answer:
    "The planned LinkedIn Authority Score is a Qalam diagnostic for profile clarity, search relevance, credibility, completeness, and professional-story alignment. It is designed to expose weak dimensions and next actions—not compress a career into an unexplained rating.",
  status: "Methodology proposal, version 0.1",
  dimensions: [
    {
      name: "Positioning clarity",
      question: "Can the intended audience quickly understand the professional’s role, focus, and value?",
      evidence: "Headline, About section, current role, target audience, and stated goal.",
    },
    {
      name: "Search relevance",
      question: "Does the profile use accurate terms connected to the target role, industry, and capabilities?",
      evidence: "Headline, About section, experience, skills, and target-role vocabulary.",
    },
    {
      name: "Credibility and proof",
      question: "Are claims supported by specific responsibilities, outcomes, scope, or work samples?",
      evidence: "Experience statements, achievements, Featured items, credentials, and user-supplied proof.",
    },
    {
      name: "Profile completeness",
      question: "Are the sections needed to interpret the professional story present and usable?",
      evidence: "Provided profile sections and explicit missing-data checks.",
    },
    {
      name: "Story alignment",
      question: "Do the profile, target role, resume evidence, and content direction reinforce the same position?",
      evidence: "Profile text plus any connected career record, goal, and content themes supplied by the user.",
    },
  ],
  rules: [
    "The total score will not be shown without a dimension breakdown.",
    "Measured inputs, estimates, and recommendations will use different labels.",
    "Missing source data will lower confidence instead of being silently inferred.",
    "Critical factual gaps will not be hidden by a strong total score.",
    "Recommendations will link back to the section and evidence that produced them.",
    "The score will be versioned when dimensions, weights, or thresholds change.",
  ],
  limitations: [
    "Qalam is not LinkedIn and the score will not use LinkedIn’s private ranking systems.",
    "The score cannot predict profile views, follower growth, interviews, or revenue.",
    "Profile quality depends on the accuracy and completeness of information supplied.",
    "Different audiences may judge the same positioning differently.",
    "A score change is diagnostic progress, not proof of an external outcome.",
  ],
  faqs: [
    {
      question: "Is the LinkedIn Authority Score live?",
      answer:
        "No. This page documents the proposed model before release. Qalam will publish the operational version, weights, and change history when scoring is available.",
    },
    {
      question: "Is this an official LinkedIn score?",
      answer:
        "No. It is an independent Qalam diagnostic. LinkedIn does not provide or endorse this methodology.",
    },
    {
      question: "Will users be able to challenge a finding?",
      answer:
        "The planned report will expose the source and reasoning behind each finding so users can correct incomplete data or reject an unsuitable recommendation.",
    },
  ] satisfies ProductFaq[],
  updatedAt: "2026-04-06",
}
