import type { SlideItem } from "@/types/writer"

// LinkedIn shows a document post in a portrait frame. 4:5 fills more of the feed than a square,
// and it is the size the PDF is cut to.
export const DECK_WIDTH = 1080
export const DECK_HEIGHT = 1350

export const MIN_SLIDES = 5
export const MAX_SLIDES = 10
export const MAX_COVER_WORDS = 8
export const MAX_SLIDE_WORDS = 30

export type BrandPreset = { id: string; label: string; hex: string }
export const BRAND_PRESETS: BrandPreset[] = [
  { id: "teal", label: "Teal", hex: "#0D9488" },
  { id: "ink", label: "Ink", hex: "#18181B" },
  { id: "blue", label: "Blue", hex: "#1D4ED8" },
  { id: "plum", label: "Plum", hex: "#7E22CE" },
  { id: "amber", label: "Amber", hex: "#B45309" },
  { id: "rose", label: "Rose", hex: "#BE123C" },
]
export type BrandKit = { accent: string; footer: string }
export const DEFAULT_BRAND_KIT: BrandKit = { accent: BRAND_PRESETS[0].hex, footer: "" }

export const brandKitFrom = (value: unknown): BrandKit => {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<BrandKit>
  const accent = BRAND_PRESETS.find((preset) => preset.hex === raw.accent)?.hex ?? DEFAULT_BRAND_KIT.accent
  const footer = typeof raw.footer === "string" ? raw.footer.trim().slice(0, 60) : ""
  return { accent, footer }
}

export const countWords = (text: string) => (text.trim().match(/\S+/g) ?? []).length

export type SlideIssue = { slide: number; code: string; message: string }

