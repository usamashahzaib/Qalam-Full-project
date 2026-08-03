import type { AddonKey } from "@/lib/career-pricing"

export type SoftwareAddonKey = Extract<AddonKey, "interview_pack" | "recruiter_review" | "linkedin_rewrite" | "career_blueprint">
export type SoftwareAddonSlug = "interview-prep" | "deep-resume-review" | "linkedin-rewrite" | "strategy-blueprint"

export type AddonField = {
  key: "title" | "targetRole" | "targetCompany" | "jobDescription" | "sourceResume" | "profileText" | "goals"
  label: string
  placeholder: string
  multiline?: boolean
  required?: boolean
}

export type AddonToolConfig = {
  slug: SoftwareAddonSlug
  addonKey: SoftwareAddonKey
  eyebrow: string
  title: string
  description: string
  generateLabel: string
  fields: AddonField[]
}

export const CAREER_ADDON_TOOLS: Record<SoftwareAddonSlug, AddonToolConfig> = {
  "interview-prep": {
    slug: "interview-prep",
    addonKey: "interview_pack",
    eyebrow: "Interview practice",
    title: "Prepare for the questions this role is likely to test.",
    description: "Build a role-specific question set, answer frameworks, evidence prompts, and a practice scorecard from the exact job description.",
    generateLabel: "Build practice pack",
    fields: [
      { key: "title", label: "Pack name", placeholder: "Product manager interview", required: true },
      { key: "targetRole", label: "Target role", placeholder: "Senior Product Manager", required: true },
      { key: "targetCompany", label: "Target company", placeholder: "Optional" },
      { key: "jobDescription", label: "Job description", placeholder: "Paste the exact job description", multiline: true, required: true },
      { key: "sourceResume", label: "Your experience", placeholder: "Paste your resume or relevant experience", multiline: true, required: true },
    ],
  },
  "deep-resume-review": {
    slug: "deep-resume-review",
    addonKey: "recruiter_review",
    eyebrow: "Deep resume review",
    title: "See the resume a recruiter actually reads.",
    description: "Get a detailed ATS and recruiter-risk review with section rewrites, keyword gaps, and a prioritized correction plan.",
    generateLabel: "Run deep review",
    fields: [
      { key: "title", label: "Review name", placeholder: "Operations lead application", required: true },
      { key: "targetRole", label: "Target role", placeholder: "Operations Lead", required: true },
      { key: "jobDescription", label: "Job description", placeholder: "Paste the JD for a targeted review, or describe the role", multiline: true, required: true },
      { key: "sourceResume", label: "Resume", placeholder: "Paste your complete resume", multiline: true, required: true },
    ],
  },
  "linkedin-rewrite": {
    slug: "linkedin-rewrite",
    addonKey: "linkedin_rewrite",
    eyebrow: "LinkedIn rewrite",
    title: "Rewrite every section around one credible position.",
    description: "Generate an editable headline, About section, experience bullets, keyword map, and Featured section plan from your real background.",
    generateLabel: "Rewrite profile",
    fields: [
      { key: "title", label: "Rewrite name", placeholder: "Leadership profile rewrite", required: true },
      { key: "targetRole", label: "Target role", placeholder: "Head of People", required: true },
      { key: "profileText", label: "Current LinkedIn profile", placeholder: "Paste your headline, About section, and experience", multiline: true, required: true },
      { key: "goals", label: "Positioning goal", placeholder: "Describe who should find you and what they should understand", multiline: true, required: true },
    ],
  },
  "strategy-blueprint": {
    slug: "strategy-blueprint",
    addonKey: "career_blueprint",
    eyebrow: "Career strategy blueprint",
    title: "Turn your next career move into a concrete system.",
    description: "Generate a 90-day strategy covering positioning, skill gaps, target employers, networking, applications, content, and weekly milestones.",
    generateLabel: "Build strategy blueprint",
    fields: [
      { key: "title", label: "Blueprint name", placeholder: "Move into regional HR leadership", required: true },
      { key: "targetRole", label: "Target role", placeholder: "Regional HR Director", required: true },
      { key: "sourceResume", label: "Current career evidence", placeholder: "Paste your resume or summarize your experience", multiline: true, required: true },
      { key: "goals", label: "Goals and constraints", placeholder: "Describe the outcome, timeline, location, and constraints", multiline: true, required: true },
    ],
  },
}

export const getCareerAddonTool = (slug: string) => CAREER_ADDON_TOOLS[slug as SoftwareAddonSlug] || null
