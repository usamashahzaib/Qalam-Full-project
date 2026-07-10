export type CarouselVariant =
  | "standard"
  | "editorial"
  | "thread"
  | "dark-bold"
  | "warm-story"
  | "split"
  | "quote"

export type CarouselThemeId =
  | "cosmos" | "sage" | "aurora" | "ember" | "ivory"
  | "editorial" | "thread" | "nightfire" | "terracotta"
  | "navy-split" | "obsidian" | "ruled" | "blush" | "forest"

export type CarouselTheme = {
  id: CarouselThemeId
  label: string
  description: string
  variant: CarouselVariant
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
  /** Split-layout left-panel background color */
  splitPanelBg?: string
  /** Split-layout left-panel text color */
  splitPanelText?: string
}

export const CAROUSEL_THEMES: Record<CarouselThemeId, CarouselTheme> = {
  // ── Legacy 5 themes (variant: "standard") ──────────────────────────────
  cosmos: {
    id: "cosmos",
    label: "Cosmos",
    description: "Dark navy, electric blue, gold",
    variant: "standard",
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
    variant: "standard",
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
    variant: "standard",
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
    variant: "standard",
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
    variant: "standard",
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

  // ── 9 New Premium Themes ───────────────────────────────────────────────

  // Editorial: white, royal blue, clean ruled typography (inspired by stat/editorial style)
  editorial: {
    id: "editorial",
    label: "Editorial",
    description: "White, royal blue, clean editorial",
    variant: "editorial",
    bgGradient: "#FFFFFF",
    circleColor: "#1B3FBF",
    circleColorAlt: "#2F5BEA",
    accentColor: "#1B3FBF",
    accentColorAlt: "#2F5BEA",
    textPrimary: "#0A0A0A",
    textSecondary: "#3D3D3D",
    textMuted: "#9CA3AF",
    dividerColor: "rgba(0,0,0,0.15)",
    chipBg: "rgba(27,63,191,0.06)",
    chipBorder: "rgba(27,63,191,0.25)",
    badgeBg: "#1B3FBF",
    badgeText: "#FFFFFF",
    counterRing: "rgba(27,63,191,0.18)",
  },

  // Thread: warm cream, dark circles, numbered list format
  thread: {
    id: "thread",
    label: "Thread",
    description: "Cream, dark circles, thread list",
    variant: "thread",
    bgGradient: "#F5F3EE",
    circleColor: "#1A1A1A",
    circleColorAlt: "#3D3D3D",
    accentColor: "#1A1A1A",
    accentColorAlt: "#3D3D3D",
    textPrimary: "#1A1A1A",
    textSecondary: "#5A5A5A",
    textMuted: "#9CA3AF",
    dividerColor: "rgba(0,0,0,0.12)",
    chipBg: "rgba(0,0,0,0.05)",
    chipBorder: "rgba(0,0,0,0.15)",
    badgeBg: "#1A1A1A",
    badgeText: "#FFFFFF",
    counterRing: "rgba(0,0,0,0.12)",
  },

  // Nightfire: near-black, hot take label, pink/red accent line
  nightfire: {
    id: "nightfire",
    label: "Nightfire",
    description: "Dark navy, hot take, coral accent",
    variant: "dark-bold",
    bgGradient: "#12161F",
    circleColor: "#7F1D1D",
    circleColorAlt: "#991B1B",
    accentColor: "#E5534B",
    accentColorAlt: "#F87171",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.70)",
    textMuted: "rgba(255,255,255,0.38)",
    dividerColor: "rgba(255,255,255,0.10)",
    chipBg: "#5A1515",
    chipBorder: "#8B1C1C",
    badgeBg: "#E5534B",
    badgeText: "#FFFFFF",
    counterRing: "rgba(229,83,75,0.35)",
  },

  // Terracotta: warm cream, large colored headline, avatar circle
  terracotta: {
    id: "terracotta",
    label: "Terracotta",
    description: "Warm cream, terracotta headline",
    variant: "warm-story",
    bgGradient: "#FBF5EE",
    circleColor: "#C85A2A",
    circleColorAlt: "#D97706",
    accentColor: "#C85A2A",
    accentColorAlt: "#D97706",
    textPrimary: "#1A0F09",
    textSecondary: "#5C3D2A",
    textMuted: "#A07858",
    dividerColor: "rgba(139,69,19,0.15)",
    chipBg: "rgba(200,90,42,0.08)",
    chipBorder: "rgba(200,90,42,0.25)",
    badgeBg: "#C85A2A",
    badgeText: "#FFFFFF",
    counterRing: "rgba(200,90,42,0.20)",
  },

  // Navy Split: dark navy left panel + white right panel, two-tone layout
  "navy-split": {
    id: "navy-split",
    label: "Navy Split",
    description: "Two-tone, dark navy + white panel",
    variant: "split",
    bgGradient: "#FFFFFF",
    circleColor: "#1B2B5E",
    circleColorAlt: "#2D4A9E",
    accentColor: "#3B82F6",
    accentColorAlt: "#60A5FA",
    textPrimary: "#1A1A1A",
    textSecondary: "#4B5563",
    textMuted: "#9CA3AF",
    dividerColor: "rgba(0,0,0,0.10)",
    chipBg: "rgba(59,130,246,0.08)",
    chipBorder: "rgba(59,130,246,0.25)",
    badgeBg: "#3B82F6",
    badgeText: "#FFFFFF",
    counterRing: "rgba(59,130,246,0.20)",
    splitPanelBg: "#1B2B5E",
    splitPanelText: "#FFFFFF",
  },

  // Obsidian: pure black, lime green accent line, huge stat impact
  obsidian: {
    id: "obsidian",
    label: "Obsidian",
    description: "Pure black, lime green, bold stats",
    variant: "dark-bold",
    bgGradient: "#0A0A0A",
    circleColor: "#166534",
    circleColorAlt: "#15803D",
    accentColor: "#4ADE80",
    accentColorAlt: "#86EFAC",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255,255,255,0.65)",
    textMuted: "rgba(255,255,255,0.35)",
    dividerColor: "rgba(255,255,255,0.08)",
    chipBg: "rgba(74,222,128,0.10)",
    chipBorder: "rgba(74,222,128,0.30)",
    badgeBg: "#166534",
    badgeText: "#4ADE80",
    counterRing: "rgba(74,222,128,0.25)",
  },

  // Ruled: editorial cream with horizontal ruled lines around title
  ruled: {
    id: "ruled",
    label: "Ruled",
    description: "Cream, editorial, horizontal rules",
    variant: "editorial",
    bgGradient: "#F5F2EC",
    circleColor: "#0A0A0A",
    circleColorAlt: "#3D3D3D",
    accentColor: "#0A0A0A",
    accentColorAlt: "#3D3D3D",
    textPrimary: "#0A0A0A",
    textSecondary: "#3D3D3D",
    textMuted: "#9CA3AF",
    dividerColor: "rgba(0,0,0,0.15)",
    chipBg: "rgba(0,0,0,0.04)",
    chipBorder: "rgba(0,0,0,0.15)",
    badgeBg: "#0A0A0A",
    badgeText: "#FFFFFF",
    counterRing: "rgba(0,0,0,0.12)",
  },

  // Blush: warm peach, decorative quote marks, centered italic quote
  blush: {
    id: "blush",
    label: "Blush",
    description: "Warm peach, centered quote style",
    variant: "quote",
    bgGradient: "#F9EDE4",
    circleColor: "#9B4A20",
    circleColorAlt: "#B55E30",
    accentColor: "#9B4A20",
    accentColorAlt: "#B55E30",
    textPrimary: "#2A1A0E",
    textSecondary: "#6B4535",
    textMuted: "#A07858",
    dividerColor: "rgba(139,69,19,0.18)",
    chipBg: "rgba(155,74,32,0.06)",
    chipBorder: "rgba(155,74,32,0.20)",
    badgeBg: "#9B4A20",
    badgeText: "#FFFFFF",
    counterRing: "rgba(155,74,32,0.15)",
  },

  // Forest: deep forest green, cream text, calm authority
  forest: {
    id: "forest",
    label: "Forest",
    description: "Deep forest green, calm authority",
    variant: "dark-bold",
    bgGradient: "#1A3D30",
    circleColor: "#14532D",
    circleColorAlt: "#166534",
    accentColor: "#6EC9A4",
    accentColorAlt: "#86EFAC",
    textPrimary: "#F0EDD8",
    textSecondary: "rgba(240,237,216,0.78)",
    textMuted: "rgba(240,237,216,0.45)",
    dividerColor: "rgba(240,237,216,0.15)",
    chipBg: "rgba(110,201,164,0.12)",
    chipBorder: "rgba(110,201,164,0.30)",
    badgeBg: "rgba(110,201,164,0.20)",
    badgeText: "#6EC9A4",
    counterRing: "rgba(110,201,164,0.22)",
  },
}