const GENERIC_COVER = /^(what is|why you should|the ultimate guide|a guide to|introduction|an introduction|everything you need)/i
const ENGAGEMENT_BAIT = /\b(follow (me )?for more|like and share|tag (a|someone|your)|comment\s+["'“]?\w+["'”]?\s+(below|and i)|drop a .{1,20} in the comments|repost)\b/i

/**
 * Deterministic checks a carousel has to pass before it is worth exporting. Slide numbers are
 * 1-based, and slide 0 means the deck as a whole.
 */
export function checkSlides(slides: Pick<SlideItem, "title" | "body">[]): SlideIssue[] {
  const issues: SlideIssue[] = []
  if (slides.length < MIN_SLIDES) issues.push({ slide: 0, code: "too_few", message: `Only ${slides.length} slides. A carousel needs at least ${MIN_SLIDES} to carry one idea.` })
  if (slides.length > MAX_SLIDES) issues.push({ slide: 0, code: "too_many", message: `${slides.length} slides is long. Past ${MAX_SLIDES}, readers swipe away.` })

  const seen = new Map<string, number>()
  slides.forEach((slide, index) => {
    const n = index + 1
    const title = slide.title?.trim() ?? ""
    const body = slide.body?.trim() ?? ""
    const words = countWords(title) + countWords(body)

    if (!title && !body) {
      issues.push({ slide: n, code: "empty", message: `Slide ${n} is empty.` })
      return
    }
    if (index === 0) {
      if (countWords(title) > MAX_COVER_WORDS) issues.push({ slide: n, code: "cover_long", message: `The cover title is ${countWords(title)} words. Keep it to ${MAX_COVER_WORDS} or fewer so it reads at a glance.` })
      if (GENERIC_COVER.test(title)) issues.push({ slide: n, code: "cover_generic", message: "The cover opens like a textbook chapter. Lead with the surprising part instead." })
    } else if (words > MAX_SLIDE_WORDS) {
      issues.push({ slide: n, code: "too_long", message: `Slide ${n} has ${words} words. Over ${MAX_SLIDE_WORDS} is a paragraph, not a slide.` })
    }
    if (ENGAGEMENT_BAIT.test(`${title} ${body}`)) issues.push({ slide: n, code: "bait", message: `Slide ${n} asks for engagement instead of earning it.` })

    const key = title.toLowerCase()
    if (key) {
      const first = seen.get(key)
      if (first) issues.push({ slide: n, code: "duplicate", message: `Slide ${n} repeats the title of slide ${first}.` })
      else seen.set(key, n)
    }
  })
  return issues
}

// Standard PDF fonts only cover Latin text. Anything else would either throw or print blanks,
// so the export says so instead of handing back a deck with holes in it.
export class UnsupportedScriptError extends Error {
  constructor() {
    super("PDF export supports Latin-script text. Copy the slide text into your design tool instead.")
  }
}

const hexToRgb = (hex: string) => {
  const value = hex.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number]
}

/** Builds a 4:5 PDF, one page per slide: accent cover, white content slides, ink closing slide. */
export async function buildDeckPdf(slides: Pick<SlideItem, "title" | "body">[], brand: BrandKit): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
  const pdf = await PDFDocument.create()
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const supported = new Set(bold.getCharacterSet())

  const clean = (text: string) => {
    const mapped = text
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/…/g, "...")
      .replace(/ /g, " ")
    const kept = [...mapped].filter((char) => char === "\n" || supported.has(char.codePointAt(0) ?? 0))
    const letters = [...mapped].filter((char) => /\p{L}/u.test(char)).length
    const keptLetters = kept.filter((char) => /\p{L}/u.test(char)).length
    if (letters > 0 && keptLetters / letters < 0.8) throw new UnsupportedScriptError()
    return kept.join("")
  }

  const wrap = (text: string, font: typeof bold, size: number, width: number) => {
    const lines: string[] = []
    for (const paragraph of text.split("\n")) {
      let line = ""
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word
        if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word } else line = next
      }
      if (line) lines.push(line)
    }
    return lines
  }

  const accent = rgb(...hexToRgb(brand.accent))
  const ink = rgb(0.094, 0.094, 0.106)
  const body = rgb(0.29, 0.29, 0.32)
  const white = rgb(1, 1, 1)
  const PAD = 96
  const CW = DECK_WIDTH - PAD * 2
  const total = slides.length

  slides.forEach((slide, index) => {
    const first = index === 0
    const last = index === total - 1 && total > 1
    const page = pdf.addPage([DECK_WIDTH, DECK_HEIGHT])
    const background = first ? accent : last ? ink : white
    const headline = first || last ? white : ink
    const support = first || last ? rgb(0.92, 0.95, 0.95) : body
    const quiet = first || last ? rgb(0.82, 0.88, 0.88) : rgb(0.55, 0.55, 0.58)
    page.drawRectangle({ x: 0, y: 0, width: DECK_WIDTH, height: DECK_HEIGHT, color: background })

    const title = clean(slide.title ?? "")
    const text = clean(slide.body ?? "")
    const titleSize = first ? 92 : title.length > 60 ? 56 : 68
    const titleLead = Math.round(titleSize * 1.14)

    if (!first && !last) page.drawRectangle({ x: PAD, y: DECK_HEIGHT - PAD - 8, width: 72, height: 8, color: accent })
    if (!first) {
      const marker = String(index).padStart(2, "0")
      page.drawText(marker, { x: PAD, y: DECK_HEIGHT - PAD - 90, size: 30, font: bold, color: last ? white : accent })
    }

    // Cover text sits low and large. Inner slides start under the number.
    const titleLines = wrap(title, bold, titleSize, CW).slice(0, 6)
    let y = first ? DECK_HEIGHT / 2 + (titleLines.length * titleLead) / 2 : DECK_HEIGHT - PAD - 190
    for (const line of titleLines) {
      page.drawText(line, { x: PAD, y, size: titleSize, font: bold, color: headline })
      y -= titleLead
    }
    if (text) {
      y -= 28
      for (const line of wrap(text, regular, 40, CW).slice(0, 9)) {
        page.drawText(line, { x: PAD, y, size: 40, font: regular, color: support })
        y -= 56
      }
    }

    const footer = clean(brand.footer)
    if (footer) page.drawText(footer, { x: PAD, y: PAD - 30, size: 26, font: bold, color: quiet })
    const count = `${index + 1} / ${total}`
    page.drawText(count, { x: DECK_WIDTH - PAD - regular.widthOfTextAtSize(count, 26), y: PAD - 30, size: 26, font: regular, color: quiet })
    if (first && total > 1) page.drawText("Swipe", { x: PAD, y: PAD + 20, size: 30, font: bold, color: white })
  })

  return pdf.save()
}
