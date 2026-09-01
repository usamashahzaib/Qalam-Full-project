export type CapabilityKey =
  | "ats-checker"
  | "resume-builder"
  | "jd-match"
  | "linkedin-optimizer"
  | "content-studio"
  | "career-hub"

export type Capability = {
  key: CapabilityKey
  label: string
  eyebrow: string
  title: string
  description: string
  benefits: string[]
  href: string
  cta: string
  availability: string
}

const CAPABILITY_DEFINITIONS: Capability[] = [
  {
    key: "ats-checker",
    label: "ATS Resume Check",
    eyebrow: "Free public tool",
    title: "See the rejection risks before a recruiter does",
    description:
      "Upload a PDF or DOCX resume for an evidence-first review across parsing, role alignment, recruiter readability, achievements, progression, skills, clarity, and professional hygiene.",
    benefits: [
      "Actual file upload, not a copy-paste score",
      "Eight decision lenses with specific findings",
      "No account required for the public check",
    ],
    href: "/free-tools/ats-resume-checker",
    cta: "Check my resume free",
    availability: "Free",
  },
  {
    key: "resume-builder",
    label: "ATS Resume Builder",
    eyebrow: "Career workspace",
    title: "Build a targeted resume without inventing experience",
    description:
      "Turn verified roles, skills, projects, and achievements into a job-specific resume. Keep every version attached to the job and evidence that produced it.",
    benefits: [
      "ATS-safe structure and export",
      "One full resume monthly on Free",
      "Version history for each target role",
    ],
    href: "/ats-resume-builder",
    cta: "Explore the resume builder",
    availability: "Free monthly",
  },
  {
    key: "jd-match",
    label: "Job Match",
    eyebrow: "Evidence matching",
    title: "Know what matches, what is missing, and what needs proof",
    description:
      "Compare a job description with your actual experience. Qalam separates supported evidence from keyword gaps so you can improve relevance without keyword stuffing.",
    benefits: [
      "Required skills and responsibilities mapped",
      "Supported, partial, and missing evidence separated",
      "Priority fixes linked to the target role",
    ],
    href: "/job-description-match",
    cta: "See job matching",
    availability: "Career workflow",
  },
  {
    key: "linkedin-optimizer",
    label: "LinkedIn Optimizer",
    eyebrow: "Professional positioning",
    title: "Make your LinkedIn profile easier to find and trust",
    description:
      "Review headline, About, experience, keywords, proof, and recruiter readability around one target position. Recommendations remain separate from measured LinkedIn data.",
    benefits: [
      "Searchability and positioning review",
      "Headline, About, and experience guidance",
      "Evidence-backed keyword recommendations",
    ],
    href: "/linkedin-optimization",
    cta: "Optimize my profile",
    availability: "Free audit",
  },
  {
    key: "content-studio",
    label: "Content Studio",
    eyebrow: "LinkedIn authority",
    title: "Turn career evidence into content grounded in your voice profile",
    description:
      "Draft, score, revise, save, schedule, and analyze LinkedIn posts in one workspace, with your voice profile, professional context, hooks, and version history attached to every draft.",
    benefits: [
      "Voice-aware post and hook generation",
      "Carousels, comments, versions, and scheduling",
      "Five posts monthly on Free",
    ],
    href: "/ai-linkedin-writer",
    cta: "See the AI LinkedIn writer",
    availability: "Free starter access",
  },
  {
    key: "career-hub",
    label: "Career Visibility Hub",
    eyebrow: "Connected career system",
    title: "Keep every career signal connected to the same truth",
    description:
      "Store evidence once, then reuse it across resumes, LinkedIn, applications, cover letters, interview practice, recruiter visibility, and a structured career strategy.",
    benefits: [
      "Evidence Vault as the source of truth",
      "Application and outcome tracking",
      "Optional one-time career add-ons",
    ],
    href: "/career-visibility",
    cta: "Explore career visibility",
    availability: "Core platform",
  },
]

export type Industry = {
  slug: string
  name: string
  audience: string
  outcome: string
  problem: string
  qalamFit: string
  workflows: string[]
}

// Ordered by the positioning hierarchy, not by when each was built. This single
// order drives the /features ItemList schema, llms.txt, llms-full.txt, and the
// default tab in CapabilityShowcase, so publishing surfaces lead everywhere at
// once and the ATS engine reads as supporting capability.
const CAPABILITY_ORDER: CapabilityKey[] = [
  "content-studio",
  "linkedin-optimizer",
  "career-hub",
  "ats-checker",
  "resume-builder",
  "jd-match",
]

