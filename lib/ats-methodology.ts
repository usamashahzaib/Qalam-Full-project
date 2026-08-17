export const ATS_METHODOLOGY_VERSION = "1.0"
export const ATS_METHODOLOGY_UPDATED = "2026-08-17"
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
