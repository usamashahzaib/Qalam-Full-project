import type { WorkspaceProfile } from "@/components/providers/WorkspaceProvider"

export type ScoreCard = {
  label: string
  score: number
  note: string
  actionHint?: string
}

export type ContentAnalysis = {
  overallScore: number
  overallLabel: string
  hookType: string
  scores: ScoreCard[]
  improvements: string[]
  hashtags: string[]
  excerpt: string
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)))

// LinkedIn hashtag signal map: pattern -> real discovery tags
const TOPIC_SIGNALS: Array<{ pattern: RegExp; tags: string[] }> = [
  { pattern: /hir(e|ing)|recruit|talent.*(acqui|mana)|candidat|job post|job description/i, tags: ["#Hiring", "#Recruitment", "#TalentAcquisition"] },
  { pattern: /\bleadership\b|lead(er|ing)|managing.*team|management.*(tip|style|skill)/i, tags: ["#Leadership", "#ManagementTips"] },
  { pattern: /start.?up|founder|co.?founder|bootstrap|building.*company/i, tags: ["#Startups", "#Entrepreneurship", "#Founders"] },
  { pattern: /company.?culture|team.?culture|work.?culture|employee.?experience|workplace/i, tags: ["#CompanyCulture", "#EmployeeExperience"] },
  { pattern: /\bgrowth\b|scale|revenue|mrr|arr|churn/i, tags: ["#BusinessGrowth", "#GrowthStrategy"] },
  { pattern: /content.?strateg|linkedin.?post|personal.?brand|thought.?leader/i, tags: ["#ContentStrategy", "#PersonalBranding", "#LinkedInTips"] },
  { pattern: /\bdata\b.*analyt|analytics|kpi\b|dashboard|metric/i, tags: ["#DataDriven", "#Analytics"] },
  { pattern: /\bai\b|artificial.?intelligence|machine.?learning|\bllm\b|\bgpt\b|generative/i, tags: ["#ArtificialIntelligence", "#AITools", "#FutureOfWork"] },
  { pattern: /remote.?work|hybrid.?work|work.?from.?home|distributed.?team/i, tags: ["#RemoteWork", "#HybridWork"] },
  { pattern: /career.?advice|career.?growth|career.?pivot|job.?search/i, tags: ["#CareerAdvice", "#CareerGrowth", "#ProfessionalDevelopment"] },
  { pattern: /diversity|inclusion|equity|\bdei\b|belonging/i, tags: ["#DiversityAndInclusion", "#DEI"] },
  { pattern: /mental.?health|wellbeing|burnout|work.?life.?balance/i, tags: ["#MentalHealth", "#WorkLifeBalance"] },
  { pattern: /product.?manage|roadmap|sprint|\bagile\b|user.?story/i, tags: ["#ProductManagement", "#ProductDevelopment"] },
  { pattern: /customer.?experi|\bcx\b|customer.?success|client.?relation/i, tags: ["#CustomerExperience", "#CustomerSuccess"] },
  { pattern: /salary|compensation|pay.?equity|total.?rewards|benefits.?package/i, tags: ["#CompensationAndBenefits", "#TotalRewards"] },
  { pattern: /\bsales\b|pipeline|outbound|closing.*deal|quota/i, tags: ["#Sales", "#B2BSales"] },
  { pattern: /\bmarketing\b|campaign|brand.?awareness|demand.?gen/i, tags: ["#Marketing", "#DigitalMarketing"] },
  { pattern: /lesson|mistake|fail(ure|ed|ing)|reflect.*learn/i, tags: ["#LessonsLearned", "#GrowthMindset"] },
  { pattern: /feedback.?culture|performance.?review|360.?feedback/i, tags: ["#PerformanceManagement", "#FeedbackCulture"] },
  { pattern: /automat|process.?improv|workflow|efficiency/i, tags: ["#Automation", "#ProcessImprovement"] },
  { pattern: /networking|professional.*connect|build.*relationship/i, tags: ["#Networking", "#ProfessionalNetworking"] },
  { pattern: /onboard|new.?hire|day.?one.*job|first.?week/i, tags: ["#Onboarding", "#EmployeeExperience"] },
  { pattern: /interview.?tip|hiring.?process|job.?offer/i, tags: ["#InterviewTips", "#Hiring"] },
  { pattern: /strategy|strategic|vision|mission|planning/i, tags: ["#BusinessStrategy", "#Leadership"] },
  { pattern: /innovation|disrupt|transform|future.*work/i, tags: ["#Innovation", "#FutureOfWork"] },
  { pattern: /employer.?brand|talent.?brand|culture.?fit/i, tags: ["#EmployerBranding", "#TalentStrategy"] },
  { pattern: /team.*build|high.?perform.*team|culture.*building/i, tags: ["#TeamBuilding", "#HighPerformance"] },
  { pattern: /personal.?develop|self.?improve|learn.*skill|upskill/i, tags: ["#PersonalDevelopment", "#ContinuousLearning"] },
  { pattern: /finance|fintech|investment|fundrais|venture.*capital/i, tags: ["#Finance", "#Fintech"] },
  { pattern: /b2b|enterprise.*sales|saas.*sales/i, tags: ["#B2BSales", "#SaaS"] },
]

