import type { FormatKey, ScoreData } from "@/lib/hooks/useWriterLogic"

export const ROLE_SUGGESTIONS = [
  "CEO", "Consultant", "Designer", "Founder", "Freelancer", "HR Leader",
  "Marketer", "Product Manager", "Recruiter", "Sales Leader", "Software Developer",
]

export const WRITER_FORMATS: { key: FormatKey; words: string }[] = [
  { key: "Short", words: "150-200w" },
  { key: "Medium", words: "250-350w" },
  { key: "Long", words: "400-500w" },
  { key: "Carousel", words: "5-7 slides" },
]

export const CONTENT_INTENTS = [
  {
    label: "Authority",
    value: "Build authority with one useful, evidence-led idea",
    description: "Build trust with earned expertise",
  },
  {
    label: "Personal",
    value: "Build relatability with a true personal or behind-the-scenes lesson",
    description: "Build recognition and relatability",
  },
  {
    label: "Offer",
    value: "Create qualified interest in my relevant offer without sounding like an ad",
    description: "Turn trust into qualified interest",
  },
] as const

export const SCORE_LABELS: Array<{
  key: keyof Omit<ScoreData, "overall" | "tips" | "hashtags">
  label: string
}> = [
  { key: "hook", label: "Hook" },
  { key: "readability", label: "Readability" },
  { key: "authority", label: "Authority" },
  { key: "specificity", label: "Specificity" },
  { key: "cta", label: "CTA" },
  { key: "human", label: "Human-likeness" },
  { key: "voiceFit", label: "Voice Fit" },
]
