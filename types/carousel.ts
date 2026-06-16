export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  textMuted: string
}

export interface CarouselTheme {
  id: string
  name: string
  colors: ColorPalette
  fonts: {
    heading: string
    body: string
  }
  patterns: string[]
  gradient?: string
}

export type SlideLayout = "title" | "quote" | "list" | "stat" | "cta"

export type AnimationHint = "fade-in" | "slide-up" | "scale" | "none"

export interface TextStyling {
  headingBold: boolean
  bodyItalic: boolean
  keyPointsUnderline: boolean
}

export interface SlideDesign {
  slideNumber: number
  layout: SlideLayout
  theme: CarouselTheme
  textStyling: TextStyling
  animation: AnimationHint
}

export interface CarouselDesign {
  themeId: string
  slides: SlideDesign[]
}