const INDUSTRY_TAG_MAP: Record<string, string[]> = {
  "human resources": ["#HumanResources", "#PeopleAndCulture"],
  "hr": ["#HumanResources", "#PeopleAndCulture"],
  "people and culture": ["#PeopleAndCulture", "#HumanResources"],
  "people ops": ["#PeopleOperations", "#PeopleAndCulture"],
  "technology": ["#Technology", "#TechIndustry"],
  "software": ["#SaaS", "#Software"],
  "saas": ["#SaaS", "#Software"],
  "marketing": ["#Marketing", "#DigitalMarketing"],
  "finance": ["#Finance", "#FinancialServices"],
  "fintech": ["#Fintech", "#Finance"],
  "sales": ["#Sales", "#B2BSales"],
  "consulting": ["#Consulting", "#BusinessStrategy"],
  "healthcare": ["#Healthcare", "#HealthTech"],
  "education": ["#Education", "#EdTech"],
  "ecommerce": ["#Ecommerce", "#RetailTech"],
  "real estate": ["#RealEstate"],
  "media": ["#Media", "#ContentCreation"],
  "legal": ["#LegalIndustry", "#Law"],
  "manufacturing": ["#Manufacturing", "#SupplyChain"],
  "logistics": ["#Logistics", "#SupplyChain"],
  "recruitment": ["#Recruitment", "#TalentAcquisition"],
  "talent acquisition": ["#TalentAcquisition", "#Recruiting"],
}

const ROLE_TAG_MAP: Array<{ pattern: RegExp; tags: string[] }> = [
  { pattern: /\bceo\b|chief executive/i, tags: ["#CEO", "#ExecutiveLeadership"] },
  { pattern: /\bfounder\b|co.?founder/i, tags: ["#Founder", "#Entrepreneurship"] },
  { pattern: /\bcmo\b|chief marketing/i, tags: ["#CMO", "#MarketingLeadership"] },
  { pattern: /\bcto\b|chief technology/i, tags: ["#CTO", "#TechLeadership"] },
  { pattern: /\bchro\b|chief hr|chief people/i, tags: ["#CHRO", "#PeopleStrategy"] },
  { pattern: /hr.?(manager|director|lead|head)/i, tags: ["#HRManager", "#HumanResources"] },
  { pattern: /hr.?business.?partner|\bhrbp\b/i, tags: ["#HRBP", "#PeopleStrategy"] },
  { pattern: /talent.?acquisition|head.*recruit|recruit(ing|er)/i, tags: ["#TalentAcquisition", "#Recruiting"] },
  { pattern: /people.?(manager|lead|director)/i, tags: ["#PeopleLeader", "#HumanResources"] },
  { pattern: /product.?(manager|lead|director|head)/i, tags: ["#ProductManagement"] },
  { pattern: /\bengineer(ing)?\b|\bdeveloper\b|\bengineering.*lead/i, tags: ["#SoftwareEngineering", "#Engineering"] },
  { pattern: /\bdesigner\b|ux.?design|product.?design/i, tags: ["#UXDesign", "#ProductDesign"] },
  { pattern: /\bconsultant\b|business.*advisor/i, tags: ["#Consulting", "#BusinessAdvisory"] },
  { pattern: /director.*(hr|people|talent)/i, tags: ["#HRDirector", "#HumanResources"] },
  { pattern: /vp.*(people|hr|talent|human)/i, tags: ["#VPOfPeople", "#HRLeadership"] },
]

