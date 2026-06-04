/**
 * Qalam Carousel Premium Design Tokens
 * Theme: Dark navy + electric blue circle + gold accent
 */

export const CAROUSEL_TOKENS = {
  // Canvas
  canvasWidth: 1080,
  canvasHeight: 1080,

  // Colors
  bgColor: "#0B1120",
  circleColor: "#1D4ED8",
  accentColor: "#F59E0B",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.65)",
  textMuted: "rgba(255,255,255,0.38)",
  dividerColor: "rgba(255,255,255,0.12)",
  chipBg: "rgba(29,78,216,0.25)",
  chipBorder: "rgba(29,78,216,0.6)",

  // Typography
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  titleSize: "64px",
  subtitleSize: "42px",
  bodySize: "34px",
  labelSize: "22px",
  captionSize: "18px",

  // Layout
  padding: 80,
  circleDiameter: 520,
  circleOffsetX: 680,
  circleOffsetY: -100,

  // Brand
  brandName: "Qalam",
  brandUrl: "byqalam.com",
} as const

export type CarouselSlide = {
  type: "cover" | "content" | "cta"
  title: string
  body?: string
  slideNumber?: number
  totalSlides?: number
  authorName?: string
  authorHandle?: string
  accentLabel?: string
}