export const CAPABILITIES: Capability[] = CAPABILITY_ORDER.map(
  (key) => CAPABILITY_DEFINITIONS.find((capability) => capability.key === key)!
)

export const INDUSTRIES: Industry[] = [
  {
    slug: "job-seekers",
    name: "Job Seekers",
    audience: "Professionals applying for a new role or career move",
    outcome: "Present one credible story from search result to interview",
    problem: "Generic resumes, weak evidence, and inconsistent LinkedIn positioning reduce shortlist confidence.",
    qalamFit: "Qalam connects the target job, verified experience, ATS resume, LinkedIn profile, application record, and interview preparation.",
    workflows: ["ATS resume check", "JD-matched resume", "LinkedIn optimization", "Application tracking"],
  },
  {
    slug: "recruiters",
    name: "Recruiters and Talent Teams",
    audience: "Recruiters, talent acquisition teams, and employer-brand operators",
    outcome: "Build visible recruiting authority and clearer candidate communication",
    problem: "Recruiting expertise is often invisible between open roles, while employer-brand content becomes generic.",
    qalamFit: "Qalam helps talent teams publish credible expertise, preserve an approved voice, and maintain consistent hiring communication.",
    workflows: ["Recruiter content studio", "Employer-brand voice", "Comment workflow", "Publishing calendar"],
  },
  {
    slug: "career-coaches",
    name: "Career Coaches",
    audience: "Independent coaches, resume specialists, and outplacement teams",
    outcome: "Give clients a repeatable evidence-first improvement workflow",
    problem: "Client facts, resume versions, positioning decisions, and action plans become scattered across calls and documents.",
    qalamFit: "Qalam organizes evidence, ATS findings, LinkedIn rewrites, career strategy, and reusable professional content around each client outcome.",
    workflows: ["Evidence review", "Deep resume review", "LinkedIn rewrite", "Career blueprint"],
  },
  {
    slug: "universities",
    name: "Universities and Bootcamps",
    audience: "Career centers, placement teams, bootcamps, and training providers",
    outcome: "Turn learning into employer-readable proof",
    problem: "Learners complete programs but struggle to express projects, skills, and progression in recruiter language.",
    qalamFit: "Qalam gives cohorts a structured path from evidence capture to resume readiness, LinkedIn positioning, and interview practice.",
    workflows: ["Learning cohorts", "Project evidence", "ATS readiness", "Interview practice"],
  },
  {
    slug: "founders",
    name: "Founders and Executives",
    audience: "Leaders building company, hiring, and market credibility",
    outcome: "Publish consistently without losing personal authority",
    problem: "Leadership insights stay trapped in meetings or become generic when delegated without context.",
    qalamFit: "Qalam captures voice, professional context, drafts, revisions, and performance so authority compounds without a blank-page routine.",
    workflows: ["Voice profile", "AI post writer", "Carousel studio", "Content analytics"],
  },
  {
    slug: "consultants",
    name: "Consultants and Advisors",
    audience: "Independent experts and professional-services operators",
    outcome: "Turn expertise into discoverable authority and inbound trust",
    problem: "High-value frameworks remain private while public positioning looks broad or interchangeable.",
    qalamFit: "Qalam converts expertise into a consistent profile, content system, evidence library, and reusable authority assets.",
    workflows: ["LinkedIn positioning", "Content studio", "Hook library", "Performance review"],
  },
  {
    slug: "agencies",
    name: "Content and Career Agencies",
    audience: "LinkedIn, ghostwriting, resume, and career-service agencies",
    outcome: "Scale delivery without mixing client voice or evidence",
    problem: "Client context bleeds across documents, revisions multiply, and approvals become difficult to audit.",
    qalamFit: "Qalam separates workspaces, voices, evidence, drafts, and approvals so each client stays distinct and reviewable.",
    workflows: ["Isolated workspaces", "Voice memory", "Approval workflow", "Client archive"],
  },
  {
    slug: "marketing-teams",
    name: "Marketing Teams",
    audience: "In-house teams managing professional and executive content",
    outcome: "Keep output consistent across operators and leaders",
    problem: "Writing quality and executive voice drift when context lives in scattered briefs and prompt documents.",
    qalamFit: "Qalam centralizes voice rules, professional context, versions, reusable hooks, approvals, and publishing history.",
    workflows: ["Shared content system", "Executive voice", "Version review", "Scheduling"],
  },
]

export const DISCOVERY_UPDATED_AT = "2026-08-18"