export const buildHashtags = (text: string, profile?: Partial<WorkspaceProfile> | null): string[] => {
  const seen = new Set<string>()
  const result: string[] = []

  const add = (...tags: string[]) => {
    for (const tag of tags) {
      if (!seen.has(tag) && result.length < 13) {
        seen.add(tag)
        result.push(tag)
      }
    }
  }

  // 1. Topic signals from content (cap contributions per signal to keep variety)
  let signalAdded = 0
  for (const signal of TOPIC_SIGNALS) {
    if (signalAdded >= 10) break
    if (signal.pattern.test(text)) {
      const batch = signal.tags.slice(0, 2)
      add(...batch)
      signalAdded += batch.length
    }
  }

  // 2. Industry tags from profile
  if (profile?.industry) {
    const key = profile.industry.toLowerCase().trim()
    for (const [mapKey, industryTags] of Object.entries(INDUSTRY_TAG_MAP)) {
      if (key.includes(mapKey) || mapKey.includes(key.split(/\s+/)[0])) {
        add(...industryTags.slice(0, 2))
        break
      }
    }
  }

  // 3. Role tags from profile title
  if (profile?.title) {
    for (const { pattern, tags } of ROLE_TAG_MAP) {
      if (pattern.test(profile.title)) {
        add(...tags.slice(0, 2))
        break
      }
    }
  }

  // 4. Broad fallback only if very sparse
  if (result.length < 3) {
    add("#LinkedIn", "#ProfessionalDevelopment")
  }

  return result.filter((t) => t.length > 3).slice(0, 12)
}

