export const ATS_METHODOLOGY_VERSION = "1.1"
export const ATS_METHODOLOGY_UPDATED = "2026-09-14"
export const ATS_METHODOLOGY_PATH = "/methodology/ats-resume-readiness"

export const ATS_FACTORS = [
  { key: "ats_parsing", name: "ATS parsing", weight: 15, definition: "Whether headings, chronology, contact details, and text structure can be interpreted reliably." },
  { key: "role_alignment", name: "Role alignment", weight: 20, definition: "How directly verified experience matches the target role, seniority, domain, responsibilities, and tools." },
  { key: "recruiter_read", name: "Six-second recruiter read", weight: 15, definition: "How quickly a recruiter can identify professional identity, recent scope, value proposition, and strongest proof." },
  { key: "achievement_evidence", name: "Achievement evidence", weight: 15, definition: "Whether claims show action, context, scale, outcome, and credible evidence instead of duties alone." },
  { key: "career_progression", name: "Career progression", weight: 10, definition: "Whether chronology shows expanding scope, promotions, deliberate transitions, and understandable tenure patterns." },
  { key: "skills_credibility", name: "Skills credibility", weight: 10, definition: "Whether listed skills are supported by recent work, projects, qualifications, or other supplied evidence." },
  { key: "clarity", name: "Clarity", weight: 10, definition: "Whether language is concise, specific, consistent, action-led, and easy to scan." },
  { key: "professional_hygiene", name: "Professional hygiene", weight: 5, definition: "Whether dates, links, education, certifications, and formatting are complete and internally consistent." },
] as const

/**
 * The public references each factor is built on. Qalam is not certified or
 * endorsed by any of these bodies; they are the published standards and
 * research the checks were written against, named so a candidate or an HR
 * team can inspect the reasoning themselves.
 */
export const ATS_STANDARDS = [
  {
    name: "HR Open Standards (formerly HR-XML)",
    publisher: "HR Open Standards Consortium",
    url: "https://www.hropenstandards.org/",
    usedFor: "ATS parsing and hygiene",
    how: "The open data standard recruiting systems use to exchange candidate records. Our parsing checks require the same fields it defines: name, contact details, dated positions, education and skills as separate, machine-readable values.",
  },
  {
    name: "Europass CV",
    publisher: "European Commission",
    url: "https://europass.europa.eu/en/create-europass-cv",
    usedFor: "Standard sections and date consistency",
    how: "The public CV standard used across the EU. It fixes the section set (work experience, education, skills) and a single consistent date format, which is what our section and date checks test for.",
  },
  {
    name: "ISO 24495-1:2023 Plain language",
    publisher: "International Organization for Standardization",
    url: "https://www.iso.org/standard/78907.html",
    usedFor: "Clarity",
    how: "The international standard for plain language: the reader can find, understand and use the information. Our clarity checks apply its principles to resume lines: short sentences, active voice, no filler.",
  },
  {
    name: "O*NET and ESCO occupation frameworks",
    publisher: "US Department of Labor and European Commission",
    url: "https://www.onetonline.org/",
    usedFor: "Role alignment and skills credibility",
    how: "Both describe an occupation as tasks plus the skills used to do them. That is why a skill only counts as credible when a task line shows it being used, and why keywords are matched inside the work history, not only in a skills list.",
  },
  {
    name: "Ladders eye-tracking research (2012, updated 2018)",
    publisher: "Ladders, Inc.",
    url: "https://www.theladders.com/career-advice/you-only-get-6-seconds-of-fame-make-it-count",
    usedFor: "Six-second recruiter read",
    how: "Recruiters spent about six to seven seconds on an initial scan, looking first at name, current title and company, dates and education. Our recruiter-read checks test whether those elements are findable at a glance.",
  },
  {
    name: "Accomplishment statement formulas (STAR, CAR and XYZ)",
    publisher: "Widely taught by university career services and hiring teams",
    url: "https://www.themuse.com/advice/star-interview-method",
    usedFor: "Achievement evidence",
    how: "Each strong bullet states an action, its scope and a measurable result. Our evidence checks look for exactly those three parts: an action verb, a figure, and an outcome.",
  },
] as const

/** What each score band means in practice. Ceilings are listed with the score whenever they apply. */
export const SCORE_BANDS = [
  { min: 85, band: "strong", label: "Interview Ready", meaning: "Parses cleanly, matches the role and proves impact with figures. Send it." },
  { min: 70, band: "competitive", label: "Competitive", meaning: "A recruiter would read it seriously, but a few gaps are costing shortlists. Apply the top fixes first." },
  { min: 50, band: "developing", label: "Needs Work", meaning: "Readable, but the evidence or the match to the role is too thin to stand out in a stack." },
  { min: 0, band: "at_risk", label: "At Risk", meaning: "Likely filtered or skipped. Missing contact details, results or role match are holding it down." },
] as const

export const SCORE_CEILINGS = [
  "No reachable email and phone: the score cannot exceed 60.",
  "Bullets carry almost no measurable results: the score cannot exceed 49.",
  "With a job description, role alignment below 70 out of 100: the score cannot exceed 69.",
] as const

export const ATS_FAQS = [
  {
    q: "What does the Qalam ATS readiness score mean?",
    a: "It is an independent diagnostic of resume readability, job relevance, evidence quality, and recruiter screening risk. It is not a score from an employer's private ATS.",
  },
  {
    q: "Can any resume guarantee a 100 percent ATS pass rate?",
    a: "No. Employers use different systems, configurations, knockout questions, and hiring criteria. Qalam reduces avoidable parsing and evidence risks without claiming a universal pass guarantee.",
  },
  {
    q: "Do I need a job description?",
    a: "No. Qalam can assess general market readiness. A target job description is required for exact role alignment and keyword-evidence analysis.",
  },
  {
    q: "Does Qalam invent keywords or achievements?",
    a: "No. A keyword is treated as supported only when the resume contains credible evidence for it. Unsupported claims are flagged instead of inserted as facts.",
  },
  {
    q: "Is the ATS Resume Checker free?",
    a: "Yes. The public checker requires no account. After sign-in, the Free plan includes one full ATS-safe resume generation per calendar month.",
  },
] as const

export const ATS_DIRECT_ANSWER = "Qalam's free ATS Resume Checker evaluates a resume across eight job-relevant factors: parsing, role alignment, six-second recruiter readability, achievement evidence, career progression, skills credibility, clarity, and professional hygiene. It preserves candidate truth and does not claim to reproduce an employer's private ATS score."

export const ATS_STEPS = [
  { name: "Paste the resume", text: "Paste at least 200 characters from the complete resume." },
  { name: "Add the target job", text: "Paste the job description for exact role and keyword-evidence matching." },
  { name: "Run the free check", text: "Generate the eight-factor readiness score and recruiter verdict." },
  { name: "Apply evidence-first fixes", text: "Prioritize rejection risks and use only rewrites supported by candidate facts." },
] as const