export const DEFAULT_THEME_ID: CarouselThemeId = "editorial"

export const PREMIUM_THEME_IDS: CarouselThemeId[] = [
  "editorial", "thread", "nightfire", "terracotta", "navy-split",
  "obsidian", "ruled", "blush", "forest",
]

export const LEGACY_THEME_IDS: CarouselThemeId[] = [
  "cosmos", "sage", "aurora", "ember", "ivory",
]

/** Maps a content tone (chosen at generation time) to the closest-matching visual theme, so the editor opens with colors consistent with what was previewed at generation. */
export const TONE_THEME_MAP: Record<string, CarouselThemeId> = {
  "Authority Playbook": "forest",
  "Executive Brief": "navy-split",
  "Contrarian Breakdown": "nightfire",
  "People Strategy": "aurora",
  "Growth Memo": "obsidian",
  "Hiring Deep Dive": "terracotta",
}

export const CANVAS = {
  width: 1080,
  height: 1080,
  padding: 80,
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
} as const

export function resolveTheme(themeId: CarouselThemeId, accentOverride?: string, bgOverride?: string): CarouselTheme {
  const base = CAROUSEL_THEMES[themeId] ?? CAROUSEL_THEMES[DEFAULT_THEME_ID]
  return {
    ...base,
    ...(accentOverride ? { accentColor: accentOverride, accentColorAlt: accentOverride } : null),
    ...(bgOverride ? { bgGradient: bgOverride } : null),
  }
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
  backgroundPhoto?: string
}

// Legacy compat
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
