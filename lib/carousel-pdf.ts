export type CarouselSlide = {
  number: number
  title: string
  body?: string
  visual_suggestion?: string
}

/**
 * Renders a square (540x540pt) PDF from carousel slides using pdf-lib and
 * triggers a browser download. Cover and CTA slides get filled backgrounds;
 * middle slides stay on white. Loaded via dynamic import so pdf-lib is not
 * shipped to visitors who never export.
 */
export async function downloadCarouselPdf(slides: CarouselSlide[]): Promise<void> {
  if (!slides.length) return
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
  const pdfDoc = await PDFDocument.create()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const wrapText = (text: string, font: typeof boldFont, fontSize: number, maxWidth: number): string[] => {
    const words = text.split(/\s+/)
    const lines: string[] = []
    let current = ""
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
    return lines
  }

  const PAGE = 540, PAD = 48, CW = PAGE - PAD * 2

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const isFirst = i === 0, isLast = i === slides.length - 1
    const page = pdfDoc.addPage([PAGE, PAGE])

    page.drawRectangle({
      x: 0, y: 0, width: PAGE, height: PAGE,
      color: isFirst ? rgb(0.051, 0.58, 0.533) : isLast ? rgb(0.851, 0.467, 0.024) : rgb(1, 1, 1),
    })

    const titleColor = isFirst || isLast ? rgb(1, 1, 1) : rgb(0.094, 0.094, 0.118)
    const bodyColor = isFirst || isLast ? rgb(0.85, 0.98, 0.96) : rgb(0.322, 0.322, 0.357)
    const muteColor = isFirst || isLast ? rgb(0.85, 0.98, 0.96) : rgb(0.4, 0.4, 0.45)

    const badge = isFirst ? "COVER" : isLast ? "CTA" : `SLIDE ${slide.number}`
    page.drawText(badge, { x: PAD, y: PAGE - 64, size: 9, font: boldFont, color: muteColor })

    const titleLines = wrapText(slide.title || "", boldFont, 26, CW)
    let yPos = PAGE - 96
    for (const line of titleLines.slice(0, 4)) {
      page.drawText(line, { x: PAD, y: yPos, size: 26, font: boldFont, color: titleColor })
      yPos -= 36
    }

    if (slide.body?.trim()) {
      yPos -= 14
      const bodyLines = wrapText(slide.body, regularFont, 13, CW)
      for (const line of bodyLines.slice(0, 10)) {
        page.drawText(line, { x: PAD, y: yPos, size: 13, font: regularFont, color: bodyColor })
        yPos -= 21
      }
    }
  }

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${(slides[0]?.title ?? "carousel").replace(/[^\w\s-]/g, "").trim().slice(0, 60)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
