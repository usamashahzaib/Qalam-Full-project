export const CAREER_PLANS = [
  {
    name: "Free",
    monthlyPrice: 0,
    quarterlyPrice: 0,
    description: "See what is weakening your profile and resume.",
    features: ["1 LinkedIn audit/month", "1 ATS review/month", "1 targeted resume/month", "10 active applications", "15 evidence items"],
    highlighted: false,
  },
  {
    name: "Solo",
    monthlyPrice: 799,
    quarterlyPrice: 1598,
    description: "Build a stronger LinkedIn presence every quarter.",
    features: ["5 LinkedIn audits/month", "5 ATS reviews/month", "3 targeted resumes/month", "Unlimited applications", "100 evidence items"],
    highlighted: false,
  },
  {
    name: "Pro",
    monthlyPrice: 1499,
    quarterlyPrice: 2998,
    description: "Align LinkedIn, content, and every job application.",
    features: ["20 LinkedIn audits/month", "20 ATS reviews/month", "10 targeted resumes/month", "Advanced outcome intelligence", "Featured recruiter visibility and cohorts"],
    highlighted: true,
  },
] as const

export const CAREER_ADD_ONS = [
  { key: "extra_resume", name: "Extra JD-matched resume", price: 399, route: "/career/resumes", unit: "resume" },
  { key: "cover_letter", name: "Targeted cover letter", price: 199, route: "/career/cover-letters", unit: "letter" },
  { key: "interview_pack", name: "AI interview practice pack", price: 599, route: "/career/interview-prep", unit: "pack" },
  { key: "recruiter_review", name: "Recruiter-style deep resume review", price: 799, route: "/career/deep-resume-review", unit: "review" },
  { key: "linkedin_rewrite", name: "Complete LinkedIn profile rewrite", price: 1199, route: "/career/linkedin-rewrite", unit: "rewrite" },
  { key: "career_blueprint", name: "Career strategy blueprint", price: 1499, route: "/career/strategy-blueprint", unit: "blueprint" },
] as const

export type AddonKey = (typeof CAREER_ADD_ONS)[number]["key"]

export const formatQuarterlyPrice = (price: number) =>
  price === 0 ? "Free" : `PKR ${price.toLocaleString("en-PK")} / quarter`

export const formatMonthlyPrice = (price: number) =>
  price === 0 ? "Free" : `PKR ${price.toLocaleString("en-PK")} / month`
