export type CarouselThemeId = "cosmos" | "sage" | "aurora" | "ember" | "ivory"

export type CarouselTheme = {
  id: CarouselThemeId
  label: string
  description: string
  bgGradient: string
  circleColor: string
  circleColorAlt: string
  accentColor: string
  accentColorAlt: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  dividerColor: string
  chipBg: string
  chipBorder: string
  badgeBg: string
  badgeText: string
  counterRing: string
}

export const CAROUSEL_THEMES: Record<CarouselThemeId, CarouselTheme> = {
  cosmos: {
    id: "cosmos",
    label: "Cosmos",
    description: "Dark navy, electric blue, gold",
    bgGradient: "linear-gradient(145deg, #080F1E 0%, #0D1B35 100%)",
    circleColor: "#1D4ED8",
    circleColorAlt: "#3B82F6",
    accentColor: "#F59E0B",
    accentColorAlt: "#FCD34D",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.72)",
    textMuted: "rgba(255,255,255,0.38)",
    dividerColor: "rgba(255,255,255,0.10)",
    chipBg: "rgba(29,78,216,0.22)",
    chipBorder: "rgba(59,130,246,0.5)",
    badgeBg: "#1D4ED8",
    badgeText: "#FFFFFF",
    counterRing: "rgba(59,130,246,0.35)",
  },
  sage: {
    id: "sage",
    label: "Sage",
    description: "Cream, forest green, warm gold",
    bgGradient: "linear-gradient(150deg, #F7F5F0 0%, #EEF0E8 100%)",
    circleColor: "#14532D",
    circleColorAlt: "#16A34A",
    accentColor: "#92400E",
    accentColorAlt: "#D97706",
    textPrimary: "#1A1A1A",
    textSecondary: "#3D3D3D",
    textMuted: "#8A8A8A",
    dividerColor: "rgba(0,0,0,0.10)",
    chipBg: "rgba(20,83,45,0.10)",
    chipBorder: "rgba(22,163,74,0.35)",
    badgeBg: "#14532D",
    badgeText: "#FFFFFF",
    counterRing: "rgba(22,163,74,0.3)",
  },
  aurora: {
    id: "aurora",
    label: "Aurora",
    description: "Deep purple, magenta, lavender",
    bgGradient: "linear-gradient(145deg, #0F0720 0%, #1A0A30 100%)",
    circleColor: "#7C3AED",
    circleColorAlt: "#A855F7",
    accentColor: "#F472B6",
    accentColorAlt: "#FB7185",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.75)",
    textMuted: "rgba(255,255,255,0.38)",
    dividerColor: "rgba(255,255,255,0.10)",
    chipBg: "rgba(124,58,237,0.22)",
    chipBorder: "rgba(168,85,247,0.5)",
    badgeBg: "#7C3AED",
    badgeText: "#FFFFFF",
    counterRing: "rgba(168,85,247,0.35)",
  },
  ember: {
    id: "ember",
    label: "Ember",
    description: "Charcoal, burnt orange, cream",
    bgGradient: "linear-gradient(145deg, #161411 0%, #1F1A14 100%)",
    circleColor: "#C2410C",
    circleColorAlt: "#F97316",
    accentColor: "#FCD34D",
    accentColorAlt: "#FDE68A",
    textPrimary: "#FFFBF0",
    textSecondary: "rgba(255,251,240,0.72)",
    textMuted: "rgba(255,251,240,0.38)",
    dividerColor: "rgba(255,251,240,0.10)",
    chipBg: "rgba(194,65,12,0.22)",
    chipBorder: "rgba(249,115,22,0.5)",
    badgeBg: "#C2410C",
    badgeText: "#FFFBF0",
    counterRing: "rgba(249,115,22,0.35)",
  },
  ivory: {
    id: "ivory",
    label: "Ivory",
    description: "White, teal, editorial",
    bgGradient: "linear-gradient(150deg, #FFFFFF 0%, #F0F7F6 100%)",
    circleColor: "#0D4A45",
    circleColorAlt: "#0F766E",
    accentColor: "#0D4A45",
    accentColorAlt: "#134E4A",
    textPrimary: "#0A0A0A",
    textSecondary: "#374151",
    textMuted: "#9CA3AF",
    dividerColor: "rgba(0,0,0,0.08)",
    chipBg: "rgba(13,74,69,0.08)",
    chipBorder: "rgba(15,118,110,0.3)",
    badgeBg: "#0D4A45",
    badgeText: "#FFFFFF",
    counterRing: "rgba(15,118,110,0.25)",
  },
}

export const DEFAULT_THEME_ID: CarouselThemeId = "cosmos"

export const CANVAS = {
  width: 1080,
  height: 1080,
  padding: 80,
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
} as const

export function resolveTheme(themeId: CarouselThemeId, accentOverride?: string): CarouselTheme {
  const base = CAROUSEL_THEMES[themeId]
  if (!accentOverride) return base
  return { ...base, accentColor: accentOverride, accentColorAlt: accentOverride }
}

export type CarouselSlide = {
  type: "cover" | "content" | "cta"
  title: string
  body?: string
  slideNumber?: number
  totalSlides?: number
  authorName?: string
  authorHandle?: string
  designation?: string
  accentLabel?: string
}

// Legacy compat - existing code importing CAROUSEL_TOKENS still compiles
export const CAROUSEL_TOKENS = {
  canvasWidth: CANVAS.width,
  canvasHeight: CANVAS.height,
  fontFamily: CANVAS.fontFamily,
  padding: CANVAS.padding,
  bgColor: "#080F1E",
  circleColor: "#1D4ED8",
  accentColor: "#F59E0B",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.72)",
  textMuted: "rgba(255,255,255,0.38)",
  dividerColor: "rgba(255,255,255,0.10)",
  chipBg: "rgba(29,78,216,0.22)",
  chipBorder: "rgba(59,130,246,0.5)",
  titleSize: "64px",
  subtitleSize: "42px",
  bodySize: "34px",
  labelSize: "22px",
  captionSize: "18px",
  circleDiameter: 520,
  circleOffsetX: 680,
  circleOffsetY: -100,
  brandName: "",
  brandUrl: "",
} as const
