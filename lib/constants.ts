// Shared constants used across the application.
// UI-specific display arrays that require icon imports stay in their respective page files.

export const WRITER_ROLES = [
  "HR",
  "Marketing",
  "Founder",
  "Consultant",
  "Sales",
  "Tech",
  "Other",
] as const

export const POST_FORMATS = [
  { key: "Short",    words: "150-200w" },
  { key: "Medium",   words: "250-350w" },
  { key: "Long",     words: "400-500w" },
  { key: "Carousel", words: "5-7 slides" },
] as const

export const HOOK_STYLES = ["SHARP", "AUTHORITY", "STORY", "CURIOSITY", "DIRECT"] as const

export const ACCOUNT_ROLES = [
  "HR Professional",
  "Marketing Professional",
  "Founder / Entrepreneur",
  "Consultant",
  "Content Creator",
  "Other",
] as const

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Marketing & Advertising",
  "Finance & Banking",
  "Healthcare",
  "Education",
  "Consulting",
  "E-commerce & Retail",
  "Real Estate",
  "Media & Entertainment",
  "HR & Recruitment",
  "Legal",
  "Manufacturing",
  "Non-profit",
  "Other",
] as const