export const analyzeContent = ({
  title,
  content,
  type,
  profile,
}: {
  title?: string
  content: string
  type?: string
  profile?: Partial<WorkspaceProfile> | null
}): ContentAnalysis => {
  const text = `${title || ""}\n${content}`.trim()
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean)
  const firstLine = lines[0] || title || ""
  const words = content.trim().split(/\s+/).filter(Boolean)
  const paragraphs = content.split(/\n\s*\n/).filter((chunk) => chunk.trim())
  const ctaRegex = /comment|reply|share|follow|save|dm|message|tell me|let me know|what do you think|drop|tag/i
  const hookRegex = /\?|^\d|hot take|stop|most people|most teams|nobody|why|how|mistake|truth|learned|failed|lesson|unpopular|brutal|honest/i
  const storyRegex = /\b(i|we)\s+(learned|realized|saw|noticed|failed|tested|built|spent|remember|used to|decided|quit|left|hired|fired)\b/i
  const authorityRegex = /\d+%|\d+x|\d+\b|years?|clients?|team|revenue|pipeline|hiring|operators?|leaders?/i
  const specificityRegex = /\bfor example\b|\bone example\b|\bwhen\b|\bbecause\b|\bafter\b|\bbefore\b|\bthis meant\b|\bthat changed\b/i
  const aiSlopRegex = /\bleverage\b|\bdelve\b|\bfoster\b|\bnavigate\b|rapidly evolving landscape|future belongs|game changer|transformative|unlock potential|it is worth noting/i

  const readability = clamp((words.length >= 80 && words.length <= 260 ? 35 : 18) + (paragraphs.length >= 3 ? 25 : 10) + (lines.length >= 5 ? 20 : 8) + (content.length <= 1800 ? 20 : 8))
  const hook = clamp((hookRegex.test(firstLine) ? 65 : 25) + (firstLine.length <= 90 ? 22 : 5) + (storyRegex.test(firstLine) ? 15 : 0) + (/\d/.test(firstLine) ? 10 : 0))
  const authority = clamp((authorityRegex.test(text) ? 65 : 25) + ((profile?.title || profile?.industry) ? 20 : 8) + (storyRegex.test(content) ? 15 : 0) + (words.length >= 120 ? 12 : 5))
  const cta = clamp((ctaRegex.test(content) ? 70 : 25) + (/[\?]$/.test(content.trim()) ? 15 : 0))
  const voiceFit = clamp((profile?.tone ? 28 : 14) + (profile?.industry ? 22 : 12) + (profile?.title ? 22 : 12) + (buildHashtags(text, profile).length >= 4 ? 12 : 6) + (storyRegex.test(content) ? 15 : 10) + (/linkedin/i.test(type || "") ? 10 : 6))
  const specificity = clamp((specificityRegex.test(content) ? 42 : 20) + (authorityRegex.test(text) ? 18 : 6) + (storyRegex.test(content) ? 20 : 8) + (words.length >= 140 ? 10 : 4) + (/because|so|instead|but/i.test(content) ? 10 : 4))
  const humanLikeness = clamp((storyRegex.test(content) ? 30 : 14) + (!aiSlopRegex.test(text) ? 24 : 6) + (/\bI\b|\bwe\b/.test(content) ? 18 : 8) + (paragraphs.length >= 4 ? 14 : 6) + (firstLine.length <= 85 ? 12 : 6))
  const rawOverall = hook * 0.18 + readability * 0.16 + authority * 0.15 + specificity * 0.17 + cta * 0.12 + voiceFit * 0.1 + humanLikeness * 0.12
  const overall = clamp(words.length >= 140 && paragraphs.length >= 4 && hook >= 72 && authority >= 72 && specificity >= 70 && cta >= 64 && humanLikeness >= 72 ? Math.max(rawOverall, 90) : rawOverall)

  const improvements = [
    hook < 65 ? "Sharpen the hook: open with data, a question, or a bold claim." : "",
    readability < 65 ? "Improve readability: use short lines and at least 3 paragraph breaks." : "",
    authority < 65 ? "Add specific proof: a metric, team result, or concrete example." : "",
    specificity < 70 ? "Get more concrete: name the decision, example, or consequence behind the point." : "",
    cta < 60 ? "Add a clear next step: ask for a comment, a save, or share an opinion." : "",
    humanLikeness < 70 ? "Remove AI phrasing and write more like lived experience." : "",
    voiceFit < 70 ? "Complete your voice profile to align AI output with your positioning." : "",
  ].filter(Boolean).slice(0, 3)

  const hookNote = hookRegex.test(firstLine)
    ? (firstLine.length <= 90 ? "Strong opening found in first line" : "Hook present but first line is too long (aim under 90 chars)")
    : "Weak opening: add a question, data point, or bold claim"

  const readabilityNote = words.length < 80
    ? "Too short: add more context or specifics"
    : words.length > 260
      ? "Too long: trim or split for better scroll-through"
      : paragraphs.length < 3
        ? "Add 3+ paragraph breaks: dense text loses mobile readers"
        : "Good length and structure for LinkedIn"

  const authorityNote = authorityRegex.test(text)
    ? "Concrete proof signals found: specific data or results present"
    : "No specific data detected: add a metric, result, or real example"

  const ctaNote = ctaRegex.test(content)
    ? "Clear engagement ask found"
    : /[?]$/.test(content.trim())
      ? "Ends with a question, good CTA signal"
      : "No call-to-action: end with a direct ask or question"

  const specificityNote = specificityRegex.test(content)
    ? "Specific example or consequence framing detected"
    : "Still abstract: add one real scenario, decision, or tradeoff"

  const humanNote = aiSlopRegex.test(text)
    ? "AI-sounding wording detected: simplify and make it more lived-in"
    : storyRegex.test(content)
      ? "Sounds grounded in real experience"
      : "Needs more human texture: show what you saw, changed, or learned"

  const voiceFitNote = !profile?.tone && !profile?.industry && !profile?.title
    ? "Complete voice profile to improve alignment"
    : voiceFit >= 70
      ? "Well aligned with your saved profile"
      : "Partial profile: add tone, industry, or title for better alignment"

  return {
    overallScore: overall,
    overallLabel: overall >= 82 ? "Strong" : overall >= 68 ? "Solid" : overall >= 52 ? "Needs polish" : "Weak",
    hookType: hookRegex.test(firstLine) ? (/^\d/.test(firstLine) ? "Data-led" : /\?/.test(firstLine) ? "Question" : storyRegex.test(firstLine) ? "Story-led" : "Opinion-led") : "Plain",
    scores: [
      {
        label: "Hook",
        score: hook,
        note: hookNote,
        actionHint: hook < 65 ? "Get hook ideas" : undefined,
      },
      {
        label: "Readability",
        score: readability,
        note: readabilityNote,
        actionHint: readability < 65 ? "Break text into shorter paragraphs with whitespace between each" : undefined,
      },
      {
        label: "Authority",
        score: authority,
        note: authorityNote,
        actionHint: authority < 65 ? "Add a specific number, result, or real example from your experience" : undefined,
      },
      {
        label: "Specificity",
        score: specificity,
        note: specificityNote,
        actionHint: specificity < 70 ? "Add one concrete example, decision, or consequence" : undefined,
      },
      {
        label: "CTA",
        score: cta,
        note: ctaNote,
        actionHint: cta < 60 ? "End with: 'What do you think?' or 'Save this if it helped'" : undefined,
      },
      {
        label: "Human-likeness",
        score: humanLikeness,
        note: humanNote,
        actionHint: humanLikeness < 70 ? "Replace polished AI phrasing with lived language" : undefined,
      },
      {
        label: "Voice fit",
        score: voiceFit,
        note: voiceFitNote,
        actionHint: voiceFit < 70 && (!profile?.tone || !profile?.industry) ? "Fill in Voice Profile to improve AI alignment" : undefined,
      },
    ],
    improvements,
    hashtags: buildHashtags(text, profile),
    excerpt: content.slice(0, 180),
  }
}
