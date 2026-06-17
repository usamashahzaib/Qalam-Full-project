import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { CAROUSEL_THEMES, DEFAULT_THEME_ID, type CarouselThemeId, type CarouselTheme } from "@/lib/carousel-design"

type DbSlide = { title?: string; bullets?: string[]; designHint?: string }

const wrap = (text: string, max = 52) =>
  text.split(/\s+/).filter(Boolean).reduce<string[]>((lines, word) => {
    const last = lines.at(-1) || ""
    if (!last || `${last} ${word}`.length > max) lines.push(word)
    else lines[lines.length - 1] = `${last} ${word}`
    return lines
  }, [])

function hexToRgb(hex: string): RGB {
  const c = hex.replace("#", "")
  return rgb(parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255)
}

function parseColor(colorStr: string, fallback: RGB): { color: RGB; opacity: number } {
  if (colorStr.startsWith("#")) return { color: hexToRgb(colorStr), opacity: 1 }
  const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (m) return { color: rgb(+m[1] / 255, +m[2] / 255, +m[3] / 255), opacity: m[4] ? +m[4] : 1 }
  return { color: fallback, opacity: 1 }
}

function bgSolidColor(gradient: string): RGB {
  const match = gradient.match(/#([0-9A-Fa-f]{6})/g)
  return match ? hexToRgb(match[0]) : rgb(0.03, 0.06, 0.12)
}

function drawCoverSlide(
  pdf: PDFDocument,
  title: string,
  slideNum: number,
  total: number,
  theme: CarouselTheme,
  bold: Awaited<ReturnType<typeof pdf.embedFont>>,
  regular: Awaited<ReturnType<typeof pdf.embedFont>>,
) {
  const page = pdf.addPage([1080, 1080])
  const isDark = theme.textPrimary === "#FFFFFF" || theme.textPrimary === "#FFFBF0"
  const bg = bgSolidColor(theme.bgGradient)
  const accent = hexToRgb(theme.accentColor)
  const primary = hexToRgb(theme.textPrimary)
  const muted = parseColor(theme.textMuted, primary)
  const circle = hexToRgb(theme.circleColor)
  const circleAlt = hexToRgb(theme.circleColorAlt)

  // Background
  page.drawRectangle({ x: 0, y: 0, width: 1080, height: 1080, color: bg })

  // Decorative circle top-right
  page.drawEllipse({ x: 940, y: 1080 + 160 - 160, xScale: 290, yScale: 290, color: circleAlt, opacity: isDark ? 0.35 : 0.22 })
  page.drawEllipse({ x: 940, y: 1080 + 160 - 160, xScale: 350, yScale: 350, borderColor: hexToRgb(theme.circleColor), borderWidth: 1.5, opacity: 0.12 })

  // Small accent orbs bottom-right
  page.drawEllipse({ x: 960, y: 220, xScale: 90, yScale: 90, color: accent, opacity: 0.12 })

  // Content area (bottom 60% of slide, in pdf-lib Y-up coords)
  const contentY = 380

  // Accent label chip area placeholder text
  page.drawText("CAROUSEL", {
    x: 80, y: contentY + 290,
    size: 22, font: bold,
    color: accent, opacity: 0.85,
  })

  // Title - large headline
  const titleLines = wrap(title, 30)
  titleLines.slice(0, 4).forEach((line, i) => {
    page.drawText(line, {
      x: 80, y: contentY + 220 - i * 74,
      size: 66, font: bold,
      color: primary,
      maxWidth: 900,
    })
  })

  // Accent bar
  const barY = contentY + 220 - titleLines.slice(0, 4).length * 74 - 40
  page.drawRectangle({ x: 80, y: barY, width: 64, height: 5, color: accent })
  page.drawEllipse({ x: 152, y: barY + 2, xScale: 7, yScale: 7, color: accent, opacity: 0.6 })

  // Slide counter bottom-right
  page.drawText(`${slideNum} / ${total}`, {
    x: 900, y: 80,
    size: 20, font: bold,
    color: muted.color, opacity: muted.opacity,
  })

  // Branding bottom-left
  page.drawText("Qalam - byqalam.com", {
    x: 80, y: 80,
    size: 20, font: bold,
    color: muted.color, opacity: muted.opacity * 0.7,
  })
}

function drawContentSlide(
  pdf: PDFDocument,
  title: string,
  content: string,
  slideNum: number,
  total: number,
  theme: CarouselTheme,
  bold: Awaited<ReturnType<typeof pdf.embedFont>>,
  regular: Awaited<ReturnType<typeof pdf.embedFont>>,
) {
  const page = pdf.addPage([1080, 1080])
  const isDark = theme.textPrimary === "#FFFFFF" || theme.textPrimary === "#FFFBF0"
  const bg = bgSolidColor(theme.bgGradient)
  const accent = hexToRgb(theme.accentColor)
  const primary = hexToRgb(theme.textPrimary)
  const secondary = parseColor(theme.textSecondary, primary)
  const muted = parseColor(theme.textMuted, primary)
  const badgeBg = hexToRgb(theme.badgeBg)
  const badgeText = hexToRgb(theme.badgeText)
  const circleAlt = hexToRgb(theme.circleColorAlt)
  const divider = parseColor(theme.dividerColor, primary)

  // Background
  page.drawRectangle({ x: 0, y: 0, width: 1080, height: 1080, color: bg })

  // Decorative circle top-right (subtle)
  page.drawEllipse({ x: 980, y: 940, xScale: 180, yScale: 180, color: circleAlt, opacity: isDark ? 0.18 : 0.13 })
  page.drawEllipse({ x: 980, y: 940, xScale: 250, yScale: 250, borderColor: hexToRgb(theme.circleColor), borderWidth: 1, opacity: 0.08 })

  // Bottom-left orb
  page.drawEllipse({ x: -60, y: -80, xScale: 110, yScale: 110, color: accent, opacity: 0.08 })

  // Vertical accent line left edge
  const lineH = Math.round(1080 * 0.70)
  const lineY = Math.round(1080 * 0.15)
  page.drawRectangle({ x: 0, y: lineY, width: 5, height: lineH, color: accent, opacity: 0.9 })

  // Top: slide counter badge
  page.drawEllipse({ x: 109, y: 1000, xScale: 29, yScale: 29, color: badgeBg })
  const numStr = String(slideNum)
  page.drawText(numStr, {
    x: numStr.length === 1 ? 104 : 99, y: 990,
    size: 22, font: bold,
    color: badgeText,
  })
  page.drawText(`of ${total} slides`, {
    x: 148, y: 991,
    size: 18, font: regular,
    color: muted.color, opacity: muted.opacity,
  })

  // Middle: accent bar + title
  const titleY = 700
  page.drawRectangle({ x: 80, y: titleY + 52, width: 52, height: 5, color: accent })
  page.drawEllipse({ x: 140, y: titleY + 54, xScale: 4, yScale: 4, color: accent, opacity: 0.5 })
  page.drawEllipse({ x: 153, y: titleY + 54, xScale: 3, yScale: 3, color: accent, opacity: 0.3 })

  const titleLines = wrap(title, 36)
  titleLines.slice(0, 3).forEach((line, i) => {
    page.drawText(line, {
      x: 80, y: titleY - i * 56,
      size: 44, font: bold,
      color: primary,
      maxWidth: 920,
    })
  })

  // Body text
  const bodyStartY = titleY - titleLines.slice(0, 3).length * 56 - 48
  const bodyLines = wrap(content, 54)
  bodyLines.slice(0, 6).forEach((line, i) => {
    page.drawText(line, {
      x: 80, y: bodyStartY - i * 46,
      size: 30, font: regular,
      color: secondary.color, opacity: secondary.opacity,
      maxWidth: 920,
    })
  })

  // Bottom: divider line
  page.drawLine({
    start: { x: 80, y: 170 },
    end: { x: 1000, y: 170 },
    thickness: 1,
    color: divider.color,
    opacity: divider.opacity,
  })

  // Progress dots
  const dotY = 140
  const dotSpacing = 22
  for (let i = 0; i < total; i++) {
    if (i === slideNum - 1) {
      page.drawRectangle({ x: 80 + i * dotSpacing, y: dotY - 4, width: 28, height: 8, color: accent })
    } else {
      page.drawEllipse({ x: 80 + i * dotSpacing + 4, y: dotY, xScale: 4, yScale: 4, color: divider.color, opacity: divider.opacity })
    }
  }

  // Branding
  page.drawText("Qalam - byqalam.com", {
    x: 80, y: 80,
    size: 18, font: bold,
    color: muted.color, opacity: muted.opacity * 0.7,
  })
}

function drawCtaSlide(
  pdf: PDFDocument,
  title: string,
  content: string,
  slideNum: number,
  total: number,
  theme: CarouselTheme,
  bold: Awaited<ReturnType<typeof pdf.embedFont>>,
  regular: Awaited<ReturnType<typeof pdf.embedFont>>,
) {
  const page = pdf.addPage([1080, 1080])
  const isDark = theme.textPrimary === "#FFFFFF" || theme.textPrimary === "#FFFBF0"
  const bg = bgSolidColor(theme.bgGradient)
  const accent = hexToRgb(theme.accentColor)
  const primary = hexToRgb(theme.textPrimary)
  const secondary = parseColor(theme.textSecondary, primary)
  const badgeBg = hexToRgb(theme.badgeBg)
  const badgeText = hexToRgb(theme.badgeText)
  const circle = hexToRgb(theme.circleColor)
  const muted = parseColor(theme.textMuted, primary)
  const divider = parseColor(theme.dividerColor, primary)

  // Background
  page.drawRectangle({ x: 0, y: 0, width: 1080, height: 1080, color: bg })

  // Concentric rings centered
  page.drawEllipse({ x: 540, y: 540, xScale: 360, yScale: 360, color: circle, opacity: isDark ? 0.12 : 0.08 })
  page.drawEllipse({ x: 540, y: 540, xScale: 410, yScale: 410, borderColor: hexToRgb(theme.circleColor), borderWidth: 1.5, opacity: 0.1 })
  page.drawEllipse({ x: 540, y: 540, xScale: 470, yScale: 470, borderColor: hexToRgb(theme.circleColor), borderWidth: 1, opacity: 0.06 })

  // Corner orbs
  page.drawEllipse({ x: 40, y: 1040, xScale: 70, yScale: 70, color: accent, opacity: 0.12 })
  page.drawEllipse({ x: 1040, y: 40, xScale: 50, yScale: 50, color: hexToRgb(theme.circleColorAlt), opacity: 0.15 })

  // Center content
  const centerY = 580

  // "KEY TAKEAWAY" chip
  page.drawText("KEY TAKEAWAY", {
    x: 540 - 120, y: centerY + 210,
    size: 21, font: bold,
    color: accent,
    opacity: 0.9,
  })

  // Title
  const titleLines = wrap(title, 32)
  titleLines.slice(0, 3).forEach((line, i) => {
    const textWidth = line.length * 24
    page.drawText(line, {
      x: Math.max(80, 540 - textWidth / 2), y: centerY + 140 - i * 60,
      size: 46, font: bold,
      color: primary,
      maxWidth: 920,
    })
  })

  // Body
  if (content) {
    const bodyLines = wrap(content, 50)
    bodyLines.slice(0, 3).forEach((line, i) => {
      const textWidth = line.length * 16
      page.drawText(line, {
        x: Math.max(80, 540 - textWidth / 2), y: centerY + 140 - titleLines.slice(0, 3).length * 60 - 48 - i * 46,
        size: 30, font: regular,
        color: secondary.color, opacity: secondary.opacity,
        maxWidth: 920,
      })
    })
  }

  // Divider dots
  const divY = centerY - 80
  page.drawRectangle({ x: 80, y: divY, width: 40, height: 1, color: divider.color, opacity: divider.opacity })
  page.drawEllipse({ x: 128, y: divY, xScale: 5, yScale: 5, color: accent })
  page.drawRectangle({ x: 140, y: divY, width: 60, height: 3, color: accent })
  page.drawEllipse({ x: 208, y: divY, xScale: 5, yScale: 5, color: accent })
  page.drawRectangle({ x: 221, y: divY, width: 40, height: 1, color: divider.color, opacity: divider.opacity })

  // CTA button
  const btnY = divY - 80
  page.drawRectangle({ x: 340, y: btnY - 22, width: 400, height: 64, color: badgeBg })
  page.drawText("Follow for more", {
    x: 456, y: btnY,
    size: 28, font: bold,
    color: badgeText,
  })

  // Slide number + branding
  page.drawText(`${slideNum} / ${total}`, {
    x: 900, y: 80,
    size: 20, font: bold,
    color: muted.color, opacity: muted.opacity,
  })
  page.drawText("Qalam - byqalam.com", {
    x: 80, y: 80,
    size: 20, font: bold,
    color: muted.color, opacity: muted.opacity * 0.7,
  })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params

    const body = await req.json().catch(() => ({}))
    const themeId = (body.themeId as CarouselThemeId) || DEFAULT_THEME_ID
    const theme = CAROUSEL_THEMES[themeId] ?? CAROUSEL_THEMES[DEFAULT_THEME_ID as CarouselThemeId]

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("carousels")
      .select("id, topic, role, tone, slides, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "Carousel not found" }, { status: 404 })

    const rawSlides: DbSlide[] = Array.isArray(data.slides) ? data.slides : []
    if (!rawSlides.length) return NextResponse.json({ error: "No slides found" }, { status: 404 })

    const pdf = await PDFDocument.create()
    const regular = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

    rawSlides.forEach((slide, index) => {
      const title = String(slide.title || `Slide ${index + 1}`)
      const content = Array.isArray(slide.bullets) ? slide.bullets.join(" ") : (slide.designHint || "")
      const slideNum = index + 1
      const total = rawSlides.length

      if (index === 0) {
        drawCoverSlide(pdf, title, slideNum, total, theme, bold, regular)
      } else if (index === rawSlides.length - 1 && rawSlides.length > 2) {
        drawCtaSlide(pdf, title, content, slideNum, total, theme, bold, regular)
      } else {
        drawContentSlide(pdf, title, content, slideNum, total, theme, bold, regular)
      }
    })

    const pdfBytes = Buffer.from(await pdf.save())
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carousel-${id.slice(0, 8)}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
      },
    })
  })(request)
}
