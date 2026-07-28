export type ResumeTemplateKey =
  | "clean"
  | "executive"
  | "compact"
  | "modern"
  | "minimal"
  | "technical"
  | "product"
  | "finance"
  | "consulting"
  | "academic"
  | "creative"
  | "graduate"

export type ResumeTemplate = {
  key: ResumeTemplateKey
  name: string
  bestFor: string
  accent: string
  density: "comfortable" | "compact"
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  { key: "clean", name: "Clean ATS", bestFor: "Most professional roles", accent: "#0D4A45", density: "comfortable" },
  { key: "executive", name: "Executive", bestFor: "Directors and C-suite", accent: "#1F2937", density: "comfortable" },
  { key: "compact", name: "Compact", bestFor: "Long career histories", accent: "#374151", density: "compact" },
  { key: "modern", name: "Modern", bestFor: "Marketing and operations", accent: "#0F766E", density: "comfortable" },
  { key: "minimal", name: "Minimal", bestFor: "Consultants and specialists", accent: "#18181B", density: "comfortable" },
  { key: "technical", name: "Technical", bestFor: "Engineering and data", accent: "#075985", density: "compact" },
  { key: "product", name: "Product", bestFor: "Product and design leaders", accent: "#6D28D9", density: "comfortable" },
  { key: "finance", name: "Finance", bestFor: "Finance and accounting", accent: "#14532D", density: "compact" },
  { key: "consulting", name: "Consulting", bestFor: "Advisory and strategy", accent: "#92400E", density: "compact" },
  { key: "academic", name: "Academic", bestFor: "Research and education", accent: "#4338CA", density: "comfortable" },
  { key: "creative", name: "Creative ATS", bestFor: "Brand and communications", accent: "#BE185D", density: "comfortable" },
  { key: "graduate", name: "Graduate", bestFor: "Early-career candidates", accent: "#0369A1", density: "comfortable" },
]

export const isResumeTemplateKey = (value: string): value is ResumeTemplateKey =>
  RESUME_TEMPLATES.some((template) => template.key === value)
