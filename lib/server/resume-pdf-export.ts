import "server-only"

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import type { ResumeData } from "@/lib/career-resume"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"

const A4: [number, number] = [595.28, 841.89]
const MARGIN = 46
const CONTENT_WIDTH = A4[0] - MARGIN * 2

const safeText = (value: string) => value
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u2022/g, "*")
  .replace(/[^\x20-\x7E]/g, " ")
  .replace(/\s+/g, " ")
  .trim()

const hex = (value: string) => {
  const color = value.replace("#", "")
  return rgb(
    Number.parseInt(color.slice(0, 2), 16) / 255,
    Number.parseInt(color.slice(2, 4), 16) / 255,
    Number.parseInt(color.slice(4, 6), 16) / 255,
  )
}

const wrap = (text: string, font: PDFFont, size: number, width: number) => {
  const words = safeText(text).split(" ").filter(Boolean)
  return words.reduce<string[]>((lines, word) => {
    const current = lines.at(-1) || ""
    const candidate = current ? `${current} ${word}` : word
    if (!current || font.widthOfTextAtSize(candidate, size) <= width) {
      if (current) lines[lines.length - 1] = candidate
      else lines.push(candidate)
      return lines
    }
    lines.push(word)
    return lines
  }, [])
}

export async function buildResumePdf(data: ResumeData, templateKey: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const template = RESUME_TEMPLATES.find((item) => item.key === templateKey) || RESUME_TEMPLATES[0]
  const accent = hex(template.accent)
  const ink = rgb(0.09, 0.09, 0.11)
  const muted = rgb(0.34, 0.34, 0.38)
  const lineHeight = template.density === "compact" ? 10.5 : 11.5
  let page!: PDFPage
  let y = 0

  const newPage = () => {
    page = pdf.addPage(A4)
    y = A4[1] - MARGIN
  }
  const ensure = (height: number) => {
    if (y - height < MARGIN) newPage()
  }
  const text = (value: string, options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
    const font = options.font || regular
    const size = options.size || 9
    const indent = options.indent || 0
    const lines = wrap(value, font, size, CONTENT_WIDTH - indent)
    if (!lines.length) return
    ensure(lines.length * lineHeight + (options.gap || 0))
    lines.forEach((line) => {
      page.drawText(line, { x: MARGIN + indent, y, size, font, color: options.color || ink })
      y -= lineHeight
    })
    y -= options.gap || 0
  }
  const heading = (title: string) => {
    ensure(30)
    y -= 5
    page.drawText(title.toUpperCase(), { x: MARGIN, y, size: 9, font: bold, color: accent })
    y -= 5
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 0.75, color: accent, opacity: 0.45 })
    y -= 13
  }
  const entries = (items: ResumeData["experience"]) => items.forEach((entry) => {
    ensure(42)
    const dates = [entry.startDate, entry.endDate].filter(Boolean).join(" - ")
    text([entry.title, entry.organization].filter(Boolean).join(" | "), { font: bold, size: 9.5 })
    text([entry.location, dates].filter(Boolean).join(" | "), { size: 8, color: muted, gap: 2 })
    entry.bullets.forEach((bullet) => text(`* ${bullet}`, { size: 8.7, indent: 8, gap: 1 }))
    y -= 5
  })

  newPage()
  text(data.fullName || "Your Name", { font: bold, size: 21, gap: 2 })
  if (data.headline) text(data.headline, { font: bold, size: 10.5, color: accent, gap: 3 })
  text([data.email, data.phone, data.location, data.linkedinUrl].filter(Boolean).join(" | "), { size: 8, color: muted, gap: 4 })
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 1.5, color: accent })
  y -= 10

  if (data.summary) { heading("Professional Summary"); text(data.summary, { size: 8.8 }) }
  if (data.skills.length) { heading("Core Skills"); text(data.skills.join(" | "), { size: 8.5 }) }
  if (data.experience.length) { heading("Professional Experience"); entries(data.experience) }
  if (data.projects.length) { heading("Projects"); entries(data.projects) }
  if (data.education.length) { heading("Education"); entries(data.education) }
  if (data.certifications.length) {
    heading("Certifications")
    data.certifications.forEach((item) => text(`* ${item}`, { size: 8.7, indent: 8, gap: 1 }))
  }

  pdf.setTitle(safeText(`${data.fullName || "Candidate"} Resume`))
  pdf.setCreator("Qalam")
  pdf.setProducer("Qalam ATS Resume Studio")
  return pdf.save()
}

export const resumePdfFilename = (title: string) => {
  const stem = safeText(title).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "ats-resume"
  return `${stem}.pdf`
}
