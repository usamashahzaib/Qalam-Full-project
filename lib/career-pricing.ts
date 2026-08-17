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
  { key: "extra_resume", name: "Extra JD-matched resume", price: 399, route: "/career/resumes", unit: "resume", creditCost: 1 },
  { key: "cover_letter", name: "Targeted cover letter", price: 199, route: "/career/cover-letters", unit: "letter", creditCost: 1 },
  { key: "interview_pack", name: "AI interview practice pack", price: 599, route: "/career/interview-prep", unit: "pack", creditCost: 1 },
  { key: "recruiter_review", name: "Recruiter-style deep resume review", price: 799, route: "/career/deep-resume-review", unit: "review", creditCost: 2 },
  { key: "linkedin_rewrite", name: "Complete LinkedIn profile rewrite", price: 1199, route: "/career/linkedin-rewrite", unit: "rewrite", creditCost: 3 },
  { key: "career_blueprint", name: "Career strategy blueprint", price: 1499, route: "/career/strategy-blueprint", unit: "blueprint", creditCost: 4 },
] as const

export type AddonKey = (typeof CAREER_ADD_ONS)[number]["key"]

export const CAREER_PACKS = [
  {
    key: "application_pack",
    name: "Application Pack",
    description: "A JD-matched resume, targeted cover letter, and interview practice pack for one role.",
    price: 999,
    originalPrice: 1197,
    route: "/career/add-ons",
    unit: "application pack",
    items: ["extra_resume", "cover_letter", "interview_pack"],
  },
  {
    key: "job_win_pack",
    name: "Job-Win Pack",
    description: "Deep recruiter review, JD-matched resume, cover letter, and interview practice for one serious application.",
    price: 1799,
    originalPrice: 1996,
    route: "/career/add-ons",
    unit: "job-win pack",
    items: ["recruiter_review", "extra_resume", "cover_letter", "interview_pack"],
    featured: true,
  },
  {
    key: "career_reset_pack",
    name: "Career Reset Pack",
    description: "LinkedIn rewrite, career blueprint, and deep recruiter review for a positioning reset.",
    price: 2799,
    originalPrice: 3497,
    route: "/career/add-ons",
    unit: "career reset pack",
    items: ["linkedin_rewrite", "career_blueprint", "recruiter_review"],
  },
  {
    key: "executive_career_reset",
    name: "Executive Career Reset",
    description: "Every career add-on in one complete resume, LinkedIn, interview, and strategy workflow.",
    price: 3999,
    originalPrice: 4694,
    route: "/career/add-ons",
    unit: "executive career reset",
    items: ["extra_resume", "cover_letter", "interview_pack", "recruiter_review", "linkedin_rewrite", "career_blueprint"],
  },
] as const satisfies ReadonlyArray<{
  key: string
  name: string
  description: string
  price: number
  originalPrice: number
  route: string
  unit: string
  items: readonly AddonKey[]
  featured?: boolean
}>

export type CareerPackKey = (typeof CAREER_PACKS)[number]["key"]
export type CareerProductKey = AddonKey | CareerPackKey
export const CAREER_PRODUCTS = [...CAREER_ADD_ONS, ...CAREER_PACKS] as const
export const getCareerProduct = (key: string) => CAREER_PRODUCTS.find((product) => product.key === key)
export const isCareerPack = (key: string): key is CareerPackKey => CAREER_PACKS.some((pack) => pack.key === key)

export const CAREER_PLAN_CREDITS = {
  Free: { monthly: 0, quarterly: 0, annual: 0 },
  Solo: { monthly: 1, quarterly: 1, annual: 4 },
  Pro: { monthly: 1, quarterly: 3, annual: 12 },
  Agency: { monthly: 0, quarterly: 0, annual: 0 },
} as const

export const PLAN_CREDIT_ELIGIBLE_ADDONS: readonly AddonKey[] = CAREER_ADD_ONS.map(({ key }) => key)

export const formatQuarterlyPrice = (price: number) =>
  price === 0 ? "Free" : `PKR ${price.toLocaleString("en-PK")} / quarter`

export const formatMonthlyPrice = (price: number) =>
  price === 0 ? "Free" : `PKR ${price.toLocaleString("en-PK")} / month`
