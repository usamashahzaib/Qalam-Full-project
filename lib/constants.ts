// Shared constants used across the application.
// UI-specific display arrays that require icon imports stay in their respective page files.

// Silent Growth ships real code but is hidden from nav/UI for now - the surface
// area was judged premature for launch. Flip to true to bring it back; no other
// change needed, the nav entries and page guard both read this flag.
export const SILENT_GROWTH_LIVE = false

export const WRITER_ROLES = [
  "Consultant",
  "Founder",
  "HR",
  "Marketing",
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
  "Consultant",
  "Content Creator",
  "Founder / Entrepreneur",
  "HR Professional",
  "Marketing Professional",
  "Other",
] as const

export const INDUSTRY_OPTIONS = [
  "Consulting",
  "E-commerce & Retail",
  "Education",
  "Finance & Banking",
  "Healthcare",
  "HR & Recruitment",
  "Legal",
  "Manufacturing",
  "Marketing & Advertising",
  "Media & Entertainment",
  "Non-profit",
  "Real Estate",
  "Technology",
  "Other",
] as const
