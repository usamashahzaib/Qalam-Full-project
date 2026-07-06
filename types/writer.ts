export type WriterRole = string

export type PostFormat = "Short" | "Medium" | "Long" | "Carousel"

export type HookStyle = "SHARP" | "AUTHORITY" | "STORY" | "CURIOSITY" | "DIRECT"

export interface HookItem {
  style: HookStyle
  text: string
}

export interface SlideItem {
  number: number
  title: string
  body: string
  visual_suggestion: string
}

export interface ScoreData {
  hook: number
  readability: number
  authority: number
  specificity: number
  cta: number
  human: number
  voiceFit: number
  overall: number
  tips: Record<string, string>
  hashtags: string[]
}

export interface DraftVersion {
  content: string
  timestamp: string
}

export interface StatusMsg {
  text: string
  type: "info" | "error" | "success"
}
